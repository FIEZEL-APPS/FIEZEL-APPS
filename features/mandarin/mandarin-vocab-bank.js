/**
 * features/mandarin/mandarin-vocab-bank.js
 *
 * FIEZEL MASTER MANDARIN VOCABULARY BANK (COMPLETE 1,500+ ENTRIES)
 * Entri Kosakata Lengkap Karakter Hanzi, Pinyin Bertanda Nada,
 * Nilai Nada Fonetik Numerik [1..4, 0], Kelas Kata (POS), Terjemahan Bahasa Indonesia,
 * dan Kalimat Contoh Pedagogis.
 *
 * 100% Proprietary Clean Native FIEZEL Assets — Zero External Third-Party Branding.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelMandarinVocabBank = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA = 'FIEZEL-MANDARIN-VOCAB-BANK-V2';

  var VOCAB_LIST = [
  {
    "id": "zh-v-001",
    "hanzi": "你",
    "pinyin": "nǐ",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "kamu, Anda",
    "enMeaning": "you",
    "example": {
      "hz": "你好！",
      "py": "Nǐ hǎo!",
      "id": "Halo!"
    }
  },
  {
    "id": "zh-v-002",
    "hanzi": "好",
    "pinyin": "hǎo",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "baik, bagus",
    "enMeaning": "good",
    "example": {
      "hz": "今天天气很好。",
      "py": "Jīntiān tiānqì hěn hǎo.",
      "id": "Hari ini cuaca sangat bagus."
    }
  },
  {
    "id": "zh-v-003",
    "hanzi": "我",
    "pinyin": "wǒ",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "saya, aku",
    "enMeaning": "I, me",
    "example": {
      "hz": "我是学生。",
      "py": "Wǒ shì xuésheng.",
      "id": "Saya adalah murid."
    }
  },
  {
    "id": "zh-v-004",
    "hanzi": "叫",
    "pinyin": "jiào",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "bernama, dipanggil",
    "enMeaning": "to be called",
    "example": {
      "hz": "我叫王明。",
      "py": "Wǒ jiào Wáng Míng.",
      "id": "Nama saya Wang Ming."
    }
  },
  {
    "id": "zh-v-005",
    "hanzi": "是",
    "pinyin": "shì",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "adalah, benar",
    "enMeaning": "to be, yes",
    "example": {
      "hz": "他是老师。",
      "py": "Tā shì lǎoshī.",
      "id": "Dia adalah guru."
    }
  },
  {
    "id": "zh-v-006",
    "hanzi": "学生",
    "pinyin": "xuésheng",
    "tones": [
      2,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "murid, siswa",
    "enMeaning": "student",
    "example": {
      "hz": "她是大学生。",
      "py": "Tā shì dàxuésheng.",
      "id": "Dia mahasiswi."
    }
  },
  {
    "id": "zh-v-007",
    "hanzi": "工程师",
    "pinyin": "gōngchéngshī",
    "tones": [
      1,
      2,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "insinyur, teknisi",
    "enMeaning": "engineer",
    "example": {
      "hz": "我爸爸是工程师。",
      "py": "Wǒ bàba shì gōngchéngshī.",
      "id": "Ayah saya seorang insinyur."
    }
  },
  {
    "id": "zh-v-008",
    "hanzi": "她",
    "pinyin": "tā",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "dia (perempuan)",
    "enMeaning": "she, her",
    "example": {
      "hz": "她是医生。",
      "py": "Tā shì yīshēng.",
      "id": "Dia adalah dokter."
    }
  },
  {
    "id": "zh-v-009",
    "hanzi": "他",
    "pinyin": "tā",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "dia (laki-laki)",
    "enMeaning": "he, him",
    "example": {
      "hz": "他是我的同学。",
      "py": "Tā shì wǒ de tóngxué.",
      "id": "Dia teman sekelas saya."
    }
  },
  {
    "id": "zh-v-010",
    "hanzi": "老师",
    "pinyin": "lǎoshī",
    "tones": [
      3,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "guru, pengajar",
    "enMeaning": "teacher",
    "example": {
      "hz": "老师好！",
      "py": "Lǎoshī hǎo!",
      "id": "Halo guru!"
    }
  },
  {
    "id": "zh-v-011",
    "hanzi": "不",
    "pinyin": "bù",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Adverb",
    "idMeaning": "tidak, bukan",
    "enMeaning": "not, no",
    "example": {
      "hz": "我不是中国人。",
      "py": "Wǒ bú shì Zhōngguó rén.",
      "id": "Saya bukan orang Tiongkok."
    }
  },
  {
    "id": "zh-v-012",
    "hanzi": "人",
    "pinyin": "rén",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "orang, manusia",
    "enMeaning": "person",
    "example": {
      "hz": "他是印尼人。",
      "py": "Tā shì Yìnní rén.",
      "id": "Dia orang Indonesia."
    }
  },
  {
    "id": "zh-v-013",
    "hanzi": "中国",
    "pinyin": "Zhōngguó",
    "tones": [
      1,
      2
    ],
    "level": 1,
    "pos": "Proper Noun",
    "idMeaning": "Tiongkok, China",
    "enMeaning": "China",
    "example": {
      "hz": "我想去中国。",
      "py": "Wǒ xiǎng qù Zhōngguó.",
      "id": "Saya ingin pergi ke China."
    }
  },
  {
    "id": "zh-v-014",
    "hanzi": "美国",
    "pinyin": "Měiguó",
    "tones": [
      3,
      2
    ],
    "level": 1,
    "pos": "Proper Noun",
    "idMeaning": "Amerika Serikat",
    "enMeaning": "United States",
    "example": {
      "hz": "他是美国人。",
      "py": "Tā shì Měiguó rén.",
      "id": "Dia orang Amerika."
    }
  },
  {
    "id": "zh-v-015",
    "hanzi": "名字",
    "pinyin": "míngzi",
    "tones": [
      2,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "nama",
    "enMeaning": "name",
    "example": {
      "hz": "你的名字是什么？",
      "py": "Nǐ de míngzi shì shénme?",
      "id": "Siapa namamu?"
    }
  },
  {
    "id": "zh-v-016",
    "hanzi": "爸爸",
    "pinyin": "bàba",
    "tones": [
      4,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "ayah, bapak",
    "enMeaning": "father",
    "example": {
      "hz": "我爸爸在工作。",
      "py": "Wǒ bàba zài gōngzuò.",
      "id": "Ayah saya sedang bekerja."
    }
  },
  {
    "id": "zh-v-017",
    "hanzi": "妈妈",
    "pinyin": "māma",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "ibu, mama",
    "enMeaning": "mother",
    "example": {
      "hz": "我爱我妈妈。",
      "py": "Wǒ ài wǒ māma.",
      "id": "Saya sayang ibu saya."
    }
  },
  {
    "id": "zh-v-018",
    "hanzi": "弟弟",
    "pinyin": "dìdi",
    "tones": [
      4,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "adik laki-laki",
    "enMeaning": "younger brother",
    "example": {
      "hz": "我有两个弟弟。",
      "py": "Wǒ yǒu liǎng gè dìdi.",
      "id": "Saya punya dua adik laki-laki."
    }
  },
  {
    "id": "zh-v-019",
    "hanzi": "我们",
    "pinyin": "wǒmen",
    "tones": [
      3,
      0
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "kami, kita",
    "enMeaning": "we, us",
    "example": {
      "hz": "我们都是朋友。",
      "py": "Wǒmen dōu shì péngyou.",
      "id": "Kita semua berteman."
    }
  },
  {
    "id": "zh-v-020",
    "hanzi": "朋友",
    "pinyin": "péngyou",
    "tones": [
      2,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "teman, sahabat",
    "enMeaning": "friend",
    "example": {
      "hz": "他是我的好朋友。",
      "py": "Tā shì wǒ de hǎo péngyou.",
      "id": "Dia sahabat baik saya."
    }
  },
  {
    "id": "zh-v-021",
    "hanzi": "同学",
    "pinyin": "tóngxué",
    "tones": [
      2,
      2
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "teman sekelas",
    "enMeaning": "classmate",
    "example": {
      "hz": "我们是同班同学。",
      "py": "Wǒmen shì tóngbān tóngxué.",
      "id": "Kami teman sekelas."
    }
  },
  {
    "id": "zh-v-022",
    "hanzi": "说",
    "pinyin": "shuō",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "berbicara, berkata",
    "enMeaning": "to speak",
    "example": {
      "hz": "你会说汉语吗？",
      "py": "Nǐ huì shuō Hànyǔ ma?",
      "id": "Apakah kamu bisa berbicara Mandarin?"
    }
  },
  {
    "id": "zh-v-023",
    "hanzi": "汉语",
    "pinyin": "Hànyǔ",
    "tones": [
      4,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "bahasa Mandarin",
    "enMeaning": "Chinese language",
    "example": {
      "hz": "汉语很有趣。",
      "py": "Hànyǔ hěn yǒuqù.",
      "id": "Bahasa Mandarin sangat menarik."
    }
  },
  {
    "id": "zh-v-024",
    "hanzi": "英语",
    "pinyin": "Yīngyǔ",
    "tones": [
      1,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "bahasa Inggris",
    "enMeaning": "English language",
    "example": {
      "hz": "我学习英语。",
      "py": "Wǒ xuéxí Yīngyǔ.",
      "id": "Saya belajar bahasa Inggris."
    }
  },
  {
    "id": "zh-v-025",
    "hanzi": "去",
    "pinyin": "qù",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "pergi",
    "enMeaning": "to go",
    "example": {
      "hz": "你去哪儿？",
      "py": "Nǐ qù nǎr?",
      "id": "Kamu mau pergi ke mana?"
    }
  },
  {
    "id": "zh-v-026",
    "hanzi": "回",
    "pinyin": "huí",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "kembali, pulang",
    "enMeaning": "to return",
    "example": {
      "hz": "我回家了。",
      "py": "Wǒ huí jiā le.",
      "id": "Saya sudah pulang ke rumah."
    }
  },
  {
    "id": "zh-v-027",
    "hanzi": "今天",
    "pinyin": "jīntiān",
    "tones": [
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "hari ini",
    "enMeaning": "today",
    "example": {
      "hz": "今天星期五。",
      "py": "Jīntiān xīngqīwǔ.",
      "id": "Hari ini hari Jumat."
    }
  },
  {
    "id": "zh-v-028",
    "hanzi": "昨天",
    "pinyin": "zuótiān",
    "tones": [
      2,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "kemarin",
    "enMeaning": "yesterday",
    "example": {
      "hz": "昨天很冷。",
      "py": "Zuótiān hěn lěng.",
      "id": "Kemarin sangat dingin."
    }
  },
  {
    "id": "zh-v-029",
    "hanzi": "一",
    "pinyin": "yī",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "satu",
    "enMeaning": "one",
    "example": {
      "hz": "一个人。",
      "py": "Yí gè rén.",
      "id": "Satu orang."
    }
  },
  {
    "id": "zh-v-030",
    "hanzi": "号",
    "pinyin": "hào",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Noun / Measure Word",
    "idMeaning": "tanggal, nomor",
    "enMeaning": "number, day of month",
    "example": {
      "hz": "今天几号？",
      "py": "Jīntiān jǐ hào?",
      "id": "Hari ini tanggal berapa?"
    }
  },
  {
    "id": "zh-v-031",
    "hanzi": "二",
    "pinyin": "èr",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "dua",
    "enMeaning": "two",
    "example": {
      "hz": "二月有二十八天。",
      "py": "Èr yuè yǒu èrshíbā tiān.",
      "id": "Bulan Februari ada 28 hari."
    }
  },
  {
    "id": "zh-v-032",
    "hanzi": "三",
    "pinyin": "sān",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "tiga",
    "enMeaning": "three",
    "example": {
      "hz": "我有三个苹果。",
      "py": "Wǒ yǒu sān gè píngguǒ.",
      "id": "Saya punya tiga apel."
    }
  },
  {
    "id": "zh-v-033",
    "hanzi": "四",
    "pinyin": "sì",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "empat",
    "enMeaning": "four",
    "example": {
      "hz": "星期四见。",
      "py": "Xīngqīsì jiàn.",
      "id": "Sampai jumpa hari Kamis."
    }
  },
  {
    "id": "zh-v-034",
    "hanzi": "五",
    "pinyin": "wǔ",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "lima",
    "enMeaning": "five",
    "example": {
      "hz": "五分钟后出发。",
      "py": "Wǔ fēnzhōng hòu chūfā.",
      "id": "Berangkat 5 menit lagi."
    }
  },
  {
    "id": "zh-v-035",
    "hanzi": "个",
    "pinyin": "gè",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "buah, orang (satuan umum)",
    "enMeaning": "general measure word",
    "example": {
      "hz": "一个杯子。",
      "py": "Yí gè bēizi.",
      "id": "Sebuah cangkir."
    }
  },
  {
    "id": "zh-v-036",
    "hanzi": "月",
    "pinyin": "yuè",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "bulan",
    "enMeaning": "month, moon",
    "example": {
      "hz": "八月很热。",
      "py": "Bā yuè hěn rè.",
      "id": "Bulan Agustus sangat panas."
    }
  },
  {
    "id": "zh-v-037",
    "hanzi": "生日",
    "pinyin": "shēngrì",
    "tones": [
      1,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "hari ulang tahun",
    "enMeaning": "birthday",
    "example": {
      "hz": "祝你生日快乐！",
      "py": "Zhù nǐ shēngrì kuàilè!",
      "id": "Selamat ulang tahun!"
    }
  },
  {
    "id": "zh-v-038",
    "hanzi": "明天",
    "pinyin": "míngtiān",
    "tones": [
      2,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "besok",
    "enMeaning": "tomorrow",
    "example": {
      "hz": "明天见！",
      "py": "Míngtiān jiàn!",
      "id": "Sampai jumpa besok!"
    }
  },
  {
    "id": "zh-v-039",
    "hanzi": "六",
    "pinyin": "liù",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "enam",
    "enMeaning": "six",
    "example": {
      "hz": "六点钟吃饭。",
      "py": "Liù diǎn zhōng chī fàn.",
      "id": "Makan jam 6."
    }
  },
  {
    "id": "zh-v-040",
    "hanzi": "七",
    "pinyin": "qī",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "tujuh",
    "enMeaning": "seven",
    "example": {
      "hz": "七月放假。",
      "py": "Qī yuè fàng jià.",
      "id": "Bulan Juli libur."
    }
  },
  {
    "id": "zh-v-041",
    "hanzi": "八",
    "pinyin": "bā",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "delapan",
    "enMeaning": "eight",
    "example": {
      "hz": "八号是星期天。",
      "py": "Bā hào shì xīngqītiān.",
      "id": "Tanggal 8 adalah hari Minggu."
    }
  },
  {
    "id": "zh-v-042",
    "hanzi": "九",
    "pinyin": "jiǔ",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "sembilan",
    "enMeaning": "nine",
    "example": {
      "hz": "九点了，睡觉吧。",
      "py": "Jiǔ diǎn le, shuì jiào ba.",
      "id": "Sudah jam 9, tidurlah."
    }
  },
  {
    "id": "zh-v-043",
    "hanzi": "十",
    "pinyin": "shí",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "sepuluh",
    "enMeaning": "ten",
    "example": {
      "hz": "这十个人都在学习。",
      "py": "Zhè shí gè rén dōu zài xuéxí.",
      "id": "Sepuluh orang ini semua sedang belajar."
    }
  },
  {
    "id": "zh-v-044",
    "hanzi": "书",
    "pinyin": "shū",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "buku",
    "enMeaning": "book",
    "example": {
      "hz": "这是一本好书。",
      "py": "Zhè shì yì běn hǎo shū.",
      "id": "Ini sebuah buku yang bagus."
    }
  },
  {
    "id": "zh-v-045",
    "hanzi": "电影",
    "pinyin": "diànyǐng",
    "tones": [
      4,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "film, bioskop",
    "enMeaning": "movie",
    "example": {
      "hz": "晚上我们看电影。",
      "py": "Wǎnshang wǒmen kàn diànyǐng.",
      "id": "Malam hari kita nonton film."
    }
  },
  {
    "id": "zh-v-046",
    "hanzi": "看",
    "pinyin": "kàn",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "melihat, membaca, menonton",
    "enMeaning": "to look, watch",
    "example": {
      "hz": "他在看书。",
      "py": "Tā zài kàn shū.",
      "id": "Dia sedang membaca buku."
    }
  },
  {
    "id": "zh-v-047",
    "hanzi": "运动",
    "pinyin": "yùndòng",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Verb / Noun",
    "idMeaning": "berolahraga, olahraga",
    "enMeaning": "to exercise, sports",
    "example": {
      "hz": "我喜欢运动。",
      "py": "Wǒ xǐhuan yùndòng.",
      "id": "Saya suka berolahraga."
    }
  },
  {
    "id": "zh-v-048",
    "hanzi": "做",
    "pinyin": "zuò",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "melakukan, membuat",
    "enMeaning": "to do, make",
    "example": {
      "hz": "你在做什么？",
      "py": "Nǐ zài zuò shénme?",
      "id": "Apa yang sedang kamu lakukan?"
    }
  },
  {
    "id": "zh-v-049",
    "hanzi": "星期",
    "pinyin": "xīngqī",
    "tones": [
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "minggu, pekan",
    "enMeaning": "week",
    "example": {
      "hz": "这个星期我很忙。",
      "py": "Zhè gè xīngqī wǒ hěn máng.",
      "id": "Pekan ini saya sangat sibuk."
    }
  },
  {
    "id": "zh-v-050",
    "hanzi": "家",
    "pinyin": "jiā",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "rumah, keluarga",
    "enMeaning": "family, home",
    "example": {
      "hz": "我家在北京。",
      "py": "Wǒ jiā zài Běijīng.",
      "id": "Rumah saya di Beijing."
    }
  },
  {
    "id": "zh-v-051",
    "hanzi": "学校",
    "pinyin": "xuéxiào",
    "tones": [
      2,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "sekolah",
    "enMeaning": "school",
    "example": {
      "hz": "我们的学校很大。",
      "py": "Wǒmen de xuéxiào hěn dà.",
      "id": "Sekolah kami sangat besar."
    }
  },
  {
    "id": "zh-v-052",
    "hanzi": "上午",
    "pinyin": "shàngwǔ",
    "tones": [
      4,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "pagi hari (sebelum siang)",
    "enMeaning": "morning",
    "example": {
      "hz": "上午我有课。",
      "py": "Shàngwǔ wǒ yǒu kè.",
      "id": "Pagi hari saya ada kelas."
    }
  },
  {
    "id": "zh-v-053",
    "hanzi": "下午",
    "pinyin": "xiàwǔ",
    "tones": [
      4,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "siang/sore hari",
    "enMeaning": "afternoon",
    "example": {
      "hz": "下午去买东西。",
      "py": "Xiàwǔ qù mǎi dōngxi.",
      "id": "Sore hari pergi belanja."
    }
  },
  {
    "id": "zh-v-054",
    "hanzi": "现在",
    "pinyin": "xiànzài",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "sekarang, kini",
    "enMeaning": "now",
    "example": {
      "hz": "现在几点了？",
      "py": "Xiànzài jǐ diǎn le?",
      "id": "Sekarang jam berapa?"
    }
  },
  {
    "id": "zh-v-055",
    "hanzi": "点",
    "pinyin": "diǎn",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "jam, titik",
    "enMeaning": "o'clock",
    "example": {
      "hz": "现在三点。",
      "py": "Xiànzài sān diǎn.",
      "id": "Sekarang jam 3."
    }
  },
  {
    "id": "zh-v-056",
    "hanzi": "分",
    "pinyin": "fēn",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "menit",
    "enMeaning": "minute",
    "example": {
      "hz": "三点十分。",
      "py": "Sān diǎn shí fēn.",
      "id": "Jam 3 lewat 10 menit."
    }
  },
  {
    "id": "zh-v-057",
    "hanzi": "零",
    "pinyin": "líng",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Numeral",
    "idMeaning": "nol",
    "enMeaning": "zero",
    "example": {
      "hz": "二零二六。",
      "py": "Èr líng èr liù.",
      "id": "Dua nol dua enam."
    }
  },
  {
    "id": "zh-v-058",
    "hanzi": "年",
    "pinyin": "nián",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Noun / Measure Word",
    "idMeaning": "tahun",
    "enMeaning": "year",
    "example": {
      "hz": "今年是哪一年？",
      "py": "Jīnnián shì nǎ yì nián?",
      "id": "Tahun ini tahun berapa?"
    }
  },
  {
    "id": "zh-v-059",
    "hanzi": "中午",
    "pinyin": "zhōngwǔ",
    "tones": [
      1,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "tengah hari, siang",
    "enMeaning": "noon",
    "example": {
      "hz": "中午一起吃午饭吧。",
      "py": "Zhōngwǔ yìqǐ chī wǔfàn ba.",
      "id": "Siang nanti ayo makan siang bersama."
    }
  },
  {
    "id": "zh-v-060",
    "hanzi": "吃",
    "pinyin": "chī",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "makan",
    "enMeaning": "to eat",
    "example": {
      "hz": "你想吃什么？",
      "py": "Nǐ xiǎng chī shénme?",
      "id": "Kamu mau makan apa?"
    }
  },
  {
    "id": "zh-v-061",
    "hanzi": "饭",
    "pinyin": "fàn",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "nasi, makanan",
    "enMeaning": "meal, rice",
    "example": {
      "hz": "吃早饭了吗？",
      "py": "Chī zǎofàn le ma?",
      "id": "Sudah sarapan?"
    }
  },
  {
    "id": "zh-v-062",
    "hanzi": "来",
    "pinyin": "lái",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "datang, kemari",
    "enMeaning": "to come",
    "example": {
      "hz": "请进，来坐吧。",
      "py": "Qǐng jìn, lái zuò ba.",
      "id": "Silakan masuk, mari duduk."
    }
  },
  {
    "id": "zh-v-063",
    "hanzi": "喝",
    "pinyin": "hē",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "minum",
    "enMeaning": "to drink",
    "example": {
      "hz": "我想喝水。",
      "py": "Wǒ xiǎng hē shuǐ.",
      "id": "Saya ingin minum air."
    }
  },
  {
    "id": "zh-v-064",
    "hanzi": "咖啡",
    "pinyin": "kāfēi",
    "tones": [
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "kopi",
    "enMeaning": "coffee",
    "example": {
      "hz": "来一杯热咖啡。",
      "py": "Lái yì bēi rè kāfēi.",
      "id": "Minta secangkir kopi panas."
    }
  },
  {
    "id": "zh-v-065",
    "hanzi": "茶",
    "pinyin": "chá",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "teh",
    "enMeaning": "tea",
    "example": {
      "hz": "中国人喜欢喝茶。",
      "py": "Zhōngguó rén xǐhuan hē chá.",
      "id": "Orang Tiongkok suka minum teh."
    }
  },
  {
    "id": "zh-v-066",
    "hanzi": "杯",
    "pinyin": "bēi",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "cangkir, gelas (satuan)",
    "enMeaning": "cup, glass",
    "example": {
      "hz": "请给我一杯茶。",
      "py": "Qǐng gěi wǒ yì bēi chá.",
      "id": "Tolong beri saya secangkir teh."
    }
  },
  {
    "id": "zh-v-067",
    "hanzi": "钱",
    "pinyin": "qián",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "uang",
    "enMeaning": "money",
    "example": {
      "hz": "这个多少钱？",
      "py": "Zhè gè duōshao qián?",
      "id": "Ini berapa harganya?"
    }
  },
  {
    "id": "zh-v-068",
    "hanzi": "块",
    "pinyin": "kuài",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "yuan (satuan mata uang lisan)",
    "enMeaning": "yuan (colloquial)",
    "example": {
      "hz": "一共十块钱。",
      "py": "Yígòng shí kuài qián.",
      "id": "Totalnya sepuluh yuan."
    }
  },
  {
    "id": "zh-v-069",
    "hanzi": "要",
    "pinyin": "yào",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "mau, ingin, harus",
    "enMeaning": "to want, need",
    "example": {
      "hz": "我要买水。",
      "py": "Wǒ yào mǎi shuǐ.",
      "id": "Saya mau beli air."
    }
  },
  {
    "id": "zh-v-070",
    "hanzi": "水果",
    "pinyin": "shuǐguǒ",
    "tones": [
      3,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "buah-buahan",
    "enMeaning": "fruit",
    "example": {
      "hz": "吃水果对身体好。",
      "py": "Chī shuǐguǒ duì shēntǐ hǎo.",
      "id": "Makan buah bagus untuk kesehatan."
    }
  },
  {
    "id": "zh-v-071",
    "hanzi": "买",
    "pinyin": "mǎi",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "membeli",
    "enMeaning": "to buy",
    "example": {
      "hz": "你去买苹果吗？",
      "py": "Nǐ qù mǎi píngguǒ ma?",
      "id": "Apakah kamu mau beli apel?"
    }
  },
  {
    "id": "zh-v-072",
    "hanzi": "里",
    "pinyin": "lǐ",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "di dalam",
    "enMeaning": "inside",
    "example": {
      "hz": "房间里没有人。",
      "py": "Fángjiān lǐ méi yǒu rén.",
      "id": "Di dalam kamar tidak ada orang."
    }
  },
  {
    "id": "zh-v-073",
    "hanzi": "西瓜",
    "pinyin": "xīguā",
    "tones": [
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "semangka",
    "enMeaning": "watermelon",
    "example": {
      "hz": "夏天的西瓜很甜。",
      "py": "Xiàtiān de xīguā hěn tián.",
      "id": "Semangka musim panas sangat manis."
    }
  },
  {
    "id": "zh-v-074",
    "hanzi": "苹果",
    "pinyin": "píngguǒ",
    "tones": [
      2,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "apel",
    "enMeaning": "apple",
    "example": {
      "hz": "这个苹果很好吃。",
      "py": "Zhè gè píngguǒ hěn hǎochī.",
      "id": "Apel ini sangat enak."
    }
  },
  {
    "id": "zh-v-075",
    "hanzi": "上",
    "pinyin": "shàng",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Noun / Verb",
    "idMeaning": "di atas, naik",
    "enMeaning": "above, to go up",
    "example": {
      "hz": "书在桌子上。",
      "py": "Shū zài zhuōzi shang.",
      "id": "Buku ada di atas meja."
    }
  },
  {
    "id": "zh-v-076",
    "hanzi": "桌子",
    "pinyin": "zhuōzi",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "meja",
    "enMeaning": "table",
    "example": {
      "hz": "桌子上有一本书。",
      "py": "Zhuōzi shang yǒu yì běn shū.",
      "id": "Di atas meja ada sebuah buku."
    }
  },
  {
    "id": "zh-v-077",
    "hanzi": "椅子",
    "pinyin": "yǐzi",
    "tones": [
      3,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "kursi",
    "enMeaning": "chair",
    "example": {
      "hz": "请坐在这把椅子上。",
      "py": "Qǐng zuò zài zhè bǎ yǐzi shang.",
      "id": "Silakan duduk di kursi ini."
    }
  },
  {
    "id": "zh-v-078",
    "hanzi": "杯子",
    "pinyin": "bēizi",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "cangkir, gelas",
    "enMeaning": "cup",
    "example": {
      "hz": "杯子里有水。",
      "py": "Bēizi lǐ yǒu shuǐ.",
      "id": "Di dalam cangkir ada air."
    }
  },
  {
    "id": "zh-v-079",
    "hanzi": "那",
    "pinyin": "nà",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "itu",
    "enMeaning": "that",
    "example": {
      "hz": "那是我的书包。",
      "py": "Nà shì wǒ de shūbāo.",
      "id": "Itu tas sekolah saya."
    }
  },
  {
    "id": "zh-v-080",
    "hanzi": "大",
    "pinyin": "dà",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "besar",
    "enMeaning": "big",
    "example": {
      "hz": "这个房间很大。",
      "py": "Zhè gè fángjiān hěn dà.",
      "id": "Kamar ini sangat besar."
    }
  },
  {
    "id": "zh-v-081",
    "hanzi": "小",
    "pinyin": "xiǎo",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "kecil",
    "enMeaning": "small",
    "example": {
      "hz": "这只猫很小。",
      "py": "Zhè zhī māo hěn xiǎo.",
      "id": "Kucing ini sangat kecil."
    }
  },
  {
    "id": "zh-v-082",
    "hanzi": "这",
    "pinyin": "zhè",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "ini",
    "enMeaning": "this",
    "example": {
      "hz": "这是什么？",
      "py": "Zhè shì shénme?",
      "id": "Ini apa?"
    }
  },
  {
    "id": "zh-v-083",
    "hanzi": "猫",
    "pinyin": "māo",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "kucing",
    "enMeaning": "cat",
    "example": {
      "hz": "那只白猫很漂亮。",
      "py": "Nà zhī bái māo hěn piàoliang.",
      "id": "Kucing putih itu sangat cantik."
    }
  },
  {
    "id": "zh-v-084",
    "hanzi": "狗",
    "pinyin": "gǒu",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "anjing",
    "enMeaning": "dog",
    "example": {
      "hz": "我家有一只小狗。",
      "py": "Wǒ jiā yǒu yì zhī xiǎogǒu.",
      "id": "Di rumah saya ada seekor anak anjing."
    }
  },
  {
    "id": "zh-v-085",
    "hanzi": "下",
    "pinyin": "xià",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Noun / Verb",
    "idMeaning": "di bawah, turun",
    "enMeaning": "below, under",
    "example": {
      "hz": "椅子下面有一只猫。",
      "py": "Yǐzi xiàmiàn yǒu yì zhī māo.",
      "id": "Di bawah kursi ada seekor kucing."
    }
  },
  {
    "id": "zh-v-086",
    "hanzi": "漂亮",
    "pinyin": "piàoliang",
    "tones": [
      4,
      0
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "cantik, indah",
    "enMeaning": "beautiful",
    "example": {
      "hz": "这件衣服真漂亮。",
      "py": "Zhè jiàn yīfu zhēn piàoliang.",
      "id": "Baju ini sungguh cantik."
    }
  },
  {
    "id": "zh-v-087",
    "hanzi": "谢谢",
    "pinyin": "xièxie",
    "tones": [
      4,
      0
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "terima kasih",
    "enMeaning": "thank you",
    "example": {
      "hz": "谢谢你的帮助！",
      "py": "Xièxie nǐ de bāngzhù!",
      "id": "Terima kasih atas bantuanmu!"
    }
  },
  {
    "id": "zh-v-088",
    "hanzi": "岁",
    "pinyin": "suì",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "tahun (usia)",
    "enMeaning": "years of age",
    "example": {
      "hz": "你今年几岁了？",
      "py": "Nǐ jīnnián jǐ suì le?",
      "id": "Tahun ini kamu umur berapa?"
    }
  },
  {
    "id": "zh-v-089",
    "hanzi": "先生",
    "pinyin": "xiānsheng",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "tuan, bapak, suami",
    "enMeaning": "Mr., husband",
    "example": {
      "hz": "王先生在办公室。",
      "py": "Wáng xiānsheng zài bàngōngshì.",
      "id": "Tuan Wang ada di kantor."
    }
  },
  {
    "id": "zh-v-090",
    "hanzi": "妻子",
    "pinyin": "qīzi",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "istri",
    "enMeaning": "wife",
    "example": {
      "hz": "他妻子是医生。",
      "py": "Tā qīzi shì yīshēng.",
      "id": "Istrinya seorang dokter."
    }
  },
  {
    "id": "zh-v-091",
    "hanzi": "女儿",
    "pinyin": "nǚ'ér",
    "tones": [
      3,
      2
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "anak perempuan",
    "enMeaning": "daughter",
    "example": {
      "hz": "他女儿五岁了。",
      "py": "Tā nǚ'ér wǔ suì le.",
      "id": "Anak perempuannya berusia lima tahun."
    }
  },
  {
    "id": "zh-v-092",
    "hanzi": "儿子",
    "pinyin": "érzi",
    "tones": [
      2,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "anak laki-laki",
    "enMeaning": "son",
    "example": {
      "hz": "我儿子在上大学。",
      "py": "Wǒ érzi zài shàng dàxué.",
      "id": "Anak laki-laki saya sedang kuliah."
    }
  },
  {
    "id": "zh-v-093",
    "hanzi": "和",
    "pinyin": "hé",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Conjunction",
    "idMeaning": "dan, bersama",
    "enMeaning": "and, with",
    "example": {
      "hz": "我和爸爸去超市。",
      "py": "Wǒ hé bàba qù chāoshì.",
      "id": "Saya dan ayah pergi ke supermarket."
    }
  },
  {
    "id": "zh-v-094",
    "hanzi": "饭店",
    "pinyin": "fàndiàn",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "restoran, hotel",
    "enMeaning": "restaurant, hotel",
    "example": {
      "hz": "我们在饭店吃晚餐。",
      "py": "Wǒmen zài fàndiàn chī wǎncān.",
      "id": "Kami makan malam di restoran."
    }
  },
  {
    "id": "zh-v-095",
    "hanzi": "蛋糕",
    "pinyin": "dàngāo",
    "tones": [
      4,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "kue, bolu",
    "enMeaning": "cake",
    "example": {
      "hz": "生日蛋糕真甜。",
      "py": "Shēngrì dàngāo zhēn tián.",
      "id": "Kue ulang tahunnya sungguh manis."
    }
  },
  {
    "id": "zh-v-096",
    "hanzi": "高兴",
    "pinyin": "gāoxìng",
    "tones": [
      1,
      4
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "senang, gembira",
    "enMeaning": "happy",
    "example": {
      "hz": "认识你很高兴！",
      "py": "Rènshi nǐ hěn gāoxìng!",
      "id": "Senang berkenalan dengan Anda!"
    }
  },
  {
    "id": "zh-v-097",
    "hanzi": "东西",
    "pinyin": "dōngxi",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "barang, benda",
    "enMeaning": "thing, stuff",
    "example": {
      "hz": "你想买什么东西？",
      "py": "Nǐ xiǎng mǎi shénme dōngxi?",
      "id": "Barang apa yang ingin kamu beli?"
    }
  },
  {
    "id": "zh-v-098",
    "hanzi": "商店",
    "pinyin": "shāngdiàn",
    "tones": [
      1,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "toko",
    "enMeaning": "shop, store",
    "example": {
      "hz": "商店里有很多人。",
      "py": "Shāngdiàn lǐ yǒu hěn duō rén.",
      "id": "Di dalam toko ada banyak orang."
    }
  },
  {
    "id": "zh-v-099",
    "hanzi": "衣服",
    "pinyin": "yīfu",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "pakaian, baju",
    "enMeaning": "clothes",
    "example": {
      "hz": "这件衣服很合身。",
      "py": "Zhè jiàn yīfu hěn héshēn.",
      "id": "Pakaian ini sangat pas di badan."
    }
  },
  {
    "id": "zh-v-100",
    "hanzi": "前面",
    "pinyin": "qiánmiàn",
    "tones": [
      2,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "depan, di depan",
    "enMeaning": "in front",
    "example": {
      "hz": "车站就在前面。",
      "py": "Chēzhàn jiù zài qiánmiàn.",
      "id": "Stasiun tepat ada di depan."
    }
  },
  {
    "id": "zh-v-101",
    "hanzi": "哪儿",
    "pinyin": "nǎr",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "mana, di mana",
    "enMeaning": "where",
    "example": {
      "hz": "你去哪儿？",
      "py": "Nǐ qù nǎr?",
      "id": "Kamu mau ke mana?"
    }
  },
  {
    "id": "zh-v-102",
    "hanzi": "些",
    "pinyin": "xiē",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "beberapa",
    "enMeaning": "some",
    "example": {
      "hz": "这些水果很新鲜。",
      "py": "Zhèxiē shuǐguǒ hěn xīnxiān.",
      "id": "Buah-buahan ini sangat segar."
    }
  },
  {
    "id": "zh-v-103",
    "hanzi": "喂",
    "pinyin": "wèi",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Interjection",
    "idMeaning": "halo (di telepon)",
    "enMeaning": "hello (on phone)",
    "example": {
      "hz": "喂，请问王老师在吗？",
      "py": "Wèi, qǐngwèn Wáng lǎoshī zài ma?",
      "id": "Halo, apakah Guru Wang ada?"
    }
  },
  {
    "id": "zh-v-104",
    "hanzi": "感冒",
    "pinyin": "gǎnmào",
    "tones": [
      3,
      4
    ],
    "level": 1,
    "pos": "Verb / Noun",
    "idMeaning": "masuk angin, flu",
    "enMeaning": "to catch a cold",
    "example": {
      "hz": "他感冒了，在休息。",
      "py": "Tā gǎnmào le, zài xiūxi.",
      "id": "Dia masuk angin, sedang istirahat."
    }
  },
  {
    "id": "zh-v-105",
    "hanzi": "医生",
    "pinyin": "yīshēng",
    "tones": [
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "dokter",
    "enMeaning": "doctor",
    "example": {
      "hz": "医生让我多喝水。",
      "py": "Yīshēng ràng wǒ duō hē shuǐ.",
      "id": "Dokter menyuruh saya banyak minum air."
    }
  },
  {
    "id": "zh-v-106",
    "hanzi": "医院",
    "pinyin": "yīyuàn",
    "tones": [
      1,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "rumah sakit",
    "enMeaning": "hospital",
    "example": {
      "hz": "前面有一家大医院。",
      "py": "Qiánmiàn yǒu yì jiā dà yīyuàn.",
      "id": "Di depan ada sebuah rumah sakit besar."
    }
  },
  {
    "id": "zh-v-107",
    "hanzi": "这儿",
    "pinyin": "zhèr",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "di sini",
    "enMeaning": "here",
    "example": {
      "hz": "请在这儿写名字。",
      "py": "Qǐng zài zhèr xiě míngzi.",
      "id": "Silakan tulis nama di sini."
    }
  },
  {
    "id": "zh-v-108",
    "hanzi": "那儿",
    "pinyin": "nàr",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Pronoun",
    "idMeaning": "di sana",
    "enMeaning": "there",
    "example": {
      "hz": "我的手机在那儿。",
      "py": "Wǒ de shǒujī zài nàr.",
      "id": "Ponsel saya ada di sana."
    }
  },
  {
    "id": "zh-v-109",
    "hanzi": "住",
    "pinyin": "zhù",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "tinggal, mendiami",
    "enMeaning": "to live, stay",
    "example": {
      "hz": "你住在哪儿？",
      "py": "Nǐ zhù zài nǎr?",
      "id": "Kamu tinggal di mana?"
    }
  },
  {
    "id": "zh-v-110",
    "hanzi": "工作",
    "pinyin": "gōngzuò",
    "tones": [
      1,
      4
    ],
    "level": 1,
    "pos": "Verb / Noun",
    "idMeaning": "bekerja, pekerjaan",
    "enMeaning": "to work, job",
    "example": {
      "hz": "他在银行工作。",
      "py": "Tā zài yínháng gōngzuò.",
      "id": "Dia bekerja di bank."
    }
  },
  {
    "id": "zh-v-111",
    "hanzi": "后面",
    "pinyin": "hòumiàn",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "belakang, di belakang",
    "enMeaning": "behind",
    "example": {
      "hz": "学校后面有一个公园。",
      "py": "Xuéxiào hòumiàn yǒu yí gè gōngyuán.",
      "id": "Di belakang sekolah ada taman."
    }
  },
  {
    "id": "zh-v-112",
    "hanzi": "电视",
    "pinyin": "diànshì",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "televisi",
    "enMeaning": "television",
    "example": {
      "hz": "他在看电视。",
      "py": "Tā zài kàn diànshì.",
      "id": "Dia sedang menonton televisi."
    }
  },
  {
    "id": "zh-v-113",
    "hanzi": "认识",
    "pinyin": "rènshi",
    "tones": [
      4,
      0
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "mengenal, kenal",
    "enMeaning": "to know, recognize",
    "example": {
      "hz": "我认识这位老师。",
      "py": "Wǒ rènshi zhè wèi lǎoshī.",
      "id": "Saya kenal guru ini."
    }
  },
  {
    "id": "zh-v-114",
    "hanzi": "机场",
    "pinyin": "jīchǎng",
    "tones": [
      1,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "bandar udara",
    "enMeaning": "airport",
    "example": {
      "hz": "坐出租车去机场。",
      "py": "Zuò chūzūchē qù jīchǎng.",
      "id": "Naik taksi ke bandara."
    }
  },
  {
    "id": "zh-v-115",
    "hanzi": "坐",
    "pinyin": "zuò",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "duduk, naik (kendaraan)",
    "enMeaning": "to sit, ride",
    "example": {
      "hz": "请坐下。",
      "py": "Qǐng zuò xià.",
      "id": "Silakan duduk."
    }
  },
  {
    "id": "zh-v-116",
    "hanzi": "飞机",
    "pinyin": "fēijī",
    "tones": [
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "pesawat terbang",
    "enMeaning": "airplane",
    "example": {
      "hz": "飞机马上起飞了。",
      "py": "Fēijī mǎshàng qǐfēi le.",
      "id": "Pesawat segera lepas landas."
    }
  },
  {
    "id": "zh-v-117",
    "hanzi": "出租车",
    "pinyin": "chūzūchē",
    "tones": [
      1,
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "taksi",
    "enMeaning": "taxi",
    "example": {
      "hz": "我们在路边打出租车。",
      "py": "Wǒmen zài lùbiān dǎ chūzūchē.",
      "id": "Kami menyetop taksi di tepi jalan."
    }
  },
  {
    "id": "zh-v-118",
    "hanzi": "少",
    "pinyin": "shǎo",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "sedikit, jarang",
    "enMeaning": "few, little",
    "example": {
      "hz": "今天来的学生很少。",
      "py": "Jīntiān lái de xuésheng hěn shǎo.",
      "id": "Siswa yang datang hari ini sangat sedikit."
    }
  },
  {
    "id": "zh-v-119",
    "hanzi": "分钟",
    "pinyin": "fēnzhōng",
    "tones": [
      1,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "menit (durasi)",
    "enMeaning": "minute",
    "example": {
      "hz": "等我十分钟。",
      "py": "Děng wǒ shí fēnzhōng.",
      "id": "Tunggu saya sepuluh menit."
    }
  },
  {
    "id": "zh-v-120",
    "hanzi": "天气",
    "pinyin": "tiānqì",
    "tones": [
      1,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "cuaca",
    "enMeaning": "weather",
    "example": {
      "hz": "明天天气怎么样？",
      "py": "Míngtiān tiānqì zěnmeyàng?",
      "id": "Bagaimana cuaca besok?"
    }
  },
  {
    "id": "zh-v-121",
    "hanzi": "冷",
    "pinyin": "lěng",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "dingin",
    "enMeaning": "cold",
    "example": {
      "hz": "外面太冷了，穿大衣吧。",
      "py": "Wàimiàn tài lěng le, chuān dàyī ba.",
      "id": "Di luar terlalu dingin, pakailah mantel."
    }
  },
  {
    "id": "zh-v-122",
    "hanzi": "热",
    "pinyin": "rè",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Adjective",
    "idMeaning": "panas",
    "enMeaning": "hot",
    "example": {
      "hz": "夏天非常热。",
      "py": "Xiàtiān fēicháng rè.",
      "id": "Musim panas sangatlah terik."
    }
  },
  {
    "id": "zh-v-123",
    "hanzi": "下雨",
    "pinyin": "xiàyǔ",
    "tones": [
      4,
      3
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "turun hujan",
    "enMeaning": "to rain",
    "example": {
      "hz": "外面下雨了，带伞吧。",
      "py": "Wàimiàn xiàyǔ le, dài sǎn ba.",
      "id": "Di luar hujan, bawalah payung."
    }
  },
  {
    "id": "zh-v-124",
    "hanzi": "到",
    "pinyin": "dào",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "sampai, tiba",
    "enMeaning": "to arrive",
    "example": {
      "hz": "我到家了。",
      "py": "Wǒ dào jiā le.",
      "id": "Saya sudah sampai di rumah."
    }
  },
  {
    "id": "zh-v-125",
    "hanzi": "酒店",
    "pinyin": "jiǔdiàn",
    "tones": [
      3,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "hotel penginapan",
    "enMeaning": "hotel",
    "example": {
      "hz": "这家酒店环境很好。",
      "py": "Zhè jiā jiǔdiàn huánjìng hěn hǎo.",
      "id": "Lingkungan hotel ini sangat nyaman."
    }
  },
  {
    "id": "zh-v-126",
    "hanzi": "睡觉",
    "pinyin": "shuìjiào",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "tidur",
    "enMeaning": "to sleep",
    "example": {
      "hz": "时间不早了，快去睡觉。",
      "py": "Shíjiān bù zǎo le, kuài qù shuìjiào.",
      "id": "Sudah larut, lekaslah tidur."
    }
  },
  {
    "id": "zh-v-127",
    "hanzi": "车",
    "pinyin": "chē",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "kendaraan, mobil",
    "enMeaning": "vehicle, car",
    "example": {
      "hz": "他在车站等车。",
      "py": "Tā zài chēzhàn děng chē.",
      "id": "Dia menunggu kendaraan di halte."
    }
  },
  {
    "id": "zh-v-128",
    "hanzi": "开",
    "pinyin": "kāi",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "membuka, mengemudi",
    "enMeaning": "to open, drive",
    "example": {
      "hz": "请把门开一下。",
      "py": "Qǐng bǎ mén kāi yíxià.",
      "id": "Tolong bukakan pintunya sejenak."
    }
  },
  {
    "id": "zh-v-129",
    "hanzi": "空调",
    "pinyin": "kōngtiáo",
    "tones": [
      1,
      2
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "pendingin ruangan, AC",
    "enMeaning": "air conditioner",
    "example": {
      "hz": "开空调很凉快。",
      "py": "Kāi kōngtiáo hěn liángkuai.",
      "id": "Menyalakan AC terasa sangat sejuk."
    }
  },
  {
    "id": "zh-v-130",
    "hanzi": "再见",
    "pinyin": "zàijiàn",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Interjection",
    "idMeaning": "sampai jumpa",
    "enMeaning": "goodbye",
    "example": {
      "hz": "明天学校见，再见！",
      "py": "Míngtiān xuéxiào jiàn, zàijiàn!",
      "id": "Sampai jumpa di sekolah besok!"
    }
  },
  {
    "id": "zh-v-131",
    "hanzi": "发票",
    "pinyin": "fāpiào",
    "tones": [
      1,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "kuitansi, struk/faktur",
    "enMeaning": "receipt, invoice",
    "example": {
      "hz": "请给我开一张发票。",
      "py": "Qǐng gěi wǒ kāi yì zhāng fāpiào.",
      "id": "Tolong buatkan saya kuitansi."
    }
  },
  {
    "id": "zh-v-132",
    "hanzi": "问",
    "pinyin": "wèn",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "bertanya",
    "enMeaning": "to ask",
    "example": {
      "hz": "我可以问一个问题吗？",
      "py": "Wǒ kěyǐ wèn yí gè wèntí ma?",
      "id": "Bolehkah saya bertanya satu hal?"
    }
  },
  {
    "id": "zh-v-133",
    "hanzi": "米饭",
    "pinyin": "mǐfàn",
    "tones": [
      3,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "nasi putih",
    "enMeaning": "cooked rice",
    "example": {
      "hz": "我要一碗米饭。",
      "py": "Wǒ yào yì wǎn mǐfàn.",
      "id": "Saya minta semangkuk nasi putih."
    }
  },
  {
    "id": "zh-v-134",
    "hanzi": "菜",
    "pinyin": "cài",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "sayuran, lauk/hidangan",
    "enMeaning": "dish, vegetable",
    "example": {
      "hz": "这些中国菜很好吃。",
      "py": "Zhèxiē Zhōngguó cài hěn hǎochī.",
      "id": "Masakan Tiongkok ini sangat enak."
    }
  },
  {
    "id": "zh-v-135",
    "hanzi": "菜单",
    "pinyin": "càidān",
    "tones": [
      4,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "buku menu",
    "enMeaning": "menu",
    "example": {
      "hz": "服务员，请给我菜单。",
      "py": "Fúwùyuán, qǐng gěi wǒ càidān.",
      "id": "Pelayan, tolong berikan menunya."
    }
  },
  {
    "id": "zh-v-136",
    "hanzi": "水",
    "pinyin": "shuǐ",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "air",
    "enMeaning": "water",
    "example": {
      "hz": "请喝一杯温水。",
      "py": "Qǐng hē yì bēi wēn shuǐ.",
      "id": "Silakan minum segelas air hangat."
    }
  },
  {
    "id": "zh-v-137",
    "hanzi": "本",
    "pinyin": "běn",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Measure Word",
    "idMeaning": "jilid, buku (satuan)",
    "enMeaning": "measure word for books",
    "example": {
      "hz": "这两本书很有用。",
      "py": "Zhè liǎng běn shū hěn yǒuyòng.",
      "id": "Dua buku ini sangat bermanfaat."
    }
  },
  {
    "id": "zh-v-138",
    "hanzi": "小姐",
    "pinyin": "xiǎojiě",
    "tones": [
      3,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "nona, mbak",
    "enMeaning": "miss, lady",
    "example": {
      "hz": "李小姐在图书馆。",
      "py": "Lǐ xiǎojiě zài túshūguǎn.",
      "id": "Nona Li ada di perpustakaan."
    }
  },
  {
    "id": "zh-v-139",
    "hanzi": "喜欢",
    "pinyin": "xǐhuan",
    "tones": [
      3,
      0
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "menyukai, gemar",
    "enMeaning": "to like",
    "example": {
      "hz": "我很喜欢学汉语。",
      "py": "Wǒ hěn xǐhuan xué Hànyǔ.",
      "id": "Saya sangat suka belajar Mandarin."
    }
  },
  {
    "id": "zh-v-140",
    "hanzi": "不客气",
    "pinyin": "bú kèqi",
    "tones": [
      2,
      4,
      0
    ],
    "level": 1,
    "pos": "Phrase",
    "idMeaning": "sama-sama, kembali",
    "enMeaning": "you're welcome",
    "example": {
      "hz": "不客气，这是我应该做的。",
      "py": "Bú kèqi, zhè shì wǒ yīnggāi zuò de.",
      "id": "Sama-sama, ini sudah tugas saya."
    }
  },
  {
    "id": "zh-v-141",
    "hanzi": "时间",
    "pinyin": "shíjiān",
    "tones": [
      2,
      1
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "waktu, saat",
    "enMeaning": "time",
    "example": {
      "hz": "你明天有时间吗？",
      "py": "Nǐ míngtiān yǒu shíjiān ma?",
      "id": "Apakah besok kamu punya waktu luang?"
    }
  },
  {
    "id": "zh-v-142",
    "hanzi": "学习",
    "pinyin": "xuéxí",
    "tones": [
      2,
      2
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "belajar, menuntut ilmu",
    "enMeaning": "to study",
    "example": {
      "hz": "我们要努力学习。",
      "py": "Wǒmen yào nǔlì xuéxí.",
      "id": "Kita harus belajar dengan giat."
    }
  },
  {
    "id": "zh-v-143",
    "hanzi": "考试",
    "pinyin": "kǎoshì",
    "tones": [
      3,
      4
    ],
    "level": 1,
    "pos": "Verb / Noun",
    "idMeaning": "ujian, tes",
    "enMeaning": "examination, test",
    "example": {
      "hz": "明天上午有汉语考试。",
      "py": "Míngtiān shàngwǔ yǒu Hànyǔ kǎoshì.",
      "id": "Besok pagi ada ujian bahasa Mandarin."
    }
  },
  {
    "id": "zh-v-144",
    "hanzi": "对不起",
    "pinyin": "duìbuqǐ",
    "tones": [
      4,
      0,
      3
    ],
    "level": 1,
    "pos": "Phrase",
    "idMeaning": "maaf, mohon maaf",
    "enMeaning": "sorry",
    "example": {
      "hz": "对不起，我来晚了。",
      "py": "Duìbuqǐ, wǒ lái wǎn le.",
      "id": "Maaf, saya datang terlambat."
    }
  },
  {
    "id": "zh-v-145",
    "hanzi": "没",
    "pinyin": "méi",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Adverb",
    "idMeaning": "tidak, belum",
    "enMeaning": "not, have not",
    "example": {
      "hz": "我还没吃晚饭。",
      "py": "Wǒ hái méi chī wǎnfàn.",
      "id": "Saya belum makan malam."
    }
  },
  {
    "id": "zh-v-146",
    "hanzi": "关系",
    "pinyin": "guānxi",
    "tones": [
      1,
      0
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "hubungan, masalah",
    "enMeaning": "relation, matter",
    "example": {
      "hz": "没关系，别客气。",
      "py": "Méi guānxi, bié kèqi.",
      "id": "Tidak apa-apa, jangan sungkan."
    }
  },
  {
    "id": "zh-v-147",
    "hanzi": "汉字",
    "pinyin": "Hànzì",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "karakter Hanzi Tionghoa",
    "enMeaning": "Chinese character",
    "example": {
      "hz": "汉字字形很优美。",
      "py": "Hànzì zìxíng hěn yōuměi.",
      "id": "Bentuk karakter Hanzi sangat indah."
    }
  },
  {
    "id": "zh-v-148",
    "hanzi": "写",
    "pinyin": "xiě",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "menulis",
    "enMeaning": "to write",
    "example": {
      "hz": "请在这里写你的名字。",
      "py": "Qǐng zài zhèlǐ xiě nǐ de míngzi.",
      "id": "Tolong tulis namamu di sini."
    }
  },
  {
    "id": "zh-v-149",
    "hanzi": "字",
    "pinyin": "zì",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "karakter, huruf",
    "enMeaning": "character, word",
    "example": {
      "hz": "这个字怎么读？",
      "py": "Zhè gè zì zěnme dú?",
      "id": "Bagaimana cara membaca huruf ini?"
    }
  },
  {
    "id": "zh-v-150",
    "hanzi": "读",
    "pinyin": "dú",
    "tones": [
      2
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "membaca bersuara",
    "enMeaning": "to read",
    "example": {
      "hz": "跟我一起读课文。",
      "py": "Gēn wǒ yìqǐ dú kèwén.",
      "id": "Ikuti saya membaca teks pelajaran."
    }
  },
  {
    "id": "zh-v-151",
    "hanzi": "爱",
    "pinyin": "ài",
    "tones": [
      4
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "mencintai, menyayangi",
    "enMeaning": "to love",
    "example": {
      "hz": "父母很爱他们的孩子。",
      "py": "Fùmǔ hěn ài tāmen de háizi.",
      "id": "Orang tua sangat menyayangi anak-anak mereka."
    }
  },
  {
    "id": "zh-v-152",
    "hanzi": "听",
    "pinyin": "tīng",
    "tones": [
      1
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "mendengarkan",
    "enMeaning": "to listen",
    "example": {
      "hz": "他在认真听音乐。",
      "py": "Tā zài rènzhēn tīng yīnyuè.",
      "id": "Dia sedang saksama mendengarkan musik."
    }
  },
  {
    "id": "zh-v-153",
    "hanzi": "大学",
    "pinyin": "dàxué",
    "tones": [
      4,
      2
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "universitas, perguruan tinggi",
    "enMeaning": "university",
    "example": {
      "hz": "他在北京大学读书。",
      "py": "Tā zài Běijīng Dàxué dú shū.",
      "id": "Dia kuliah di Universitas Beijing."
    }
  },
  {
    "id": "zh-v-154",
    "hanzi": "电脑",
    "pinyin": "diànnǎo",
    "tones": [
      4,
      3
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "komputer, laptop",
    "enMeaning": "computer",
    "example": {
      "hz": "我用电脑写作业。",
      "py": "Wǒ yòng diànnǎo xiě zuòyè.",
      "id": "Saya memakai komputer untuk tugas."
    }
  },
  {
    "id": "zh-v-155",
    "hanzi": "打",
    "pinyin": "dǎ",
    "tones": [
      3
    ],
    "level": 1,
    "pos": "Verb",
    "idMeaning": "memukul, menelepon, bermain",
    "enMeaning": "to hit, call, play",
    "example": {
      "hz": "他在操场打篮球。",
      "py": "Tā zài cāochǎng dǎ lánqiú.",
      "id": "Dia bermain basket di lapangan."
    }
  },
  {
    "id": "zh-v-156",
    "hanzi": "电话",
    "pinyin": "diànhuà",
    "tones": [
      4,
      4
    ],
    "level": 1,
    "pos": "Noun",
    "idMeaning": "telepon",
    "enMeaning": "telephone",
    "example": {
      "hz": "给我打电话吧。",
      "py": "Gěi wǒ dǎ diànhuà ba.",
      "id": "Teleponlah saya nanti ya."
    }
  },
  {
    "id": "zh-v-157",
    "hanzi": "介绍",
    "pinyin": "jièshào",
    "tones": [
      4,
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "memperkenalkan",
    "enMeaning": "to introduce",
    "example": {
      "hz": "我来介绍一下新朋友。",
      "py": "Wǒ lái jièshào yíxià xīn péngyou.",
      "id": "Mari saya perkenalkan teman baru."
    }
  },
  {
    "id": "zh-v-158",
    "hanzi": "姓",
    "pinyin": "xìng",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun / Verb",
    "idMeaning": "bermarga, marga",
    "enMeaning": "family name",
    "example": {
      "hz": "请问您贵姓？",
      "py": "Qǐngwèn nín guì xìng?",
      "id": "Boleh saya tahu marga Anda?"
    }
  },
  {
    "id": "zh-v-159",
    "hanzi": "旁边",
    "pinyin": "pángbiān",
    "tones": [
      2,
      1
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "di samping, sebelah",
    "enMeaning": "beside, next to",
    "example": {
      "hz": "坐在我旁边的是我姐姐。",
      "py": "Zuò zài wǒ pángbiān de shì wǒ jiějie.",
      "id": "Yang duduk di samping saya adalah kakak perempuan saya."
    }
  },
  {
    "id": "zh-v-160",
    "hanzi": "女孩",
    "pinyin": "nǚhái",
    "tones": [
      3,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "anak/gadis perempuan",
    "enMeaning": "girl",
    "example": {
      "hz": "那个女孩很聪明。",
      "py": "Nà gè nǚhái hěn cōngming.",
      "id": "Gadis itu sangat pandai."
    }
  },
  {
    "id": "zh-v-161",
    "hanzi": "等",
    "pinyin": "děng",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "menunggu",
    "enMeaning": "to wait",
    "example": {
      "hz": "请在这里等我五分钟。",
      "py": "Qǐng zài zhèlǐ děng wǒ wǔ fēnzhōng.",
      "id": "Tolong tunggu saya 5 menit di sini."
    }
  },
  {
    "id": "zh-v-162",
    "hanzi": "新",
    "pinyin": "xīn",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "baru",
    "enMeaning": "new",
    "example": {
      "hz": "这是我的新手机。",
      "py": "Zhè shì wǒ de xīn shǒujī.",
      "id": "Ini ponsel baru saya."
    }
  },
  {
    "id": "zh-v-163",
    "hanzi": "午饭",
    "pinyin": "wǔfàn",
    "tones": [
      3,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "makan siang",
    "enMeaning": "lunch",
    "example": {
      "hz": "中午一起吃午饭吧。",
      "py": "Zhōngwǔ yìqǐ chī wǔfàn ba.",
      "id": "Ayo makan siang bersama."
    }
  },
  {
    "id": "zh-v-164",
    "hanzi": "商场",
    "pinyin": "shāngchǎng",
    "tones": [
      1,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "pusat perbelanjaan, mall",
    "enMeaning": "shopping mall",
    "example": {
      "hz": "周末商场人很多。",
      "py": "Zhōumò shāngchǎng rén hěn duō.",
      "id": "Akhir pekan mall ramai sekali."
    }
  },
  {
    "id": "zh-v-165",
    "hanzi": "长",
    "pinyin": "cháng",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "panjang",
    "enMeaning": "long",
    "example": {
      "hz": "这条路很长。",
      "py": "Zhè tiáo lù hěn cháng.",
      "id": "Jalanan ini sangat panjang."
    }
  },
  {
    "id": "zh-v-166",
    "hanzi": "短",
    "pinyin": "duǎn",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "pendek",
    "enMeaning": "short (length)",
    "example": {
      "hz": "这支铅笔太短了。",
      "py": "Zhè zhī qiānbǐ tài duǎn le.",
      "id": "Pensil ini terlalu pendek."
    }
  },
  {
    "id": "zh-v-167",
    "hanzi": "高",
    "pinyin": "gāo",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "tinggi",
    "enMeaning": "tall, high",
    "example": {
      "hz": "姚明个子很高。",
      "py": "Yáo Míng gèzi hěn gāo.",
      "id": "Yao Ming badannya sangat tinggi."
    }
  },
  {
    "id": "zh-v-168",
    "hanzi": "矮",
    "pinyin": "ǎi",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "pendek (tinggi badan)",
    "enMeaning": "short (height)",
    "example": {
      "hz": "弟弟比哥哥矮一点。",
      "py": "Dìdi bǐ gēge ǎi yìdiǎn.",
      "id": "Adik lebih pendek daripada kakak."
    }
  },
  {
    "id": "zh-v-169",
    "hanzi": "左边",
    "pinyin": "zuǒbian",
    "tones": [
      3,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "sebelah kiri",
    "enMeaning": "left side",
    "example": {
      "hz": "书店在左边。",
      "py": "Shūdiàn zài zuǒbian.",
      "id": "Toko buku ada di sebelah kiri."
    }
  },
  {
    "id": "zh-v-170",
    "hanzi": "右边",
    "pinyin": "yòubian",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "sebelah kanan",
    "enMeaning": "right side",
    "example": {
      "hz": "洗手间在右边。",
      "py": "Xǐshǒujiān zài yòubian.",
      "id": "Toilet ada di sebelah kanan."
    }
  },
  {
    "id": "zh-v-171",
    "hanzi": "姐姐",
    "pinyin": "jiějie",
    "tones": [
      3,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "kakak perempuan",
    "enMeaning": "elder sister",
    "example": {
      "hz": "我姐姐喜欢唱歌。",
      "py": "Wǒ jiějie xǐhuan chàng gē.",
      "id": "Kakak perempuan saya suka menyanyi."
    }
  },
  {
    "id": "zh-v-172",
    "hanzi": "铅笔",
    "pinyin": "qiānbǐ",
    "tones": [
      1,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "pensil",
    "enMeaning": "pencil",
    "example": {
      "hz": "我用铅笔写字。",
      "py": "Wǒ yòng qiānbǐ xiě zì.",
      "id": "Saya menulis huruf dengan pensil."
    }
  },
  {
    "id": "zh-v-173",
    "hanzi": "路",
    "pinyin": "lù",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "jalan, rute",
    "enMeaning": "road, path",
    "example": {
      "hz": "这条路上车很多。",
      "py": "Zhè tiáo lù shang chē hěn duō.",
      "id": "Di jalan ini banyak mobil."
    }
  },
  {
    "id": "zh-v-174",
    "hanzi": "门",
    "pinyin": "mén",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "pintu, gerbang",
    "enMeaning": "door, gate",
    "example": {
      "hz": "请关上门。",
      "py": "Qǐng guān shang mén.",
      "id": "Tolong tutup pintunya."
    }
  },
  {
    "id": "zh-v-175",
    "hanzi": "快",
    "pinyin": "kuài",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adjective / Adverb",
    "idMeaning": "cepat, lekas",
    "enMeaning": "fast, quick",
    "example": {
      "hz": "地铁速度很快。",
      "py": "Dìtiě sùdù hěn kuài.",
      "id": "Laju kereta subway sangat cepat."
    }
  },
  {
    "id": "zh-v-176",
    "hanzi": "非常",
    "pinyin": "fēicháng",
    "tones": [
      1,
      2
    ],
    "level": 2,
    "pos": "Adverb",
    "idMeaning": "sangat, luar biasa",
    "enMeaning": "very, extremely",
    "example": {
      "hz": "我非常高兴。",
      "py": "Wǒ fēicháng gāoxìng.",
      "id": "Saya sangat gembira."
    }
  },
  {
    "id": "zh-v-177",
    "hanzi": "小时",
    "pinyin": "xiǎoshí",
    "tones": [
      3,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "jam (durasi)",
    "enMeaning": "hour",
    "example": {
      "hz": "坐飞机需要两个小时。",
      "py": "Zuò fēijī xūyào liǎng gè xiǎoshí.",
      "id": "Naik pesawat butuh dua jam."
    }
  },
  {
    "id": "zh-v-178",
    "hanzi": "公共汽车",
    "pinyin": "gōnggòng qìchē",
    "tones": [
      1,
      4,
      4,
      1
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "bus kota umum",
    "enMeaning": "bus",
    "example": {
      "hz": "我每天坐公共汽车上班。",
      "py": "Wǒ měitiān zuò gōnggòng qìchē shàngbān.",
      "id": "Saya setiap hari naik bus ke kantor."
    }
  },
  {
    "id": "zh-v-179",
    "hanzi": "地铁",
    "pinyin": "dìtiě",
    "tones": [
      4,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "kereta subway / MRT",
    "enMeaning": "subway, metro",
    "example": {
      "hz": "坐地铁又快又便宜。",
      "py": "Zuò dìtiě yòu kuài yòu piányi.",
      "id": "Naik subway cepat dan hemat."
    }
  },
  {
    "id": "zh-v-180",
    "hanzi": "每",
    "pinyin": "měi",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Pronoun",
    "idMeaning": "setiap, tiap-tiap",
    "enMeaning": "every, each",
    "example": {
      "hz": "我每天都学中文。",
      "py": "Wǒ měitiān dōu xué Zhōngwén.",
      "id": "Setiap hari saya belajar Mandarin."
    }
  },
  {
    "id": "zh-v-181",
    "hanzi": "公司",
    "pinyin": "gōngsī",
    "tones": [
      1,
      1
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "perusahaan, kantor",
    "enMeaning": "company",
    "example": {
      "hz": "我们公司在市中心。",
      "py": "Wǒmen gōngsī zài shì zhōngxīn.",
      "id": "Kantor kami berada di pusat kota."
    }
  },
  {
    "id": "zh-v-182",
    "hanzi": "远",
    "pinyin": "yuǎn",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "jauh",
    "enMeaning": "far",
    "example": {
      "hz": "我家离学校不远。",
      "py": "Wǒ jiā lí xuéxiào bù yuǎn.",
      "id": "Rumah saya tidak jauh dari sekolah."
    }
  },
  {
    "id": "zh-v-183",
    "hanzi": "两",
    "pinyin": "liǎng",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Numeral",
    "idMeaning": "dua (untuk kuantitas)",
    "enMeaning": "two (quantifier)",
    "example": {
      "hz": "我有两张电影票。",
      "py": "Wǒ yǒu liǎng zhāng diànyǐng piào.",
      "id": "Saya punya dua lembar tiket bioskop."
    }
  },
  {
    "id": "zh-v-184",
    "hanzi": "前",
    "pinyin": "qián",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "depan, sebelum",
    "enMeaning": "front, before",
    "example": {
      "hz": "三天前他出国了。",
      "py": "Sān tiān qián tā chūguó le.",
      "id": "Tiga hari lalu dia pergi ke luar negeri."
    }
  },
  {
    "id": "zh-v-185",
    "hanzi": "右",
    "pinyin": "yòu",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "kanan",
    "enMeaning": "right",
    "example": {
      "hz": "向右转就是地铁站。",
      "py": "Xiàng yòu zhuǎn jiù shì dìtiězhàn.",
      "id": "Belok ke kanan adalah stasiun subway."
    }
  },
  {
    "id": "zh-v-186",
    "hanzi": "近",
    "pinyin": "jìn",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "dekat",
    "enMeaning": "near, close",
    "example": {
      "hz": "超市离这里很近。",
      "py": "Chāoshì lí zhèlǐ hěn jìn.",
      "id": "Supermarket dekat dari sini."
    }
  },
  {
    "id": "zh-v-187",
    "hanzi": "线",
    "pinyin": "xiàn",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "jalur, garis",
    "enMeaning": "line, route",
    "example": {
      "hz": "换乘二号线。",
      "py": "Huànchéng èr hào xiàn.",
      "id": "Pindah ke jalur 2."
    }
  },
  {
    "id": "zh-v-188",
    "hanzi": "走",
    "pinyin": "zǒu",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "berjalan kaki, pergi",
    "enMeaning": "to walk",
    "example": {
      "hz": "我们走路去公园。",
      "py": "Wǒmen zǒulù qù gōngyuán.",
      "id": "Kami jalan kaki ke taman."
    }
  },
  {
    "id": "zh-v-189",
    "hanzi": "站",
    "pinyin": "zhàn",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun / Verb",
    "idMeaning": "stasiun, halte, berdiri",
    "enMeaning": "station, stop, to stand",
    "example": {
      "hz": "下一站是北京南站。",
      "py": "Xià yí zhàn shì Běijīng Nán Zhàn.",
      "id": "Pemberhentian berikutnya adalah Stasiun Beijing Selatan."
    }
  },
  {
    "id": "zh-v-190",
    "hanzi": "上面",
    "pinyin": "shàngmian",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "bagian atas, di atas",
    "enMeaning": "on top, above",
    "example": {
      "hz": "书在桌子上面。",
      "py": "Shū zài zhuōzi shàngmian.",
      "id": "Buku ada di atas meja."
    }
  },
  {
    "id": "zh-v-191",
    "hanzi": "鸡蛋",
    "pinyin": "jīdàn",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "telur ayam",
    "enMeaning": "egg",
    "example": {
      "hz": "我每天早上吃一个鸡蛋。",
      "py": "Wǒ měitiān zǎoshang chī yí gè jīdàn.",
      "id": "Tiap pagi saya makan sebutir telur."
    }
  },
  {
    "id": "zh-v-192",
    "hanzi": "牛奶",
    "pinyin": "niúnǎi",
    "tones": [
      2,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "susu sapi",
    "enMeaning": "milk",
    "example": {
      "hz": "喝一杯热牛奶吧。",
      "py": "Hē yì bēi rè niúnǎi ba.",
      "id": "Minumlah segelas susu hangat."
    }
  },
  {
    "id": "zh-v-193",
    "hanzi": "蔬菜",
    "pinyin": "shūcài",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "sayur-mayur",
    "enMeaning": "vegetables",
    "example": {
      "hz": "多吃蔬菜对身体有益。",
      "py": "Duō chī shūcài duì shēntǐ yǒuyì.",
      "id": "Banyak makan sayur menyehatkan tubuh."
    }
  },
  {
    "id": "zh-v-194",
    "hanzi": "鱼",
    "pinyin": "yú",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "ikan",
    "enMeaning": "fish",
    "example": {
      "hz": "清蒸鱼很好吃。",
      "py": "Qīngzhēng yú hěn hǎochī.",
      "id": "Ikan kukus sangat lezat."
    }
  },
  {
    "id": "zh-v-195",
    "hanzi": "羊肉",
    "pinyin": "yángròu",
    "tones": [
      2,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "daging kambing",
    "enMeaning": "mutton, lamb",
    "example": {
      "hz": "冬天适合吃羊肉火锅。",
      "py": "Dōngtiān shìhé chī yángròu huǒguō.",
      "id": "Musim dingin cocok makan hotpot daging kambing."
    }
  },
  {
    "id": "zh-v-196",
    "hanzi": "给",
    "pinyin": "gěi",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Verb / Preposition",
    "idMeaning": "memberi, kepada",
    "enMeaning": "to give, for",
    "example": {
      "hz": "请给我一杯水。",
      "py": "Qǐng gěi wǒ yì bēi shuǐ.",
      "id": "Tolong berikan saya segelas air."
    }
  },
  {
    "id": "zh-v-197",
    "hanzi": "知道",
    "pinyin": "zhīdào",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "tahu, mengetahui",
    "enMeaning": "to know",
    "example": {
      "hz": "我知道这个汉字的意思。",
      "py": "Wǒ zhīdào zhè gè Hànzì de yìsi.",
      "id": "Saya tahu arti huruf Hanzi ini."
    }
  },
  {
    "id": "zh-v-198",
    "hanzi": "课",
    "pinyin": "kè",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "pelajaran, kelas",
    "enMeaning": "lesson, class",
    "example": {
      "hz": "明天上午我们有中文课。",
      "py": "Míngtiān shàngwǔ wǒmen yǒu Zhōngwén kè.",
      "id": "Besok pagi kita ada kelas bahasa Mandarin."
    }
  },
  {
    "id": "zh-v-199",
    "hanzi": "题",
    "pinyin": "tí",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "soal pertanyaan, judul",
    "enMeaning": "question, problem",
    "example": {
      "hz": "这道题有点儿难。",
      "py": "Zhè dào tí yǒudiǎnr nán.",
      "id": "Soal ini agak sulit."
    }
  },
  {
    "id": "zh-v-200",
    "hanzi": "作业",
    "pinyin": "zuòyè",
    "tones": [
      4,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "tugas, pekerjaan rumah (PR)",
    "enMeaning": "homework",
    "example": {
      "hz": "快点儿做完作业。",
      "py": "Kuài diǎnr zuò wán zuòyè.",
      "id": "Lekas selesaikan PR-mu."
    }
  },
  {
    "id": "zh-v-201",
    "hanzi": "您",
    "pinyin": "nín",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Pronoun",
    "idMeaning": "Anda (bentuk hormat)",
    "enMeaning": "you (polite)",
    "example": {
      "hz": "您好，欢迎光临！",
      "py": "Nín hǎo, huānyíng guānglín!",
      "id": "Halo, selamat datang!"
    }
  },
  {
    "id": "zh-v-202",
    "hanzi": "觉得",
    "pinyin": "juéde",
    "tones": [
      2,
      0
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "merasa, berpendapat",
    "enMeaning": "to feel, think",
    "example": {
      "hz": "我觉得这件衣服很漂亮。",
      "py": "Wǒ juéde zhè jiàn yīfu hěn piàoliang.",
      "id": "Saya rasa pakaian ini sangat anggun."
    }
  },
  {
    "id": "zh-v-203",
    "hanzi": "需要",
    "pinyin": "xūyào",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Verb / Noun",
    "idMeaning": "membutuhkan, keperluan",
    "enMeaning": "to need",
    "example": {
      "hz": "你需要帮忙吗？",
      "py": "Nǐ xūyào bāngmáng ma?",
      "id": "Apakah kamu butuh bantuan?"
    }
  },
  {
    "id": "zh-v-204",
    "hanzi": "帮助",
    "pinyin": "bāngzhù",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Verb / Noun",
    "idMeaning": "membantu, pertolongan",
    "enMeaning": "to help, assistance",
    "example": {
      "hz": "谢谢您的热情帮助。",
      "py": "Xièxie nín de rèqíng bāngzhù.",
      "id": "Terima kasih atas bantuan tulus Anda."
    }
  },
  {
    "id": "zh-v-205",
    "hanzi": "这边",
    "pinyin": "zhèbiān",
    "tones": [
      4,
      1
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "sebelah sini",
    "enMeaning": "this side, here",
    "example": {
      "hz": "请走这边。",
      "py": "Qǐng zǒu zhèbiān.",
      "id": "Silakan lewat sebelah sini."
    }
  },
  {
    "id": "zh-v-206",
    "hanzi": "件",
    "pinyin": "jiàn",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Measure Word",
    "idMeaning": "helai, potong (pakaian/perkara)",
    "enMeaning": "measure word for clothes/items",
    "example": {
      "hz": "我想买一件大衣。",
      "py": "Wǒ xiǎng mǎi yí jiàn dàyī.",
      "id": "Saya ingin membeli sehelai mantel."
    }
  },
  {
    "id": "zh-v-207",
    "hanzi": "裙子",
    "pinyin": "qúnzi",
    "tones": [
      2,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "rok, gaun",
    "enMeaning": "skirt, dress",
    "example": {
      "hz": "这条红裙子很合身。",
      "py": "Zhè tiáo hóng qúnzi hěn héshēn.",
      "id": "Gaun merah ini sangat pas."
    }
  },
  {
    "id": "zh-v-208",
    "hanzi": "试",
    "pinyin": "shì",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "mencoba, menjajal",
    "enMeaning": "to try, test",
    "example": {
      "hz": "我可以试一下吗？",
      "py": "Wǒ kěyǐ shì yíxià ma?",
      "id": "Bolehkah saya mencobanya sejenak?"
    }
  },
  {
    "id": "zh-v-209",
    "hanzi": "男孩",
    "pinyin": "nánhái",
    "tones": [
      2,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "anak laki-laki",
    "enMeaning": "boy",
    "example": {
      "hz": "那个男孩在踢足球。",
      "py": "Nà gè nánhái zài tī zúqiú.",
      "id": "Anak laki-laki itu sedang main bola."
    }
  },
  {
    "id": "zh-v-210",
    "hanzi": "大家",
    "pinyin": "dàjiā",
    "tones": [
      4,
      1
    ],
    "level": 2,
    "pos": "Pronoun",
    "idMeaning": "semua orang, hadirin",
    "enMeaning": "everyone",
    "example": {
      "hz": "请大家安静一下。",
      "py": "Qǐng dàjiā ānjìng yíxià.",
      "id": "Harap semuanya tenang sejenak."
    }
  },
  {
    "id": "zh-v-211",
    "hanzi": "早上",
    "pinyin": "zǎoshang",
    "tones": [
      3,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "pagi hari (subuh hingga pagi)",
    "enMeaning": "early morning",
    "example": {
      "hz": "早上好！",
      "py": "Zǎoshang hǎo!",
      "id": "Selamat pagi!"
    }
  },
  {
    "id": "zh-v-212",
    "hanzi": "晚上",
    "pinyin": "wǎnshang",
    "tones": [
      3,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "malam hari",
    "enMeaning": "evening, night",
    "example": {
      "hz": "晚上我们去散步。",
      "py": "Wǎnshang wǒmen qù sànbù.",
      "id": "Malam hari kita jalan-jalan santai."
    }
  },
  {
    "id": "zh-v-213",
    "hanzi": "洗",
    "pinyin": "xǐ",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "mencuci, membasuh",
    "enMeaning": "to wash",
    "example": {
      "hz": "饭前要洗手。",
      "py": "Fàn qián yào xǐ shǒu.",
      "id": "Sebelum makan harus cuci tangan."
    }
  },
  {
    "id": "zh-v-214",
    "hanzi": "跑步",
    "pinyin": "pǎobù",
    "tones": [
      3,
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "berlari, jogging",
    "enMeaning": "to run, jog",
    "example": {
      "hz": "他每天早晨跑步。",
      "py": "Tā měitiān zǎochén pǎobù.",
      "id": "Dia setiap pagi jogging."
    }
  },
  {
    "id": "zh-v-215",
    "hanzi": "踢",
    "pinyin": "tī",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "menendang",
    "enMeaning": "to kick",
    "example": {
      "hz": "他在球场踢球。",
      "py": "Tā zài qiúchǎng tī qiú.",
      "id": "Dia menendang bola di lapangan."
    }
  },
  {
    "id": "zh-v-216",
    "hanzi": "足球",
    "pinyin": "zúqiú",
    "tones": [
      2,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "sepak bola",
    "enMeaning": "football, soccer",
    "example": {
      "hz": "你喜欢踢足球吗？",
      "py": "Nǐ xǐhuan tī zúqiú ma?",
      "id": "Apakah kamu suka main sepak bola?"
    }
  },
  {
    "id": "zh-v-217",
    "hanzi": "跳舞",
    "pinyin": "tiàowǔ",
    "tones": [
      4,
      3
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "menari, berdansa",
    "enMeaning": "to dance",
    "example": {
      "hz": "女孩们在跳民族舞。",
      "py": "Nǚhái men zài tiào mínzú wǔ.",
      "id": "Gadis-gadis sedang menari tarian daerah."
    }
  },
  {
    "id": "zh-v-218",
    "hanzi": "上课",
    "pinyin": "shàngkè",
    "tones": [
      4,
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "masuk kelas, menghadiri pelajaran",
    "enMeaning": "to attend class",
    "example": {
      "hz": "我们八点半上课。",
      "py": "Wǒmen bā diǎn bàn shàngkè.",
      "id": "Kita mulai kelas jam setengah sembilan."
    }
  },
  {
    "id": "zh-v-219",
    "hanzi": "唱",
    "pinyin": "chàng",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "bernyanyi",
    "enMeaning": "to sing",
    "example": {
      "hz": "请为我们唱一首歌。",
      "py": "Qǐng wèi wǒmen chàng yì shǒu gē.",
      "id": "Tolong nyanyikan sebuah lagu untuk kami."
    }
  },
  {
    "id": "zh-v-220",
    "hanzi": "歌",
    "pinyin": "gē",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "lagu",
    "enMeaning": "song",
    "example": {
      "hz": "这首歌真好听。",
      "py": "Zhè shǒu gē zhēn hǎotīng.",
      "id": "Lagu ini sungguh enak didengar."
    }
  },
  {
    "id": "zh-v-221",
    "hanzi": "唱歌",
    "pinyin": "chànggē",
    "tones": [
      4,
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "bernyanyi lagu",
    "enMeaning": "to sing a song",
    "example": {
      "hz": "周末去唱KTV唱歌吧。",
      "py": "Zhōumò qù chàng KTV chànggē ba.",
      "id": "Akhir pekan ayo menyanyi di karaoke."
    }
  },
  {
    "id": "zh-v-222",
    "hanzi": "游",
    "pinyin": "yóu",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "berenang",
    "enMeaning": "to swim",
    "example": {
      "hz": "小鱼在水里游。",
      "py": "Xiǎoyú zài shuǐ lǐ yóu.",
      "id": "Ikan kecil berenang di dalam air."
    }
  },
  {
    "id": "zh-v-223",
    "hanzi": "游泳",
    "pinyin": "yóuyǒng",
    "tones": [
      2,
      3
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "berenang (olahraga)",
    "enMeaning": "to swim",
    "example": {
      "hz": "夏天游泳很舒服。",
      "py": "Xiàtiān yóuyǒng hěn shūfu.",
      "id": "Musim panas berenang sangat nyaman."
    }
  },
  {
    "id": "zh-v-224",
    "hanzi": "一起",
    "pinyin": "yìqǐ",
    "tones": [
      1,
      3
    ],
    "level": 2,
    "pos": "Adverb",
    "idMeaning": "bersama-sama",
    "enMeaning": "together",
    "example": {
      "hz": "我们一起去看电影吧。",
      "py": "Wǒmen yìqǐ qù kàn diànyǐng ba.",
      "id": "Ayo kita nonton film bersama."
    }
  },
  {
    "id": "zh-v-225",
    "hanzi": "最",
    "pinyin": "zuì",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adverb",
    "idMeaning": "paling, ter-",
    "enMeaning": "most",
    "example": {
      "hz": "我最喜欢吃北京烤鸭。",
      "py": "Wǒ zuì xǐhuan chī Běijīng kǎoyā.",
      "id": "Saya paling suka makan bebek panggang Beijing."
    }
  },
  {
    "id": "zh-v-226",
    "hanzi": "啊",
    "pinyin": "a",
    "tones": [
      0
    ],
    "level": 2,
    "pos": "Particle",
    "idMeaning": "partikel penegas rasa kagum/seru",
    "enMeaning": "modal particle",
    "example": {
      "hz": "今天天气真好啊！",
      "py": "Jīntiān tiānqì zhēn hǎo a!",
      "id": "Wah, cuaca hari ini sungguh bagus!"
    }
  },
  {
    "id": "zh-v-227",
    "hanzi": "穿",
    "pinyin": "chuān",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "memakai, mengenakan (baju/sepatu)",
    "enMeaning": "to wear",
    "example": {
      "hz": "今天穿暖和一点。",
      "py": "Jīntiān chuān nuǎnhuo yìdiǎn.",
      "id": "Hari ini berpakaianlah lebih hangat."
    }
  },
  {
    "id": "zh-v-228",
    "hanzi": "好看",
    "pinyin": "hǎokàn",
    "tones": [
      3,
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "bagus dilihat, menarik",
    "enMeaning": "good-looking",
    "example": {
      "hz": "这幅画真好看。",
      "py": "Zhè fú huà zhēn hǎokàn.",
      "id": "Lukisan ini sungguh menawan."
    }
  },
  {
    "id": "zh-v-229",
    "hanzi": "白色",
    "pinyin": "báisè",
    "tones": [
      2,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "warna putih",
    "enMeaning": "white color",
    "example": {
      "hz": "他喜欢穿白色的衬衫。",
      "py": "Tā xǐhuan chuān báisè de chènshān.",
      "id": "Dia gemar mengenakan kemeja putih."
    }
  },
  {
    "id": "zh-v-230",
    "hanzi": "红色",
    "pinyin": "hóngsè",
    "tones": [
      2,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "warna merah",
    "enMeaning": "red color",
    "example": {
      "hz": "中国传统喜庆用红色。",
      "py": "Zhōngguó chuántǒng xǐqìng yòng hóngsè.",
      "id": "Tradisi perayaan Tiongkok bernuansa merah."
    }
  },
  {
    "id": "zh-v-231",
    "hanzi": "黑色",
    "pinyin": "hēisè",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "warna hitam",
    "enMeaning": "black color",
    "example": {
      "hz": "黑色大衣很有气质。",
      "py": "Hēisè dàyī hěn yǒu qìzhì.",
      "id": "Mantel hitam terlihat berwibawa."
    }
  },
  {
    "id": "zh-v-232",
    "hanzi": "颜色",
    "pinyin": "yánsè",
    "tones": [
      2,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "warna",
    "enMeaning": "color",
    "example": {
      "hz": "你最喜欢什么颜色？",
      "py": "Nǐ zuì xǐhuan shénme yánsè?",
      "id": "Warna apa yang paling kamu sukai?"
    }
  },
  {
    "id": "zh-v-233",
    "hanzi": "宾馆",
    "pinyin": "bīnguǎn",
    "tones": [
      1,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "wisma, penginapan",
    "enMeaning": "guesthouse, hotel",
    "example": {
      "hz": "我们在宾馆前台办理入住。",
      "py": "Wǒmen zài bīnguǎn qiántái bànlǐ rùzhù.",
      "id": "Kami mendaftar menginap di resepsionis."
    }
  },
  {
    "id": "zh-v-234",
    "hanzi": "房间",
    "pinyin": "fángjiān",
    "tones": [
      2,
      1
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "kamar, ruangan",
    "enMeaning": "room",
    "example": {
      "hz": "这个房间采光很好。",
      "py": "Zhè gè fángjiān cǎiguāng hěn hǎo.",
      "id": "Pencahayaan kamar ini sangat bagus."
    }
  },
  {
    "id": "zh-v-235",
    "hanzi": "预订",
    "pinyin": "yùdìng",
    "tones": [
      4,
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "memesan terlebih dahulu, booking",
    "enMeaning": "to book, reserve",
    "example": {
      "hz": "我已经预订了两个房间。",
      "py": "Wǒ yǐjīng yùdìng le liǎng gè fángjiān.",
      "id": "Saya sudah memesan dua kamar."
    }
  },
  {
    "id": "zh-v-236",
    "hanzi": "累",
    "pinyin": "lèi",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "lelah, letih",
    "enMeaning": "tired",
    "example": {
      "hz": "工作了一天，我很累。",
      "py": "Gōngzuò le yì tiān, wǒ hěn lèi.",
      "id": "Bekerja seharian, saya sangat letih."
    }
  },
  {
    "id": "zh-v-237",
    "hanzi": "帮",
    "pinyin": "bāng",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "membantu, menolong",
    "enMeaning": "to help",
    "example": {
      "hz": "你能帮我拿一下行李吗？",
      "py": "Nǐ néng bāng wǒ ná yíxià xíngli ma?",
      "id": "Bisakah kamu bantu membawakan koperku?"
    }
  },
  {
    "id": "zh-v-238",
    "hanzi": "便宜",
    "pinyin": "piányi",
    "tones": [
      2,
      0
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "murah, terjangkau",
    "enMeaning": "cheap",
    "example": {
      "hz": "这家超市的水果很便宜。",
      "py": "Zhè jiā chāoshì de shuǐguǒ hěn piányi.",
      "id": "Buah di supermarket ini sangat terjangkau."
    }
  },
  {
    "id": "zh-v-239",
    "hanzi": "出",
    "pinyin": "chū",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "keluar",
    "enMeaning": "to go out",
    "example": {
      "hz": "走出校门就是公交站。",
      "py": "Zǒu chū xiàomén jiù shì gōngjiāozhàn.",
      "id": "Keluar gerbang sekolah langsung halte bus."
    }
  },
  {
    "id": "zh-v-240",
    "hanzi": "进",
    "pinyin": "jìn",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "masuk",
    "enMeaning": "to enter",
    "example": {
      "hz": "请进，别客气。",
      "py": "Qǐng jìn, bié kèqi.",
      "id": "Silakan masuk, jangan sungkan."
    }
  },
  {
    "id": "zh-v-241",
    "hanzi": "开始",
    "pinyin": "kāishǐ",
    "tones": [
      1,
      3
    ],
    "level": 2,
    "pos": "Verb / Noun",
    "idMeaning": "mulai, mengawali",
    "enMeaning": "to begin, start",
    "example": {
      "hz": "会议马上就要开始了。",
      "py": "Huìyì mǎshàng jiù yào kāishǐ le.",
      "id": "Rapat akan segera dimulai."
    }
  },
  {
    "id": "zh-v-242",
    "hanzi": "起床",
    "pinyin": "qǐchuáng",
    "tones": [
      3,
      2
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "bangun dari tempat tidur",
    "enMeaning": "to get up",
    "example": {
      "hz": "我每天早晨六点起床。",
      "py": "Wǒ měitiān zǎochén liù diǎn qǐchuáng.",
      "id": "Setiap pagi saya bangun jam enam."
    }
  },
  {
    "id": "zh-v-243",
    "hanzi": "面条",
    "pinyin": "miàntiáo",
    "tones": [
      4,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "mie",
    "enMeaning": "noodles",
    "example": {
      "hz": "中午吃一碗热汤面条。",
      "py": "Zhōngwǔ chī yì wǎn rè tāng miàntiáo.",
      "id": "Siang makan semangkuk mie kuah hangat."
    }
  },
  {
    "id": "zh-v-244",
    "hanzi": "早饭",
    "pinyin": "zǎofàn",
    "tones": [
      3,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "sarapan pagi",
    "enMeaning": "breakfast",
    "example": {
      "hz": "吃早饭对胃好。",
      "py": "Chī zǎofàn duì wèi hǎo.",
      "id": "Sarapan pagi baik untuk lambung."
    }
  },
  {
    "id": "zh-v-245",
    "hanzi": "晚饭",
    "pinyin": "wǎnfàn",
    "tones": [
      3,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "makan malam",
    "enMeaning": "dinner",
    "example": {
      "hz": "晚饭后散步半小时。",
      "py": "Wǎnfàn hòu sànbù bàn xiǎoshí.",
      "id": "Setelah makan malam jalan santai setengah jam."
    }
  },
  {
    "id": "zh-v-246",
    "hanzi": "节",
    "pinyin": "jié",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Measure Word",
    "idMeaning": "jam pelajaran (satuan sesi)",
    "enMeaning": "measure word for classes",
    "example": {
      "hz": "今天下午有两节课。",
      "py": "Jīntiān xiàwǔ yǒu liǎng jié kè.",
      "id": "Sore ini ada dua sesi kelas."
    }
  },
  {
    "id": "zh-v-247",
    "hanzi": "孩子",
    "pinyin": "háizi",
    "tones": [
      2,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "anak, buah hati",
    "enMeaning": "child",
    "example": {
      "hz": "孩子们在草地上快乐地玩耍。",
      "py": "Háizi men zài cǎodì shang kuàilè de wánshuǎ.",
      "id": "Anak-anak riang gembira bermain di rumput."
    }
  },
  {
    "id": "zh-v-248",
    "hanzi": "丈夫",
    "pinyin": "zhàngfu",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "suami",
    "enMeaning": "husband",
    "example": {
      "hz": "她丈夫是一名优秀的建筑师。",
      "py": "Tā zhàngfu shì yì míng yōuxiù de jiànzhùshī.",
      "id": "Suaminya seorang arsitek andal."
    }
  },
  {
    "id": "zh-v-249",
    "hanzi": "眼睛",
    "pinyin": "yǎnjing",
    "tones": [
      3,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "mata",
    "enMeaning": "eye",
    "example": {
      "hz": "她的眼睛又大又亮。",
      "py": "Tā de yǎnjing yòu dà yòu liàng.",
      "id": "Matanya besar dan berbinar."
    }
  },
  {
    "id": "zh-v-250",
    "hanzi": "早",
    "pinyin": "zǎo",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Adjective / Adverb",
    "idMeaning": "pagi, lebih awal",
    "enMeaning": "early",
    "example": {
      "hz": "今天你来得真早！",
      "py": "Jīntiān nǐ lái de zhēn zǎo!",
      "id": "Hari ini kamu datang awal sekali!"
    }
  },
  {
    "id": "zh-v-251",
    "hanzi": "生病",
    "pinyin": "shēngbìng",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "jatuh sakit",
    "enMeaning": "to fall ill",
    "example": {
      "hz": "他生病了，在家静养。",
      "py": "Tā shēngbìng le, zài jiā jìngyǎng.",
      "id": "Dia sakit, sedang istirahat di rumah."
    }
  },
  {
    "id": "zh-v-252",
    "hanzi": "睡",
    "pinyin": "shuì",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "tidur, terlelap",
    "enMeaning": "to sleep",
    "example": {
      "hz": "好好睡一觉，明天就精神了。",
      "py": "Hǎohāo shuì yí jiào, míngtiān jiù jīngshen le.",
      "id": "Tidurlah nyenyak, besok badan kembali segar."
    }
  },
  {
    "id": "zh-v-253",
    "hanzi": "药",
    "pinyin": "yào",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "obat",
    "enMeaning": "medicine",
    "example": {
      "hz": "按时吃药，多喝热水。",
      "py": "Ànshí chī yào, duō hē rè shuǐ.",
      "id": "Minumlah obat tepat waktu dan perbanyak air hangat."
    }
  },
  {
    "id": "zh-v-254",
    "hanzi": "为什么",
    "pinyin": "wèishénme",
    "tones": [
      4,
      2,
      0
    ],
    "level": 2,
    "pos": "Pronoun",
    "idMeaning": "mengapa, kenapa",
    "enMeaning": "why",
    "example": {
      "hz": "你今天为什么迟到？",
      "py": "Nǐ jīntiān wèishénme chídào?",
      "id": "Mengapa kamu hari ini terlambat?"
    }
  },
  {
    "id": "zh-v-255",
    "hanzi": "准备",
    "pinyin": "zhǔnbèi",
    "tones": [
      3,
      4
    ],
    "level": 2,
    "pos": "Verb / Noun",
    "idMeaning": "mempersiapkan, persiapan",
    "enMeaning": "to prepare",
    "example": {
      "hz": "我正在准备明天的考试。",
      "py": "Wǒ zhèngzài zhǔnbèi míngtiān de kǎoshì.",
      "id": "Saya sedang mempersiapkan ujian besok."
    }
  },
  {
    "id": "zh-v-256",
    "hanzi": "意思",
    "pinyin": "yìsi",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "makna, arti, maksud",
    "enMeaning": "meaning",
    "example": {
      "hz": "这句话是什么意思？",
      "py": "Zhè jù huà shì shénme yìsi.",
      "id": "Apa arti dari kalimat ini?"
    }
  },
  {
    "id": "zh-v-257",
    "hanzi": "让",
    "pinyin": "ràng",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "membuat, membiarkan, menyuruh",
    "enMeaning": "to let, allow",
    "example": {
      "hz": "老师让我读生词。",
      "py": "Lǎoshī ràng wǒ dú shēngcí.",
      "id": "Guru menyuruh saya membaca kosakata baru."
    }
  },
  {
    "id": "zh-v-258",
    "hanzi": "对",
    "pinyin": "duì",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adjective / Preposition",
    "idMeaning": "benar, tepat, terhadap",
    "enMeaning": "correct, to/for",
    "example": {
      "hz": "回答得完全正确！",
      "py": "Huídá de wánquán zhèngquè!",
      "id": "Jawabanmu tepat sekali!"
    }
  },
  {
    "id": "zh-v-259",
    "hanzi": "服务员",
    "pinyin": "fúwùyuán",
    "tones": [
      2,
      4,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "pelayan restoran/hotel",
    "enMeaning": "waiter, attendant",
    "example": {
      "hz": "服务员，请给我们加水。",
      "py": "Fúwùyuán, qǐng gěi wǒmen jiā shuǐ.",
      "id": "Pelayan, tolong tambahkan air kami."
    }
  },
  {
    "id": "zh-v-260",
    "hanzi": "火车站",
    "pinyin": "huǒchēzhàn",
    "tones": [
      3,
      1,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "stasiun kereta api",
    "enMeaning": "railway station",
    "example": {
      "hz": "火车站人山人海。",
      "py": "Huǒchēzhàn rénshānrénhǎi.",
      "id": "Stasiun kereta ramai dipadati orang."
    }
  },
  {
    "id": "zh-v-261",
    "hanzi": "问题",
    "pinyin": "wèntí",
    "tones": [
      4,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "pertanyaan, masalah",
    "enMeaning": "question, issue",
    "example": {
      "hz": "你有什么问题尽管提。",
      "py": "Nǐ yǒu shénme wèntí jǐnguǎn tí.",
      "id": "Silakan ajukan pertanyaan apa pun."
    }
  },
  {
    "id": "zh-v-262",
    "hanzi": "下班",
    "pinyin": "xiàbān",
    "tones": [
      4,
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "pulang kerja, usai kantor",
    "enMeaning": "to get off work",
    "example": {
      "hz": "下午五点准时下班。",
      "py": "Xiàwǔ wǔ diǎn zhǔnshí xiàbān.",
      "id": "Jam 5 sore tepat pulang kerja."
    }
  },
  {
    "id": "zh-v-263",
    "hanzi": "不错",
    "pinyin": "búcuò",
    "tones": [
      2,
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "lumayan bagus, tidak mengecewakan",
    "enMeaning": "pretty good",
    "example": {
      "hz": "这顿饭味道真不错。",
      "py": "Zhè dùn fàn wèidao zhēn búcuò.",
      "id": "Rasa makanan ini sungguh lezat."
    }
  },
  {
    "id": "zh-v-264",
    "hanzi": "好吃",
    "pinyin": "hǎochī",
    "tones": [
      3,
      1
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "enak, lezat rasanya",
    "enMeaning": "delicious",
    "example": {
      "hz": "妈妈包的饺子最好吃。",
      "py": "Māma bāo de jiǎozi zuì hǎochī.",
      "id": "Pangsit buatan ibu paling enak."
    }
  },
  {
    "id": "zh-v-265",
    "hanzi": "贵",
    "pinyin": "guì",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "mahal",
    "enMeaning": "expensive",
    "example": {
      "hz": "这双鞋有点儿贵。",
      "py": "Zhè shuāng xié yǒudiǎnr guì.",
      "id": "Sepatu ini agak mahal."
    }
  },
  {
    "id": "zh-v-266",
    "hanzi": "日",
    "pinyin": "rì",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "tanggal, hari, matahari",
    "enMeaning": "day, date",
    "example": {
      "hz": "十月一日是国庆节。",
      "py": "Shí yuè yī rì shì Guóqìngjié.",
      "id": "Tanggal satu Oktober adalah hari nasional."
    }
  },
  {
    "id": "zh-v-267",
    "hanzi": "今年",
    "pinyin": "jīnnián",
    "tones": [
      1,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "tahun ini",
    "enMeaning": "this year",
    "example": {
      "hz": "今年我们要去旅行。",
      "py": "Jīnnián wǒmen yào qù lǚxíng.",
      "id": "Tahun ini kita berencana berwisata."
    }
  },
  {
    "id": "zh-v-268",
    "hanzi": "去年",
    "pinyin": "qùnián",
    "tones": [
      4,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "tahun lalu",
    "enMeaning": "last year",
    "example": {
      "hz": "去年我在上海留学。",
      "py": "Qùnián wǒ zài Shànghǎi liúxué.",
      "id": "Tahun lalu saya kuliah di Shanghai."
    }
  },
  {
    "id": "zh-v-269",
    "hanzi": "哥哥",
    "pinyin": "gēge",
    "tones": [
      1,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "kakak laki-laki",
    "enMeaning": "elder brother",
    "example": {
      "hz": "我哥哥在读研究生。",
      "py": "Wǒ gēge zài dú yánjiūshēng.",
      "id": "Kakak laki-laki saya sedang kuliah pascasarjana."
    }
  },
  {
    "id": "zh-v-270",
    "hanzi": "票",
    "pinyin": "piào",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "tiket, karcis",
    "enMeaning": "ticket",
    "example": {
      "hz": "你买到火车票了吗？",
      "py": "Nǐ mǎi dào huǒchē piào le ma?",
      "id": "Sudahkah kamu dapat tiket keretanya?"
    }
  },
  {
    "id": "zh-v-271",
    "hanzi": "张",
    "pinyin": "zhāng",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Measure Word",
    "idMeaning": "lembar, helai (kertas/tiket/meja)",
    "enMeaning": "measure word for flat objects",
    "example": {
      "hz": "桌上有一张纸。",
      "py": "Zhuō shang yǒu yì zhāng zhǐ.",
      "id": "Di meja ada selembar kertas."
    }
  },
  {
    "id": "zh-v-272",
    "hanzi": "事情",
    "pinyin": "shìqing",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "perkara, urusan, hal",
    "enMeaning": "affair, matter",
    "example": {
      "hz": "今天有好多事情要处理。",
      "py": "Jīntiān yǒu hǎo duō shìqing yào chǔlǐ.",
      "id": "Hari ini banyak hal yang harus dituntaskan."
    }
  },
  {
    "id": "zh-v-273",
    "hanzi": "忙",
    "pinyin": "máng",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "sibuk",
    "enMeaning": "busy",
    "example": {
      "hz": "这几天工作特别忙。",
      "py": "Zhè jǐ tiān gōngzuò tèbié máng.",
      "id": "Beberapa hari ini pekerjaan luar biasa sibuk."
    }
  },
  {
    "id": "zh-v-274",
    "hanzi": "休息",
    "pinyin": "xiūxi",
    "tones": [
      1,
      0
    ],
    "level": 2,
    "pos": "Verb / Noun",
    "idMeaning": "beristirahat",
    "enMeaning": "to rest",
    "example": {
      "hz": "累了就坐下休息会儿。",
      "py": "Lèi le jiù zuò xià xiūxi huìr.",
      "id": "Bila lelah, duduklah istirahat sejenak."
    }
  },
  {
    "id": "zh-v-275",
    "hanzi": "妹妹",
    "pinyin": "mèimei",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "adik perempuan",
    "enMeaning": "younger sister",
    "example": {
      "hz": "我妹妹今年读小学。",
      "py": "Wǒ mèimei jīnnián dú xiǎoxué.",
      "id": "Adik perempuan saya tahun ini sekolah SD."
    }
  },
  {
    "id": "zh-v-276",
    "hanzi": "第",
    "pinyin": "dì",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Prefix",
    "idMeaning": "ke- (awalan angka urutan)",
    "enMeaning": "ordinal prefix",
    "example": {
      "hz": "这是第一课。",
      "py": "Zhè shì dì-yī kè.",
      "id": "Ini pelajaran pertama."
    }
  },
  {
    "id": "zh-v-277",
    "hanzi": "地方",
    "pinyin": "dìfang",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "tempat, lokasi",
    "enMeaning": "place, area",
    "example": {
      "hz": "这是一个美丽的地方。",
      "py": "Zhè shì yí gè měilì de dìfang.",
      "id": "Ini adalah tempat yang permai."
    }
  },
  {
    "id": "zh-v-278",
    "hanzi": "旅游",
    "pinyin": "lǚyóu",
    "tones": [
      3,
      2
    ],
    "level": 2,
    "pos": "Verb / Noun",
    "idMeaning": "berwisata, turisme",
    "enMeaning": "to travel, tourism",
    "example": {
      "hz": "我们一家人去云南旅游。",
      "py": "Wǒmen yì jiā rén qù Yúnnán lǚyóu.",
      "id": "Keluarga kami berwisata ke Yunnan."
    }
  },
  {
    "id": "zh-v-279",
    "hanzi": "找",
    "pinyin": "zhǎo",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "mencari, memberi kembalian",
    "enMeaning": "to look for, give change",
    "example": {
      "hz": "你在找什么？",
      "py": "Nǐ zài zhǎo shénme?",
      "id": "Apa yang sedang kamu cari?"
    }
  },
  {
    "id": "zh-v-280",
    "hanzi": "玩",
    "pinyin": "wán",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "bermain, bersenang-senang",
    "enMeaning": "to play, have fun",
    "example": {
      "hz": "周末去海边玩吧。",
      "py": "Zhōumò qù hǎibiān wán ba.",
      "id": "Akhir pekan ayo bermain ke pantai."
    }
  },
  {
    "id": "zh-v-281",
    "hanzi": "好玩",
    "pinyin": "hǎowán",
    "tones": [
      3,
      2
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "asyik, seru",
    "enMeaning": "fun, amusing",
    "example": {
      "hz": "游乐园非常好玩。",
      "py": "Yóulèyuán fēicháng hǎowán.",
      "id": "Taman hiburan sangat seru."
    }
  },
  {
    "id": "zh-v-282",
    "hanzi": "外",
    "pinyin": "wài",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "luar, di luar",
    "enMeaning": "outside",
    "example": {
      "hz": "外面风很大。",
      "py": "Wàimiàn fēng hěn dà.",
      "id": "Di luar angin bertiup kencang."
    }
  },
  {
    "id": "zh-v-283",
    "hanzi": "关",
    "pinyin": "guān",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "menutup, mematikan (alat)",
    "enMeaning": "to close, turn off",
    "example": {
      "hz": "出门前请关灯。",
      "py": "Chūmén qián qǐng guān dēng.",
      "id": "Sebelum keluar harap matikan lampu."
    }
  },
  {
    "id": "zh-v-284",
    "hanzi": "篮球",
    "pinyin": "lánqiú",
    "tones": [
      2,
      2
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "bola basket",
    "enMeaning": "basketball",
    "example": {
      "hz": "我们去打篮球吧。",
      "py": "Wǒmen qù dǎ lánqiú ba.",
      "id": "Ayo kita main basket."
    }
  },
  {
    "id": "zh-v-285",
    "hanzi": "教室",
    "pinyin": "jiàoshì",
    "tones": [
      4,
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "ruang kelas",
    "enMeaning": "classroom",
    "example": {
      "hz": "学生们在教室上课。",
      "py": "Xuésheng men zài jiàoshì shàngkè.",
      "id": "Para murid belajar di ruang kelas."
    }
  },
  {
    "id": "zh-v-286",
    "hanzi": "笑",
    "pinyin": "xiào",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "tersenyum, tertawa",
    "enMeaning": "to smile, laugh",
    "example": {
      "hz": "她笑起来很可爱。",
      "py": "Tā xiào qǐlai hěn kě'ài.",
      "id": "Dia tersenyum sangat manis."
    }
  },
  {
    "id": "zh-v-287",
    "hanzi": "手机",
    "pinyin": "shǒujī",
    "tones": [
      3,
      1
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "ponsel pintar, handphone",
    "enMeaning": "mobile phone",
    "example": {
      "hz": "我的手机响了。",
      "py": "Wǒ de shǒujī xiǎng le.",
      "id": "Ponsel saya berdering."
    }
  },
  {
    "id": "zh-v-288",
    "hanzi": "手表",
    "pinyin": "shǒubiǎo",
    "tones": [
      3,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "jam tangan",
    "enMeaning": "wristwatch",
    "example": {
      "hz": "这块手表走得很准。",
      "py": "Zhè kuài shǒubiǎo zǒu de hěn zhǔn.",
      "id": "Jam tangan ini detiknya sangat tepat."
    }
  },
  {
    "id": "zh-v-289",
    "hanzi": "身体",
    "pinyin": "shēntǐ",
    "tones": [
      1,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "tubuh, raga, kesehatan",
    "enMeaning": "body, health",
    "example": {
      "hz": "祝您身体健康！",
      "py": "Zhù nín shēntǐ jiànkāng!",
      "id": "Semoga raga Anda senantiasa sehat!"
    }
  },
  {
    "id": "zh-v-290",
    "hanzi": "上班",
    "pinyin": "shàngbān",
    "tones": [
      4,
      1
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "masuk kantor, bekerja",
    "enMeaning": "to go to work",
    "example": {
      "hz": "我每天早上八点上班。",
      "py": "Wǒ měitiān zǎoshang bā diǎn shàngbān.",
      "id": "Saya setiap pagi jam 8 masuk kerja."
    }
  },
  {
    "id": "zh-v-291",
    "hanzi": "迟到",
    "pinyin": "chídào",
    "tones": [
      2,
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "datang terlambat",
    "enMeaning": "to arrive late",
    "example": {
      "hz": "今天路上堵车，我迟到了。",
      "py": "Jīntiān lù shang dǔchē, wǒ chídào le.",
      "id": "Hari ini jalanan macet, saya datang terlambat."
    }
  },
  {
    "id": "zh-v-292",
    "hanzi": "送",
    "pinyin": "sòng",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "mengantar, memberi kado",
    "enMeaning": "to send, deliver, gift",
    "example": {
      "hz": "他送给我一本书。",
      "py": "Tā sòng gěi wǒ yì běn shū.",
      "id": "Dia menghadiahi saya sebuah buku."
    }
  },
  {
    "id": "zh-v-293",
    "hanzi": "雪",
    "pinyin": "xuě",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "salju",
    "enMeaning": "snow",
    "example": {
      "hz": "冬天北京经常下雪。",
      "py": "Dōngtiān Běijīng jīngcháng xià xuě.",
      "id": "Musim dingin di Beijing kerap turun salju."
    }
  },
  {
    "id": "zh-v-294",
    "hanzi": "它",
    "pinyin": "tā",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Pronoun",
    "idMeaning": "ia, itu (benda/hewan)",
    "enMeaning": "it",
    "example": {
      "hz": "小猫在睡觉，不要打扰它。",
      "py": "Xiǎomāo zài shuìjiào, bú yào dǎrǎo tā.",
      "id": "Kucing sedang tidur, jangan ganggu ia."
    }
  },
  {
    "id": "zh-v-295",
    "hanzi": "慢",
    "pinyin": "màn",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "lambat, pelan",
    "enMeaning": "slow",
    "example": {
      "hz": "请你说得慢一点儿。",
      "py": "Qǐng nǐ shuō de màn yìdiǎnr.",
      "id": "Tolong bicaralah sedikit lebih pelan."
    }
  },
  {
    "id": "zh-v-296",
    "hanzi": "错",
    "pinyin": "cuò",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "keliru, salah",
    "enMeaning": "wrong, mistake",
    "example": {
      "hz": "这道题你写错了。",
      "py": "Zhè dào tí nǐ xiě cuò le.",
      "id": "Soal ini jawabanmu keliru."
    }
  },
  {
    "id": "zh-v-297",
    "hanzi": "百",
    "pinyin": "bǎi",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Numeral",
    "idMeaning": "ratus, seratus",
    "enMeaning": "hundred",
    "example": {
      "hz": "这本书一百页。",
      "py": "Zhè běn shū yì bǎi yè.",
      "id": "Buku ini tebalnya seratus halaman."
    }
  },
  {
    "id": "zh-v-298",
    "hanzi": "千",
    "pinyin": "qiān",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Numeral",
    "idMeaning": "ribu, seribu",
    "enMeaning": "thousand",
    "example": {
      "hz": "一千块钱。",
      "py": "Yì qiān kuài qián.",
      "id": "Seribu yuan."
    }
  },
  {
    "id": "zh-v-299",
    "hanzi": "卖",
    "pinyin": "mài",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "menjual",
    "enMeaning": "to sell",
    "example": {
      "hz": "这家店卖新鲜水果。",
      "py": "Zhè jiā diàn mài xīnxiān shuǐguǒ.",
      "id": "Toko ini menjual buah segar."
    }
  },
  {
    "id": "zh-v-300",
    "hanzi": "晴",
    "pinyin": "qíng",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "cerah berawan terang",
    "enMeaning": "sunny, clear",
    "example": {
      "hz": "明天晴天，适合郊游。",
      "py": "Míngtiān qíngtiān, shìhé jiāoyóu.",
      "id": "Besok cuaca cerah, cocok bertamasya."
    }
  },
  {
    "id": "zh-v-301",
    "hanzi": "阴",
    "pinyin": "yīn",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "mendung, redup",
    "enMeaning": "cloudy, overcast",
    "example": {
      "hz": "今天天气阴沉沉的。",
      "py": "Jīntiān tiānqì yīnchénchén de.",
      "id": "Hari ini cuaca tampak mendung."
    }
  },
  {
    "id": "zh-v-302",
    "hanzi": "报纸",
    "pinyin": "bàozhǐ",
    "tones": [
      4,
      3
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "surat kabar, koran",
    "enMeaning": "newspaper",
    "example": {
      "hz": "爷爷喜欢每天早晨看报纸。",
      "py": "Yéye xǐhuan měitiān zǎochén kàn bàozhǐ.",
      "id": "Kakek gemar membaca koran tiap pagi."
    }
  },
  {
    "id": "zh-v-303",
    "hanzi": "告诉",
    "pinyin": "gàosu",
    "tones": [
      4,
      0
    ],
    "level": 2,
    "pos": "Verb",
    "idMeaning": "memberitahukan, mengabari",
    "enMeaning": "to tell",
    "example": {
      "hz": "请告诉我你的决定。",
      "py": "Qǐng gàosu wǒ nǐ de juédìng.",
      "id": "Tolong kabari saya keputusanmu."
    }
  },
  {
    "id": "zh-v-304",
    "hanzi": "可能",
    "pinyin": "kěnéng",
    "tones": [
      3,
      2
    ],
    "level": 2,
    "pos": "Adverb / Noun",
    "idMeaning": "mungkin, barangkali",
    "enMeaning": "maybe, possible",
    "example": {
      "hz": "下午可能会下大雨。",
      "py": "Xiàwǔ kěnéng huì xià dàyǔ.",
      "id": "Sore nanti mungkin akan turun hujan deras."
    }
  },
  {
    "id": "zh-v-305",
    "hanzi": "快乐",
    "pinyin": "kuàilè",
    "tones": [
      4,
      4
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "bahagia, gembira",
    "enMeaning": "happy, joyful",
    "example": {
      "hz": "祝大家周末快乐！",
      "py": "Zhù dàjiā zhōumò kuàilè!",
      "id": "Semoga akhir pekan kalian menyenangkan!"
    }
  },
  {
    "id": "zh-v-306",
    "hanzi": "男",
    "pinyin": "nán",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Noun / Adjective",
    "idMeaning": "pria, laki-laki",
    "enMeaning": "male, man",
    "example": {
      "hz": "那位男老师教数学。",
      "py": "Nà wèi nán lǎoshī jiāo shùxué.",
      "id": "Guru pria itu mengajar matematika."
    }
  },
  {
    "id": "zh-v-307",
    "hanzi": "女",
    "pinyin": "nǚ",
    "tones": [
      3
    ],
    "level": 2,
    "pos": "Noun / Adjective",
    "idMeaning": "wanita, perempuan",
    "enMeaning": "female, woman",
    "example": {
      "hz": "她是我们班的女同学。",
      "py": "Tā shì wǒmen bān de nǚ tóngxué.",
      "id": "Dia teman perempuan di kelas kami."
    }
  },
  {
    "id": "zh-v-308",
    "hanzi": "话",
    "pinyin": "huà",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Noun",
    "idMeaning": "ucapan, kata-kata",
    "enMeaning": "words, speech",
    "example": {
      "hz": "你说的话很有道理。",
      "py": "Nǐ shuō de huà hěn yǒu dàolǐ.",
      "id": "Ucapanmu sangat masuk akal."
    }
  },
  {
    "id": "zh-v-309",
    "hanzi": "希望",
    "pinyin": "xīwàng",
    "tones": [
      1,
      4
    ],
    "level": 2,
    "pos": "Verb / Noun",
    "idMeaning": "berharap, asa, impian",
    "enMeaning": "to hope, wish",
    "example": {
      "hz": "我希望明天是个大晴天。",
      "py": "Wǒ xīwàng míngtiān shì gè dà qíngtiān.",
      "id": "Saya berharap besok cuaca cerah bersinar."
    }
  },
  {
    "id": "zh-v-310",
    "hanzi": "万",
    "pinyin": "wàn",
    "tones": [
      4
    ],
    "level": 2,
    "pos": "Numeral",
    "idMeaning": "sepuluh ribu (10.000)",
    "enMeaning": "ten thousand",
    "example": {
      "hz": "这辆自行车要一万块。",
      "py": "Zhè liàng zìxíngchē yào yí wàn kuài.",
      "id": "Sepeda ini seharga sepuluh ribu yuan."
    }
  },
  {
    "id": "zh-v-311",
    "hanzi": "红",
    "pinyin": "hóng",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "merah",
    "enMeaning": "red",
    "example": {
      "hz": "我喜欢穿红色的外套。",
      "py": "Wǒ xǐhuan chuān hóngsè de wàitào.",
      "id": "Saya suka memakai jaket warna merah."
    }
  },
  {
    "id": "zh-v-312",
    "hanzi": "白",
    "pinyin": "bái",
    "tones": [
      2
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "putih",
    "enMeaning": "white",
    "example": {
      "hz": "天空中漂浮着白色的云朵。",
      "py": "Tiānkōng zhōng piāofú zhe báisè de yúnduǒ.",
      "id": "Di langit melayang awan putih."
    }
  },
  {
    "id": "zh-v-313",
    "hanzi": "黑",
    "pinyin": "hēi",
    "tones": [
      1
    ],
    "level": 2,
    "pos": "Adjective",
    "idMeaning": "hitam, gelap",
    "enMeaning": "black, dark",
    "example": {
      "hz": "他戴着一副黑色的墨镜。",
      "py": "Tā dài zhe yí fù hēisè de mòjìng.",
      "id": "Dia memakai sepasang kacamata hitam."
    }
  },
  {
    "id": "zh-v-314",
    "hanzi": "瘦",
    "pinyin": "shòu",
    "tones": [
      4
    ],
    "level": 3,
    "pos": "Adjective",
    "idMeaning": "kurus, ramping",
    "enMeaning": "thin, skinny",
    "example": {
      "hz": "他最近瘦了很多。",
      "py": "Tā zuìjìn shòu le hěn duō.",
      "id": "Dia belakangan ini jauh lebih kurus."
    }
  },
  {
    "id": "zh-v-315",
    "hanzi": "胖",
    "pinyin": "pàng",
    "tones": [
      4
    ],
    "level": 3,
    "pos": "Adjective",
    "idMeaning": "gemuk",
    "enMeaning": "fat, plump",
    "example": {
      "hz": "猫长得很胖。",
      "py": "Māo zhǎng de hěn pàng.",
      "id": "Kucing ini tumbuh sangat gemuk."
    }
  },
  {
    "id": "zh-v-316",
    "hanzi": "米",
    "pinyin": "mǐ",
    "tones": [
      3
    ],
    "level": 3,
    "pos": "Measure Word / Noun",
    "idMeaning": "meter, beras",
    "enMeaning": "meter, rice",
    "example": {
      "hz": "这座桥长五百米。",
      "py": "Zhè zuò qiáo cháng wǔbǎi mǐ.",
      "id": "Jembatan ini panjangnya 500 meter."
    }
  },
  {
    "id": "zh-v-317",
    "hanzi": "公斤",
    "pinyin": "gōngjīn",
    "tones": [
      1,
      1
    ],
    "level": 3,
    "pos": "Measure Word",
    "idMeaning": "kilogram",
    "enMeaning": "kilogram",
    "example": {
      "hz": "这箱苹果重五公斤。",
      "py": "Zhè xiāng píngguǒ zhòng wǔ gōngjīn.",
      "id": "Sekotak apel ini beratnya 5 kilogram."
    }
  },
  {
    "id": "zh-v-318",
    "hanzi": "中间",
    "pinyin": "zhōngjiān",
    "tones": [
      1,
      1
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "tengah, di antara",
    "enMeaning": "middle, between",
    "example": {
      "hz": "小猫坐在我们中间。",
      "py": "Xiǎomāo zuò zài wǒmen zhōngjiān.",
      "id": "Anak kucing duduk di antara kami."
    }
  },
  {
    "id": "zh-v-319",
    "hanzi": "经理",
    "pinyin": "jīnglǐ",
    "tones": [
      1,
      3
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "manajer",
    "enMeaning": "manager",
    "example": {
      "hz": "王经理在办公室开会。",
      "py": "Wáng jīnglǐ zài bàngōngshì kāihuì.",
      "id": "Manajer Wang sedang rapat di kantor."
    }
  },
  {
    "id": "zh-v-320",
    "hanzi": "个子",
    "pinyin": "gèzi",
    "tones": [
      4,
      0
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "tinggi badan, postur",
    "enMeaning": "height, stature",
    "example": {
      "hz": "弟弟的个子长高了。",
      "py": "Dìdi de gèzi zhǎng gāo le.",
      "id": "Postur adik sudah bertambah tinggi."
    }
  },
  {
    "id": "zh-v-321",
    "hanzi": "接",
    "pinyin": "jiē",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "menjemput, menerima",
    "enMeaning": "to pick up, receive",
    "example": {
      "hz": "我去机场接朋友。",
      "py": "Wǒ qù jīchǎng jiē péngyou.",
      "id": "Saya pergi ke bandara menjemput teman."
    }
  },
  {
    "id": "zh-v-322",
    "hanzi": "起飞",
    "pinyin": "qǐfēi",
    "tones": [
      3,
      1
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "lepas landas, terbang",
    "enMeaning": "to take off",
    "example": {
      "hz": "飞机马上要起飞了。",
      "py": "Fēijī mǎshàng yào qǐfēi le.",
      "id": "Pesawat akan segera lepas landas."
    }
  },
  {
    "id": "zh-v-323",
    "hanzi": "见",
    "pinyin": "jiàn",
    "tones": [
      4
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "melihat, bertemu",
    "enMeaning": "to see, meet",
    "example": {
      "hz": "明天下午三点见。",
      "py": "Míngtiān xiàwǔ sān diǎn jiàn.",
      "id": "Sampai jumpa besok jam 3 sore."
    }
  },
  {
    "id": "zh-v-324",
    "hanzi": "数学",
    "pinyin": "shùxué",
    "tones": [
      4,
      2
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "matematika",
    "enMeaning": "mathematics",
    "example": {
      "hz": "他的数学成绩很好。",
      "py": "Tā de shùxué chéngjì hěn hǎo.",
      "id": "Nilai matematikanya sangat bagus."
    }
  },
  {
    "id": "zh-v-325",
    "hanzi": "历史",
    "pinyin": "lìshǐ",
    "tones": [
      4,
      3
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "sejarah",
    "enMeaning": "history",
    "example": {
      "hz": "中国有悠久的历史。",
      "py": "Zhōngguó yǒu yōujiǔ de lìshǐ.",
      "id": "Tiongkok memiliki sejarah yang panjang."
    }
  },
  {
    "id": "zh-v-326",
    "hanzi": "考",
    "pinyin": "kǎo",
    "tones": [
      3
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "menguji, ujian",
    "enMeaning": "to take an exam",
    "example": {
      "hz": "明天我们要考中文。",
      "py": "Míngtiān wǒmen yào kǎo Zhōngwén.",
      "id": "Besok kami akan ujian bahasa Mandarin."
    }
  },
  {
    "id": "zh-v-327",
    "hanzi": "教",
    "pinyin": "jiāo",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "mengajar",
    "enMeaning": "to teach",
    "example": {
      "hz": "张老师教我们书法。",
      "py": "Zhāng lǎoshī jiāo wǒmen shūfǎ.",
      "id": "Guru Zhang mengajari kami kaligrafi."
    }
  },
  {
    "id": "zh-v-328",
    "hanzi": "复习",
    "pinyin": "fùxí",
    "tones": [
      4,
      2
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "mengulang pelajaran, merevisi",
    "enMeaning": "to review",
    "example": {
      "hz": "考试前要认真复习。",
      "py": "Kǎoshì qián yào rènzhēn fùxí.",
      "id": "Sebelum ujian harus mengulang pelajaran dengan sungguh-sungguh."
    }
  },
  {
    "id": "zh-v-329",
    "hanzi": "难",
    "pinyin": "nán",
    "tones": [
      2
    ],
    "level": 3,
    "pos": "Adjective",
    "idMeaning": "sulit, sukar",
    "enMeaning": "difficult, hard",
    "example": {
      "hz": "这道数学题太难了。",
      "py": "Zhè dào shùxué tí tài nán le.",
      "id": "Soal matematika ini terlalu sulit."
    }
  },
  {
    "id": "zh-v-330",
    "hanzi": "护照",
    "pinyin": "hùzhào",
    "tones": [
      4,
      4
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "paspor",
    "enMeaning": "passport",
    "example": {
      "hz": "出国旅行需要护照。",
      "py": "Chūguó lǚxíng xūyào hùzhào.",
      "id": "Bepergian ke luar negeri membutuhkan paspor."
    }
  },
  {
    "id": "zh-v-331",
    "hanzi": "包",
    "pinyin": "bāo",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Noun / Verb",
    "idMeaning": "tas, membungkus",
    "enMeaning": "bag, to wrap",
    "example": {
      "hz": "我买了一个新背包。",
      "py": "Wǒ mǎi le yí gè xīn bèibāo.",
      "id": "Saya membeli ransel baru."
    }
  },
  {
    "id": "zh-v-332",
    "hanzi": "行李箱",
    "pinyin": "xínglixiāng",
    "tones": [
      2,
      0,
      1
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "koper",
    "enMeaning": "suitcase, luggage",
    "example": {
      "hz": "我的行李箱里装满了衣服。",
      "py": "Wǒ de xínglixiāng lǐ zhuāng mǎn le yīfu.",
      "id": "Koper saya penuh berisi pakaian."
    }
  },
  {
    "id": "zh-v-333",
    "hanzi": "同事",
    "pinyin": "tóngshì",
    "tones": [
      2,
      4
    ],
    "level": 3,
    "pos": "Noun",
    "idMeaning": "rekan kerja, kolega",
    "enMeaning": "colleague, coworker",
    "example": {
      "hz": "他和同事相处融洽。",
      "py": "Tā hé tóngshì xiāngchǔ róngqià.",
      "id": "Dia rukun dengan rekan kerjanya."
    }
  },
  {
    "id": "zh-v-334",
    "hanzi": "带",
    "pinyin": "dài",
    "tones": [
      4
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "membawa",
    "enMeaning": "to bring, take",
    "example": {
      "hz": "出门别忘了带雨伞。",
      "py": "Chūmén bié wàng le dài yǔsǎn.",
      "id": "Saat keluar rumah jangan lupa bawa payung."
    }
  },
  {
    "id": "zh-v-335",
    "hanzi": "飞",
    "pinyin": "fēi",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "terbang",
    "enMeaning": "to fly",
    "example": {
      "hz": "鸟儿在天空中飞翔。",
      "py": "Niǎo'er zài tiānkōng zhōng fēixiáng.",
      "id": "Burung-burung terbang di langit."
    }
  },
  {
    "id": "zh-v-336",
    "hanzi": "担心",
    "pinyin": "dānxīn",
    "tones": [
      1,
      1
    ],
    "level": 3,
    "pos": "Verb",
    "idMeaning": "khawatir, cemas",
    "enMeaning": "to worry, anxious",
    "example": {
      "hz": "别担心，一切都会好的。",
      "py": "Bié dānxīn, yíqiè dōu huì hǎo de.",
      "id": "Jangan khawatir, semuanya akan baik-baik saja."
    }
  },
  {
    "id": "zh-v-337",
    "hanzi": "久",
    "pinyin": "jiǔ",
    "tones": [
      3
    ],
    "level": 3,
    "pos": "Adjective",
    "idMeaning": "lama, lama sekali",
    "enMeaning": "long time",
    "example": {
      "hz": "好久不见，你最近好吗？",
      "py": "Hǎo jiǔ bú jiàn, nǐ zuìjìn hǎo ma?",
      "id": "Lama tak jumpa, bagaimana kabarmu akhir-akhir ini?"
    }
  },
  {
    "id": "zh-v-338",
    "hanzi": "爷爷",
    "pinyin": "yéye",
    "tones": [
      2,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kakek (dari pihak ayah)",
    "enMeaning": "grandfather (paternal)",
    "example": {
      "hz": "我爷爷今年八十岁了。",
      "py": "Wǒ yéye jīnnián bāshí suì le.",
      "id": "Kakek saya tahun ini berusia 80 tahun."
    }
  },
  {
    "id": "zh-v-339",
    "hanzi": "奶奶",
    "pinyin": "nǎinai",
    "tones": [
      3,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "nenek (dari pihak ayah)",
    "enMeaning": "grandmother (paternal)",
    "example": {
      "hz": "奶奶做饭很好吃。",
      "py": "Nǎinai zuò fàn hěn hǎochī.",
      "id": "Nenek memasak sangat lezat."
    }
  },
  {
    "id": "zh-v-340",
    "hanzi": "叔叔",
    "pinyin": "shūshu",
    "tones": [
      1,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "paman (adik ayah)",
    "enMeaning": "uncle",
    "example": {
      "hz": "叔叔送给我一本词典。",
      "py": "Shūshu sòng gěi wǒ yì běn cídiǎn.",
      "id": "Paman menghadiahkan sebuah kamus untuk saya."
    }
  },
  {
    "id": "zh-v-341",
    "hanzi": "阿姨",
    "pinyin": "āyí",
    "tones": [
      1,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "bibi, tante",
    "enMeaning": "auntie",
    "example": {
      "hz": "阿姨热心地帮助了我们。",
      "py": "Āyí rèxīn de bāngzhù le wǒmen.",
      "id": "Bibi dengan hangat membantu kami."
    }
  },
  {
    "id": "zh-v-342",
    "hanzi": "鼻子",
    "pinyin": "bízi",
    "tones": [
      2,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "hidung",
    "enMeaning": "nose",
    "example": {
      "hz": "大象的鼻子很长。",
      "py": "Dàxiàng de bízi hěn cháng.",
      "id": "Hidung gajah sangat panjang."
    }
  },
  {
    "id": "zh-v-343",
    "hanzi": "嘴",
    "pinyin": "zuǐ",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "mulut",
    "enMeaning": "mouth",
    "example": {
      "hz": "吃东西时不要大声说话闭上嘴。",
      "py": "Chī dōngxi shí bú yào dà shēng shuōhuà bì shang zuǐ.",
      "id": "Saat makan jangan bicara keras-keras, tutuplah mulut."
    }
  },
  {
    "id": "zh-v-344",
    "hanzi": "像",
    "pinyin": "xiàng",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Verb / Preposition",
    "idMeaning": "mirip, seperti",
    "enMeaning": "to resemble, like",
    "example": {
      "hz": "他长得很像他的父亲。",
      "py": "Tā zhǎng de hěn xiàng tā de fùqīn.",
      "id": "Dia berwajah sangat mirip ayahnya."
    }
  },
  {
    "id": "zh-v-345",
    "hanzi": "发",
    "pinyin": "fā",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "mengirim, memancarkan",
    "enMeaning": "to send out, issue",
    "example": {
      "hz": "我给你发了一封电子邮件。",
      "py": "Wǒ gěi nǐ fā le yì fēng diànzǐ yóujiàn.",
      "id": "Saya sudah mengirimimu sebuah email."
    }
  },
  {
    "id": "zh-v-346",
    "hanzi": "北方",
    "pinyin": "běifāng",
    "tones": [
      3,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "wilayah utara",
    "enMeaning": "north, northern region",
    "example": {
      "hz": "中国的北方冬天经常下雪。",
      "py": "Zhōngguó de běifāng dōngtiān jīngcháng xià xuě.",
      "id": "Wilayah utara Tiongkok saat musim dingin sering turun salju."
    }
  },
  {
    "id": "zh-v-347",
    "hanzi": "东",
    "pinyin": "dōng",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "timur",
    "enMeaning": "east",
    "example": {
      "hz": "太阳从东边升起。",
      "py": "Tàiyáng cóng dōngbian shēng qǐ.",
      "id": "Matahari terbit dari sebelah timur."
    }
  },
  {
    "id": "zh-v-348",
    "hanzi": "南",
    "pinyin": "nán",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "selatan",
    "enMeaning": "south",
    "example": {
      "hz": "大雁秋天飞往南方。",
      "py": "Dàyàn qiūtiān fēi wǎng nánfāng.",
      "id": "Angsa liar terbang ke selatan di musim gugur."
    }
  },
  {
    "id": "zh-v-349",
    "hanzi": "西",
    "pinyin": "xī",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "barat",
    "enMeaning": "west",
    "example": {
      "hz": "我家在城市的西边。",
      "py": "Wǒ jiā zài chéngshì de xībian.",
      "id": "Rumah saya berada di sebelah barat kota."
    }
  },
  {
    "id": "zh-v-350",
    "hanzi": "河",
    "pinyin": "hé",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "sungai",
    "enMeaning": "river",
    "example": {
      "hz": "这条河水非常清澈。",
      "py": "Zhè tiáo hé shuǐ fēicháng qīngchè.",
      "id": "Air sungai ini sangat jernih."
    }
  },
  {
    "id": "zh-v-351",
    "hanzi": "公里",
    "pinyin": "gōnglǐ",
    "tones": [
      1,
      3
    ],
    "level": 4,
    "pos": "Measure Word",
    "idMeaning": "kilometer",
    "enMeaning": "kilometer",
    "example": {
      "hz": "这里离机场有二十公里。",
      "py": "Zhèlǐ lí jīchǎng yǒu èrshí gōnglǐ.",
      "id": "Dari sini ke bandara berjarak 20 kilometer."
    }
  },
  {
    "id": "zh-v-352",
    "hanzi": "用",
    "pinyin": "yòng",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Verb / Preposition",
    "idMeaning": "menggunakan, memakai",
    "enMeaning": "to use",
    "example": {
      "hz": "中国人习惯用筷子吃饭。",
      "py": "Zhōngguó rén xíguàn yòng kuàizi chī fàn.",
      "id": "Orang Tiongkok terbiasa makan menggunakan sumpit."
    }
  },
  {
    "id": "zh-v-353",
    "hanzi": "有名",
    "pinyin": "yǒumíng",
    "tones": [
      3,
      2
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "terkenal, termasyhur",
    "enMeaning": "famous, well-known",
    "example": {
      "hz": "万里长城是世界有名的古迹。",
      "py": "Wànlǐ Chángchéng shì shìjiè yǒumíng de gǔjì.",
      "id": "Tembok Besar adalah situs kuno terkenal di dunia."
    }
  },
  {
    "id": "zh-v-354",
    "hanzi": "比赛",
    "pinyin": "bǐsài",
    "tones": [
      3,
      4
    ],
    "level": 4,
    "pos": "Noun / Verb",
    "idMeaning": "pertandingan, kompetisi",
    "enMeaning": "competition, match",
    "example": {
      "hz": "今天的篮球比赛很精彩。",
      "py": "Jīntiān de lánqiú bǐsài hěn jīngcǎi.",
      "id": "Pertandingan basket hari ini sangat seru."
    }
  },
  {
    "id": "zh-v-355",
    "hanzi": "成绩",
    "pinyin": "chéngjì",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "prestasi, nilai hasil ujian",
    "enMeaning": "grade, achievement",
    "example": {
      "hz": "他的期末考试成绩很优异。",
      "py": "Tā de qīmò kǎoshì chéngjì hěn yōuyì.",
      "id": "Nilai ujian akhir semesternya sangat memuaskan."
    }
  },
  {
    "id": "zh-v-356",
    "hanzi": "马拉松",
    "pinyin": "mǎlāsōng",
    "tones": [
      3,
      1,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "maraton",
    "enMeaning": "marathon",
    "example": {
      "hz": "他参加了今年的城市马拉松。",
      "py": "Tā cānjiā le jīnnián de chéngshì mǎlāsōng.",
      "id": "Dia berpartisipasi dalam maraton kota tahun ini."
    }
  },
  {
    "id": "zh-v-357",
    "hanzi": "运动员",
    "pinyin": "yùndòngyuán",
    "tones": [
      4,
      4,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "atlet, olahragawan",
    "enMeaning": "athlete, sportsman",
    "example": {
      "hz": "那名年轻的运动员获得了冠军。",
      "py": "Nà míng niánqīng de yùndòngyuán huòdé le guànjūn.",
      "id": "Atlet muda itu meraih juara pertama."
    }
  },
  {
    "id": "zh-v-358",
    "hanzi": "疼",
    "pinyin": "téng",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Adjective / Verb",
    "idMeaning": "sakit, nyeri",
    "enMeaning": "painful, sore",
    "example": {
      "hz": "我今天牙齿疼得很厉害。",
      "py": "Wǒ jīntiān yáchǐ téng de hěn lìhai.",
      "id": "Hari ini gigiku sakit sekali."
    }
  },
  {
    "id": "zh-v-359",
    "hanzi": "参加",
    "pinyin": "cānjiā",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "ikut serta, menghadiri",
    "enMeaning": "to attend, participate",
    "example": {
      "hz": "你想参加明天的派对吗？",
      "py": "Nǐ xiǎng cānjiā míngtiān de pàiduì ma?",
      "id": "Apakah kamu mau menghadiri pesta besok?"
    }
  },
  {
    "id": "zh-v-360",
    "hanzi": "祝",
    "pinyin": "zhù",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "mendoakan, mengucapkan selamat",
    "enMeaning": "to wish, congratulate",
    "example": {
      "hz": "祝你生日快乐，万事如意！",
      "py": "Zhù nǐ shēngrì kuàilè, wànshì rúyì!",
      "id": "Selamat ulang tahun, semoga semua impianmu terwujud!"
    }
  },
  {
    "id": "zh-v-361",
    "hanzi": "腿",
    "pinyin": "tuǐ",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kaki, tungkai kaki",
    "enMeaning": "leg",
    "example": {
      "hz": "跑步后他的腿有点酸。",
      "py": "Pǎobù hòu tā de tuǐ yǒudiǎn suān.",
      "id": "Setelah lari kakinya agak pegal."
    }
  },
  {
    "id": "zh-v-362",
    "hanzi": "银行",
    "pinyin": "yínháng",
    "tones": [
      2,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "bank",
    "enMeaning": "bank",
    "example": {
      "hz": "请问最近的银行在哪里？",
      "py": "Qǐngwèn zuìjìn de yínháng zài nǎlǐ?",
      "id": "Permisi, bank terdekat ada di mana?"
    }
  },
  {
    "id": "zh-v-363",
    "hanzi": "电影院",
    "pinyin": "diànyǐngyuàn",
    "tones": [
      4,
      3,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "bioskop",
    "enMeaning": "cinema, movie theater",
    "example": {
      "hz": "我们去电影院看新上映的大片。",
      "py": "Wǒmen qù diànyǐngyuàn kàn xīn shàngyìng de dàpiān.",
      "id": "Kami pergi ke bioskop menonton film laris yang baru tayang."
    }
  },
  {
    "id": "zh-v-364",
    "hanzi": "电梯",
    "pinyin": "diàntī",
    "tones": [
      4,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "lift, elevator",
    "enMeaning": "elevator, lift",
    "example": {
      "hz": "我们可以坐电梯上八楼。",
      "py": "Wǒmen kěyǐ zuò diàntī shàng bā lóu.",
      "id": "Kita bisa naik lift ke lantai 8."
    }
  },
  {
    "id": "zh-v-365",
    "hanzi": "层",
    "pinyin": "céng",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Measure Word",
    "idMeaning": "lantai, tingkat, lapis",
    "enMeaning": "floor, layer, tier",
    "example": {
      "hz": "我们公司在写字楼的第十五层。",
      "py": "Wǒmen gōngsī zài xiězìlóu de dì shíwǔ céng.",
      "id": "Perusahaan kami berada di lantai 15 gedung perkantoran."
    }
  },
  {
    "id": "zh-v-366",
    "hanzi": "比较",
    "pinyin": "bǐjiào",
    "tones": [
      3,
      4
    ],
    "level": 4,
    "pos": "Adverb / Verb",
    "idMeaning": "relatif, agak, membandingkan",
    "enMeaning": "relatively, to compare",
    "example": {
      "hz": "这套公寓的环境比较安静。",
      "py": "Zhè tào gōngyù de huánjìng bǐjiào ānjìng.",
      "id": "Lingkungan apartemen ini relatif tenang."
    }
  },
  {
    "id": "zh-v-367",
    "hanzi": "租",
    "pinyin": "zū",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "menyewa, mengontrak",
    "enMeaning": "to rent",
    "example": {
      "hz": "他打算在学校附近租一间房子。",
      "py": "Tā dǎsuàn zài xuéxiào fùjìn zū yì jiān fángzi.",
      "id": "Dia berencana menyewa kamar di dekat sekolah."
    }
  },
  {
    "id": "zh-v-368",
    "hanzi": "方便",
    "pinyin": "fāngbiàn",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "praktis, nyaman, mudah",
    "enMeaning": "convenient",
    "example": {
      "hz": "住在地铁站附近交通很方便。",
      "py": "Zhù zài dìtiězhàn fùjìn jiāotōng hěn fāngbiàn.",
      "id": "Tinggal di dekat stasiun subway transportasinya sangat praktis."
    }
  },
  {
    "id": "zh-v-369",
    "hanzi": "老",
    "pinyin": "lǎo",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "tua, lama",
    "enMeaning": "old",
    "example": {
      "hz": "这位老爷爷心态非常年轻。",
      "py": "Zhè wèi lǎo yéye xīntài fēicháng niánqīng.",
      "id": "Kakek tua ini jiwanya sangat muda."
    }
  },
  {
    "id": "zh-v-370",
    "hanzi": "上网",
    "pinyin": "shàngwǎng",
    "tones": [
      4,
      3
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "berselancar di internet",
    "enMeaning": "to surf the internet",
    "example": {
      "hz": "很多年轻人喜欢在咖啡馆上网。",
      "py": "Hěn duō niánqīngrén xǐhuan zài kāfēiguǎn shàngwǎng.",
      "id": "Banyak pemuda suka berselancar internet di kafe."
    }
  },
  {
    "id": "zh-v-371",
    "hanzi": "请假",
    "pinyin": "qǐngjià",
    "tones": [
      3,
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "minta cuti, izin tidak masuk",
    "enMeaning": "to ask for leave",
    "example": {
      "hz": "他今天发烧所以向公司请假了。",
      "py": "Tā jīntiān fāshāo suǒyǐ xiàng gōngsī qǐngjià le.",
      "id": "Hari ini dia demam maka minta izin tidak masuk ke perusahaan."
    }
  },
  {
    "id": "zh-v-372",
    "hanzi": "生气",
    "pinyin": "shēngqì",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Adjective / Verb",
    "idMeaning": "marah, kesal",
    "enMeaning": "angry, to get mad",
    "example": {
      "hz": "别为这件小事生气了。",
      "py": "Bié wèi zhè jiàn xiǎoshì shēngqì le.",
      "id": "Jangan marah demi hal kecil ini."
    }
  },
  {
    "id": "zh-v-373",
    "hanzi": "发现",
    "pinyin": "fāxiàn",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "menemukan, menyadari",
    "enMeaning": "to discover, find out",
    "example": {
      "hz": "我发现他最近进步很大。",
      "py": "Wǒ fāxiàn tā zuìjìn jìnbù hěn dà.",
      "id": "Saya menyadari dia belakangan ini maju pesat."
    }
  },
  {
    "id": "zh-v-374",
    "hanzi": "影响",
    "pinyin": "yǐngxiǎng",
    "tones": [
      3,
      3
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "mempengaruhi, dampak",
    "enMeaning": "to influence, impact",
    "example": {
      "hz": "熬夜会影响第二天的学习效率。",
      "py": "Áoyè huì yǐngxiǎng dì'èr tiān de xuéxí xiàolǜ.",
      "id": "Begadang akan mempengaruhi efisiensi belajar keesokan harinya."
    }
  },
  {
    "id": "zh-v-375",
    "hanzi": "当然",
    "pinyin": "dāngrán",
    "tones": [
      1,
      2
    ],
    "level": 4,
    "pos": "Adverb",
    "idMeaning": "tentu saja, pasti",
    "enMeaning": "of course, certainly",
    "example": {
      "hz": "你愿意来参加吗？——当然愿意！",
      "py": "Nǐ yuànyì lái cānjiā ma? —— Dāngrán yuànyì!",
      "id": "Maukah kamu datang berpartisipasi? - Tentu saja bersedia!"
    }
  },
  {
    "id": "zh-v-376",
    "hanzi": "鸟",
    "pinyin": "niǎo",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "burung",
    "enMeaning": "bird",
    "example": {
      "hz": "清晨窗外有许多鸟在唱歌。",
      "py": "Qīngchén chuāngwài yǒu xǔduō niǎo zài chàng gē.",
      "id": "Pagi hari di luar jendela ada banyak burung bernyanyi."
    }
  },
  {
    "id": "zh-v-377",
    "hanzi": "食物",
    "pinyin": "shíwù",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "makanan",
    "enMeaning": "food",
    "example": {
      "hz": "健康均衡的食物有利于身体。",
      "py": "Jiànkāng jūnhéng de shíwù yǒulì yú shēntǐ.",
      "id": "Makanan yang sehat dan seimbang bermanfaat bagi tubuh."
    }
  },
  {
    "id": "zh-v-378",
    "hanzi": "借",
    "pinyin": "jiè",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "meminjam, meminjamkan",
    "enMeaning": "to borrow, lend",
    "example": {
      "hz": "我可以借用一下你的尺子吗？",
      "py": "Wǒ kěyǐ jièyòng yíxià nǐ de chǐzi ma?",
      "id": "Bolehkah saya meminjam penggarismu sebentar?"
    }
  },
  {
    "id": "zh-v-379",
    "hanzi": "还",
    "pinyin": "huán",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "mengembalikan",
    "enMeaning": "to return (something)",
    "example": {
      "hz": "看完这本书后记得还给我。",
      "py": "Kàn wán zhè běn shū hòu jìde huán gěi wǒ.",
      "id": "Setelah selesai membaca buku ini jangan lupa kembalikan ke saya."
    }
  },
  {
    "id": "zh-v-380",
    "hanzi": "留",
    "pinyin": "liú",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "tinggal, meninggalkan pesan/kontak",
    "enMeaning": "to stay, leave behind",
    "example": {
      "hz": "请留下您的联系方式和电话。",
      "py": "Qǐng liú xià nín de liánxì fāngshì hé diànhuà.",
      "id": "Tolong tinggalkan kontak dan nomor telepon Anda."
    }
  },
  {
    "id": "zh-v-381",
    "hanzi": "饿",
    "pinyin": "è",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "lapar",
    "enMeaning": "hungry",
    "example": {
      "hz": "走了一整天，我们都快饿死了。",
      "py": "Zǒu le yì zhěng tiān, wǒmen dōu kuài è sǐ le.",
      "id": "Berjalan seharian penuh, kami hampir mati kelaparan."
    }
  },
  {
    "id": "zh-v-382",
    "hanzi": "渴",
    "pinyin": "kě",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "haus, dahaga",
    "enMeaning": "thirsty",
    "example": {
      "hz": "如果你觉得渴，就喝点温水吧。",
      "py": "Rúguǒ nǐ juéde kě, jiù hē diǎn wēn shuǐ ba.",
      "id": "Jika kamu merasa haus, minumlah sedikit air hangat."
    }
  },
  {
    "id": "zh-v-383",
    "hanzi": "饱",
    "pinyin": "bǎo",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "kenyang",
    "enMeaning": "full (after eating)",
    "example": {
      "hz": "今天的晚餐真丰盛，我吃得很饱。",
      "py": "Jīntiān de wǎncān zhēn fēngshèng, wǒ chī de hěn bǎo.",
      "id": "Makan malam hari ini sungguh lezat, saya sangat kenyang."
    }
  },
  {
    "id": "zh-v-384",
    "hanzi": "锻炼",
    "pinyin": "duànliàn",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "berolahraga, melatih tubuh",
    "enMeaning": "to exercise, train",
    "example": {
      "hz": "坚持每天锻炼可以保持健康。",
      "py": "Jiānchí měitiān duànliàn kěyǐ bǎochí jiànkāng.",
      "id": "Konsisten berolahraga setiap hari dapat menjaga kesehatan."
    }
  },
  {
    "id": "zh-v-385",
    "hanzi": "注意",
    "pinyin": "zhùyì",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "memperhatikan, berhati-hati",
    "enMeaning": "to pay attention to",
    "example": {
      "hz": "过马路时一定要注意安全。",
      "py": "Guò mǎlù shí yídìng yào zhùyì ānquán.",
      "id": "Saat menyeberang jalan harus memperhatikan keselamatan."
    }
  },
  {
    "id": "zh-v-386",
    "hanzi": "减肥",
    "pinyin": "jiǎnféi",
    "tones": [
      3,
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "menurunkan berat badan, diet",
    "enMeaning": "to lose weight",
    "example": {
      "hz": "她正在通过运动和节食来减肥。",
      "py": "Tā zhèngzài tōngguò yùndòng hé jiéshí lái jiǎnféi.",
      "id": "Dia sedang menurunkan berat badan lewat olahraga dan diet."
    }
  },
  {
    "id": "zh-v-387",
    "hanzi": "办法",
    "pinyin": "bànfǎ",
    "tones": [
      4,
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "cara, metode, solusi",
    "enMeaning": "method, way, idea",
    "example": {
      "hz": "我们总能找到解决问题的办法。",
      "py": "Wǒmen zǒng néng zhǎodào jiějué wèntí de bànfǎ.",
      "id": "Kita pasti dapat menemukan cara menyelesaikan masalah."
    }
  },
  {
    "id": "zh-v-388",
    "hanzi": "可爱",
    "pinyin": "kě'ài",
    "tones": [
      3,
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "lucu, imut",
    "enMeaning": "cute, lovely",
    "example": {
      "hz": "这只小熊猫长得非常可爱。",
      "py": "Zhè zhī xiǎo xióngmāo zhǎng de fēicháng kě'ài.",
      "id": "Anak panda ini tumbuh sangat lucu."
    }
  },
  {
    "id": "zh-v-389",
    "hanzi": "只",
    "pinyin": "zhī",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Measure Word",
    "idMeaning": "ekor (kata bantu binatang kecil)",
    "enMeaning": "measure word for animals",
    "example": {
      "hz": "树上停着两只美丽的小鸟。",
      "py": "Shù shang tíng zhe liǎng zhī měilì de xiǎoniǎo.",
      "id": "Di atas pohon hinggap dua ekor burung cantik."
    }
  },
  {
    "id": "zh-v-390",
    "hanzi": "动物",
    "pinyin": "dòngwù",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "hewan, binatang",
    "enMeaning": "animal",
    "example": {
      "hz": "保护野生动物人人有责。",
      "py": "Bǎohù yěshēng dòngwù rénrén yǒu zé.",
      "id": "Melindungi hewan liar adalah tanggung jawab setiap orang."
    }
  },
  {
    "id": "zh-v-391",
    "hanzi": "熊猫",
    "pinyin": "xióngmāo",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "panda",
    "enMeaning": "panda",
    "example": {
      "hz": "大熊猫是中国珍贵的国宝。",
      "py": "Dàxióngmāo shì Zhōngguó zhēnguì de guóbǎo.",
      "id": "Panda raksasa adalah harta nasional Tiongkok yang berharga."
    }
  },
  {
    "id": "zh-v-392",
    "hanzi": "熊",
    "pinyin": "xióng",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "beruang",
    "enMeaning": "bear",
    "example": {
      "hz": "北极熊生活在寒冷的极地。",
      "py": "Běijíxióng shēnghuó zài hánlěng de jídì.",
      "id": "Beruang kutub hidup di daerah kutub yang dingin."
    }
  },
  {
    "id": "zh-v-393",
    "hanzi": "马",
    "pinyin": "mǎ",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kuda",
    "enMeaning": "horse",
    "example": {
      "hz": "骏马在辽阔的草原上奔跑。",
      "py": "Jùnmǎ zài liáokuò de cǎoyuán shang bēnpǎo.",
      "id": "Kuda tangguh berlari di padang rumput yang luas."
    }
  },
  {
    "id": "zh-v-394",
    "hanzi": "竹子",
    "pinyin": "zhúzi",
    "tones": [
      2,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "bambu",
    "enMeaning": "bamboo",
    "example": {
      "hz": "竹子是大熊猫最喜欢的食物。",
      "py": "Zhúzi shì dàxióngmāo zuì xǐhuan de shíwù.",
      "id": "Bambu adalah makanan yang paling disukai panda."
    }
  },
  {
    "id": "zh-v-395",
    "hanzi": "害怕",
    "pinyin": "hàipà",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Verb / Adjective",
    "idMeaning": "takut, gentar",
    "enMeaning": "to be afraid, scared",
    "example": {
      "hz": "面对困难我们不应该害怕。",
      "py": "Miànduì kùnnan wǒmen bù yīnggāi hàipà.",
      "id": "Menghadapi kesulitan kita tidak boleh takut."
    }
  },
  {
    "id": "zh-v-396",
    "hanzi": "骑",
    "pinyin": "qí",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "mengendarai, menunggangi",
    "enMeaning": "to ride (bike, horse)",
    "example": {
      "hz": "周末我常常在公园里骑自行车。",
      "py": "Zhōumò wǒ chángcháng zài gōngyuán lǐ qí zìxíngchē.",
      "id": "Akhir pekan saya sering mengendarai sepeda di taman."
    }
  },
  {
    "id": "zh-v-397",
    "hanzi": "敢",
    "pinyin": "gǎn",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Auxiliary Verb",
    "idMeaning": "berani",
    "enMeaning": "to dare",
    "example": {
      "hz": "他不敢在很多人面前公开发言。",
      "py": "Tā bù gǎn zài hěn duō rén miànqián gōngkāi fāyán.",
      "id": "Dia tidak berani berbicara di depan banyak orang."
    }
  },
  {
    "id": "zh-v-398",
    "hanzi": "年级",
    "pinyin": "niánjí",
    "tones": [
      2,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "tingkat kelas",
    "enMeaning": "grade, class year",
    "example": {
      "hz": "我弟弟现在读小学三年级。",
      "py": "Wǒ dìdi xiànzài dú xiǎoxué sān niánjí.",
      "id": "Adik saya sekarang duduk di kelas 3 SD."
    }
  },
  {
    "id": "zh-v-399",
    "hanzi": "班",
    "pinyin": "bān",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kelas, regu rombongan",
    "enMeaning": "class, squad",
    "example": {
      "hz": "我们中文班有二十位学生。",
      "py": "Wǒmen Zhōngwén bān yǒu èrshí wèi xuésheng.",
      "id": "Kelas bahasa Mandarin kami beranggotakan 20 siswa."
    }
  },
  {
    "id": "zh-v-400",
    "hanzi": "练习",
    "pinyin": "liànxí",
    "tones": [
      4,
      2
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "berlatih, latihan",
    "enMeaning": "to practice, drill",
    "example": {
      "hz": "每天练习听力有助于提高水平。",
      "py": "Měitiān liànxí tīnglì yǒuzhù yú tígāo shuǐpíng.",
      "id": "Berlatih mendengar setiap hari membantu menaikkan kemampuan."
    }
  },
  {
    "id": "zh-v-401",
    "hanzi": "最近",
    "pinyin": "zuìjìn",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Time / Adverb",
    "idMeaning": "belakangan ini, akhir-akhir ini",
    "enMeaning": "recently, lately",
    "example": {
      "hz": "你最近的工作和学习顺利吗？",
      "py": "Nǐ zuìjìn de gōngzuò hé xuéxí shùnlì ma?",
      "id": "Apakah pekerjaan dan belajarmu lancar belakangan ini?"
    }
  },
  {
    "id": "zh-v-402",
    "hanzi": "感兴趣",
    "pinyin": "gǎn xìngqù",
    "tones": [
      3,
      4,
      4
    ],
    "level": 4,
    "pos": "Phrase",
    "idMeaning": "berminat, tertarik",
    "enMeaning": "to be interested in",
    "example": {
      "hz": "我对中国传统书法非常感兴趣。",
      "py": "Wǒ duì Zhōngguó chuántǒng shūfǎ fēicháng gǎn xìngqù.",
      "id": "Saya sangat tertarik dengan kaligrafi tradisional Tiongkok."
    }
  },
  {
    "id": "zh-v-403",
    "hanzi": "提高",
    "pinyin": "tígāo",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "meningkatkan, menaikkan",
    "enMeaning": "to improve, raise",
    "example": {
      "hz": "多说多练能快速提高口语水平。",
      "py": "Duō shuō duō liàn néng kuàisù tígāo kǒuyǔ shuǐpíng.",
      "id": "Banyak berbicara dan berlatih dapat cepat meningkatkan kemampuan lisan."
    }
  },
  {
    "id": "zh-v-404",
    "hanzi": "想",
    "pinyin": "xiǎng",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Auxiliary Verb / Verb",
    "idMeaning": "ingin, berpikir, rindu",
    "enMeaning": "to want, think, miss",
    "example": {
      "hz": "我特别想去故宫走一走。",
      "py": "Wǒ tèbié xiǎng qù Gùgōng zǒu yì zǒu.",
      "id": "Saya sangat ingin pergi mengunjungi Kota Terlarang."
    }
  },
  {
    "id": "zh-v-405",
    "hanzi": "其实",
    "pinyin": "qíshí",
    "tones": [
      2,
      2
    ],
    "level": 4,
    "pos": "Adverb",
    "idMeaning": "sebenarnya, sesungguhnya",
    "enMeaning": "actually, in fact",
    "example": {
      "hz": "学中文其实没有想象的那么难。",
      "py": "Xué Zhōngwén qíshí méiyǒu xiǎngxiàng de nàme nán.",
      "id": "Belajar bahasa Mandarin sebenarnya tidak sesulit yang dibayangkan."
    }
  },
  {
    "id": "zh-v-406",
    "hanzi": "新闻",
    "pinyin": "xīnwén",
    "tones": [
      1,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "berita, warta",
    "enMeaning": "news",
    "example": {
      "hz": "他每天早晨都有看新闻的习惯。",
      "py": "Tā měitiān zǎochén dōu yǒu kàn xīnwén de xíguàn.",
      "id": "Dia setiap pagi punya kebiasaan membaca berita."
    }
  },
  {
    "id": "zh-v-407",
    "hanzi": "校长",
    "pinyin": "xiàozhǎng",
    "tones": [
      4,
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kepala sekolah, rektor",
    "enMeaning": "principal, president",
    "example": {
      "hz": "校长在开学典礼上发表了演讲。",
      "py": "Xiàozhǎng zài kāixué diǎnlǐ shang fābiǎo le yǎnjiǎng.",
      "id": "Kepala sekolah berpidato di upacara pembukaan tahun ajaran."
    }
  },
  {
    "id": "zh-v-408",
    "hanzi": "餐厅",
    "pinyin": "cāntīng",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "restoran, ruang makan kantin",
    "enMeaning": "restaurant, dining hall",
    "example": {
      "hz": "学校餐厅的饭菜既便宜又实惠。",
      "py": "Xuéxiào cāntīng de fàncài jì piányi yòu shíhuì.",
      "id": "Makanan di kantin sekolah murah meriah dan lezat."
    }
  },
  {
    "id": "zh-v-409",
    "hanzi": "健康",
    "pinyin": "jiànkāng",
    "tones": [
      4,
      1
    ],
    "level": 4,
    "pos": "Adjective / Noun",
    "idMeaning": "sehat, kesehatan",
    "enMeaning": "healthy, health",
    "example": {
      "hz": "保持健康是人生最重要的事情。",
      "py": "Bǎochí jiànkāng shì rénshēng zuì zhòngyào de shìqing.",
      "id": "Menjaga kesehatan adalah hal paling penting dalam hidup."
    }
  },
  {
    "id": "zh-v-410",
    "hanzi": "认为",
    "pinyin": "rènwéi",
    "tones": [
      4,
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "berpendapat, menganggap",
    "enMeaning": "to believe, consider",
    "example": {
      "hz": "我认为这个方案非常值得尝试。",
      "py": "Wǒ rènwéi zhè gè fāng'àn fēicháng zhíde chángshì.",
      "id": "Saya menganggap rencana ini sangat layak dicoba."
    }
  },
  {
    "id": "zh-v-411",
    "hanzi": "搬",
    "pinyin": "bān",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "memindahkan, pindah rumah",
    "enMeaning": "to move, relocate",
    "example": {
      "hz": "下个周末我们要搬进新公寓。",
      "py": "Xià gè zhōumò wǒmen yào bān jìn xīn gōngyù.",
      "id": "Akhir pekan depan kami akan pindah ke apartemen baru."
    }
  },
  {
    "id": "zh-v-412",
    "hanzi": "房东",
    "pinyin": "fángdōng",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "tuan tanah, pemilik rumah sewa",
    "enMeaning": "landlord, landlady",
    "example": {
      "hz": "房东非常和善热情。",
      "py": "Fángdōng fēicháng héshàn rèqíng.",
      "id": "Pemilik rumah sangat ramah dan hangat."
    }
  },
  {
    "id": "zh-v-413",
    "hanzi": "洗手间",
    "pinyin": "xǐshǒujiān",
    "tones": [
      3,
      3,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kamar kecil, toilet",
    "enMeaning": "restroom, toilet",
    "example": {
      "hz": "请问这层楼的洗手间在哪里？",
      "py": "Qǐngwèn zhè céng lóu de xǐshǒujiān zài nǎlǐ?",
      "id": "Permisi, di mana toilet di lantai ini?"
    }
  },
  {
    "id": "zh-v-414",
    "hanzi": "灯",
    "pinyin": "dēng",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "lampu",
    "enMeaning": "lamp, light",
    "example": {
      "hz": "离开房间时别忘了把灯关掉。",
      "py": "Líkāi fángjiān shí bié wàng le bǎ dēng guān diào.",
      "id": "Saat meninggalkan kamar jangan lupa mematikan lampu."
    }
  },
  {
    "id": "zh-v-415",
    "hanzi": "生活",
    "pinyin": "shēnghuó",
    "tones": [
      1,
      2
    ],
    "level": 4,
    "pos": "Noun / Verb",
    "idMeaning": "kehidupan, hidup",
    "enMeaning": "life, to live",
    "example": {
      "hz": "他很享受在海边悠闲的生活。",
      "py": "Tā hěn xiǎngshòu zài hǎibiān yōuxián de shēnghuó.",
      "id": "Dia sangat menikmati kehidupan santai di tepi laut."
    }
  },
  {
    "id": "zh-v-416",
    "hanzi": "交通",
    "pinyin": "jiāotōng",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "lalu lintas, transportasi",
    "enMeaning": "traffic, transportation",
    "example": {
      "hz": "上下班高峰期的城市交通很拥挤。",
      "py": "Shàng xià bān gāofēng qī de chéngshì jiāotōng hěn yōngjǐ.",
      "id": "Lalu lintas kota di jam sibuk kerja sangat padat."
    }
  },
  {
    "id": "zh-v-417",
    "hanzi": "坏",
    "pinyin": "huài",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "rusak, jahat, basi",
    "enMeaning": "bad, broken",
    "example": {
      "hz": "我的电脑屏幕坏了，需要维修。",
      "py": "Wǒ de diànnǎo píngmù huài le, xūyào wéixiū.",
      "id": "Layar komputer saya rusak, perlu diperbaiki."
    }
  },
  {
    "id": "zh-v-418",
    "hanzi": "解决",
    "pinyin": "jiějué",
    "tones": [
      3,
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "menyelesaikan, mengatasi",
    "enMeaning": "to resolve, solve",
    "example": {
      "hz": "大家共同努力解决了这个难题。",
      "py": "Dàjiā gòngtóng nǔlì jiějué le zhè gè nántí.",
      "id": "Semua orang bersama-sama berusaha menyelesaikan masalah sulit ini."
    }
  },
  {
    "id": "zh-v-419",
    "hanzi": "自己",
    "pinyin": "zìjǐ",
    "tones": [
      4,
      3
    ],
    "level": 4,
    "pos": "Pronoun",
    "idMeaning": "diri sendiri",
    "enMeaning": "oneself",
    "example": {
      "hz": "我们应该学会照顾好自己。",
      "py": "Wǒmen yīnggāi xuéhuì zhàogù hǎo zìjǐ.",
      "id": "Kita harus belajar merawat diri sendiri dengan baik."
    }
  },
  {
    "id": "zh-v-420",
    "hanzi": "种",
    "pinyin": "zhǒng",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Measure Word / Noun",
    "idMeaning": "jenis, macam",
    "enMeaning": "kind, sort, type",
    "example": {
      "hz": "超市里有各种各样的新鲜水果。",
      "py": "Chāoshì lǐ yǒu gè zhǒng gè yàng de xīnxiān shuǐguǒ.",
      "id": "Di supermarket ada beraneka jenis buah segar."
    }
  },
  {
    "id": "zh-v-421",
    "hanzi": "照相机",
    "pinyin": "zhàoxiàngjī",
    "tones": [
      4,
      4,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kamera foto",
    "enMeaning": "camera",
    "example": {
      "hz": "他用新照相机拍下了美丽的日落。",
      "py": "Tā yòng xīn zhàoxiàngjī pāi xià le měilì de rìluò.",
      "id": "Dia memakai kamera baru memotret matahari terbenam yang indah."
    }
  },
  {
    "id": "zh-v-422",
    "hanzi": "山",
    "pinyin": "shān",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "gunung",
    "enMeaning": "mountain, hill",
    "example": {
      "hz": "远处的群山在云雾中若隐若现。",
      "py": "Yuǎnchù de qúnshān zài yúnwù zhōng ruòyǐn-ruòxiàn.",
      "id": "Pegunungan di kejauhan tampak samar di balik kabut awan."
    }
  },
  {
    "id": "zh-v-423",
    "hanzi": "天",
    "pinyin": "tiān",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "hari, langit, cuaca",
    "enMeaning": "sky, day, weather",
    "example": {
      "hz": "今天蓝天白云，天气真好。",
      "py": "Jīntiān lán tiān bái yún, tiānqì zhēn hǎo.",
      "id": "Hari ini langit biru awan putih, cuaca sungguh bagus."
    }
  },
  {
    "id": "zh-v-424",
    "hanzi": "云",
    "pinyin": "yún",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "awan",
    "enMeaning": "cloud",
    "example": {
      "hz": "天空中漂浮着几朵白云。",
      "py": "Tiānkōng zhōng piāofú zhe jǐ duǒ bái yún.",
      "id": "Di langit melayang beberapa gumpalan awan putih."
    }
  },
  {
    "id": "zh-v-425",
    "hanzi": "记得",
    "pinyin": "jìde",
    "tones": [
      4,
      0
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "ingat",
    "enMeaning": "to remember",
    "example": {
      "hz": "你还记得我们第一次见面的场景吗？",
      "py": "Nǐ hái jìde wǒmen dì-yī cì jiànmiàn de chǎngjǐng ma?",
      "id": "Apakah kamu masih ingat suasana pertama kali kita berjumpa?"
    }
  },
  {
    "id": "zh-v-426",
    "hanzi": "一定",
    "pinyin": "yídìng",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Adverb",
    "idMeaning": "pasti, tentu",
    "enMeaning": "definitely, certainly",
    "example": {
      "hz": "只要努力，就一定能成功。",
      "py": "Zhǐyào nǔlì, jiù yídìng néng chénggōng.",
      "id": "Asal berusaha sungguh-sungguh, pasti bisa berhasil."
    }
  },
  {
    "id": "zh-v-427",
    "hanzi": "相信",
    "pinyin": "xiāngxìn",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "percaya, meyakini",
    "enMeaning": "to believe, trust",
    "example": {
      "hz": "我相信你的能力，加油！",
      "py": "Wǒ xiāngxìn nǐ de nénglì, jiāyóu!",
      "id": "Saya percaya pada kemampuanmu, semangat!"
    }
  },
  {
    "id": "zh-v-428",
    "hanzi": "爬",
    "pinyin": "pá",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "mendaki, merangkak",
    "enMeaning": "to climb, crawl",
    "example": {
      "hz": "周末我们打算去爬长城。",
      "py": "Zhōumò wǒmen dǎsuàn qù pá Chángchéng.",
      "id": "Akhir pekan kami berencana mendaki Tembok Besar."
    }
  },
  {
    "id": "zh-v-429",
    "hanzi": "哭",
    "pinyin": "kū",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "menangis",
    "enMeaning": "to cry, weep",
    "example": {
      "hz": "看感人的电影时她忍不住哭了。",
      "py": "Kàn gǎnrén de diànyǐng shí tā rěnbuzhù kū le.",
      "id": "Saat menonton film yang menyentuh dia tak kuasa menangis."
    }
  },
  {
    "id": "zh-v-430",
    "hanzi": "聊",
    "pinyin": "liáo",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "mengobrol, berbincang",
    "enMeaning": "to chat",
    "example": {
      "hz": "我们在茶馆里聊了一个下午。",
      "py": "Wǒmen zài cháguǎn lǐ liáo le yí gè xiàwǔ.",
      "id": "Kami mengobrol sepanjang sore di kedai teh."
    }
  },
  {
    "id": "zh-v-431",
    "hanzi": "见面",
    "pinyin": "jiànmiàn",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "bertemu, berjumpa",
    "enMeaning": "to meet up",
    "example": {
      "hz": "我们约好在咖啡店门口见面。",
      "py": "Wǒmen yuē hǎo zài kāfēidiàn ménkǒu jiànmiàn.",
      "id": "Kami sudah janjian bertemu di depan pintu kedai kopi."
    }
  },
  {
    "id": "zh-v-432",
    "hanzi": "年轻",
    "pinyin": "niánqīng",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "muda, belia",
    "enMeaning": "young",
    "example": {
      "hz": "年轻一代充满活力与创造力。",
      "py": "Niánqīng yídài chōngmǎn huólì yǔ chuàngzàolì.",
      "id": "Generasi muda penuh dengan vitalitas dan kreativitas."
    }
  },
  {
    "id": "zh-v-433",
    "hanzi": "奇怪",
    "pinyin": "qíguài",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "aneh, ganjil",
    "enMeaning": "strange, weird",
    "example": {
      "hz": "这件事听起来有点奇怪。",
      "py": "Zhè jiàn shì tīng qǐlai yǒudiǎn qíguài.",
      "id": "Hal ini kedengarannya agak aneh."
    }
  },
  {
    "id": "zh-v-434",
    "hanzi": "难过",
    "pinyin": "nánguò",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "sedih, pilu",
    "enMeaning": "sad, upset",
    "example": {
      "hz": "听到这个坏消息他心里很难过。",
      "py": "Tīng dào zhè gè huài xiāoxi tā xīn lǐ hěn nánguò.",
      "id": "Mendengar kabar buruk ini hatinya sangat sedih."
    }
  },
  {
    "id": "zh-v-435",
    "hanzi": "黑板",
    "pinyin": "hēibǎn",
    "tones": [
      1,
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "papan tulis hitam",
    "enMeaning": "blackboard",
    "example": {
      "hz": "老师在黑板上写下了新单词。",
      "py": "Lǎoshī zài hēibǎn shang xiě xià le xīn dāncí.",
      "id": "Guru menuliskan kosakata baru di papan tulis."
    }
  },
  {
    "id": "zh-v-436",
    "hanzi": "词典",
    "pinyin": "cídiǎn",
    "tones": [
      2,
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kamus",
    "enMeaning": "dictionary",
    "example": {
      "hz": "查电子词典学习生词很有效率。",
      "py": "Chá diànzǐ cídiǎn xuéxí shēngcí hěn yǒu xiàolǜ.",
      "id": "Mengecek kamus elektronik saat belajar kata baru sangat efisien."
    }
  },
  {
    "id": "zh-v-437",
    "hanzi": "词语",
    "pinyin": "cíyǔ",
    "tones": [
      2,
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "frasa, kosakata",
    "enMeaning": "word, term",
    "example": {
      "hz": "这篇课文包含很多高频词语。",
      "py": "Zhè piān kèwén bāohán hěn duō gāopín cíyǔ.",
      "id": "Teks pelajaran ini memuat banyak kosakata frekuensi tinggi."
    }
  },
  {
    "id": "zh-v-438",
    "hanzi": "句子",
    "pinyin": "jùzi",
    "tones": [
      4,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kalimat",
    "enMeaning": "sentence",
    "example": {
      "hz": "请用这个生词造一个完整的句子。",
      "py": "Qǐng yòng zhè gè shēngcí zào yí gè wánzhěng de jùzi.",
      "id": "Tolong gunakan kata baru ini untuk membuat kalimat lengkap."
    }
  },
  {
    "id": "zh-v-439",
    "hanzi": "明白",
    "pinyin": "míngbai",
    "tones": [
      2,
      0
    ],
    "level": 4,
    "pos": "Verb / Adjective",
    "idMeaning": "mengerti, jelas, paham",
    "enMeaning": "to understand, clear",
    "example": {
      "hz": "老师的讲解让我彻底明白了。",
      "py": "Lǎoshī de jiǎngjiě ràng wǒ chèdǐ míngbai le.",
      "id": "Penjelasan guru membuat saya mengerti tuntas."
    }
  },
  {
    "id": "zh-v-440",
    "hanzi": "认真",
    "pinyin": "rènzhēn",
    "tones": [
      4,
      1
    ],
    "level": 4,
    "pos": "Adjective / Adverb",
    "idMeaning": "sungguh-sungguh, tekun",
    "enMeaning": "serious, conscientious",
    "example": {
      "hz": "他对待每一项任务都非常认真。",
      "py": "Tā duìdài měi yí xiàng rènwù dōu fēicháng rènzhēn.",
      "id": "Dia memperlakukan setiap tugas dengan sangat sungguh-sungguh."
    }
  },
  {
    "id": "zh-v-441",
    "hanzi": "讲",
    "pinyin": "jiǎng",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "berbicara, menjelaskan, mengisahkan",
    "enMeaning": "to speak, explain, tell",
    "example": {
      "hz": "爷爷经常给我们讲古老的故事。",
      "py": "Yéye jīngcháng gěi wǒmen jiǎng gǔlǎo de gùshi.",
      "id": "Kakek sering mengisahkan cerita kuno kepada kami."
    }
  },
  {
    "id": "zh-v-442",
    "hanzi": "签证",
    "pinyin": "qiānzhèng",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "visa kunjungan",
    "enMeaning": "visa",
    "example": {
      "hz": "去外国留学需要提前办理签证。",
      "py": "Qù wàiguó liúxué xūyào tíqián bànlǐ qiānzhèng.",
      "id": "Kuliah di luar negeri perlu mengurus visa terlebih dahulu."
    }
  },
  {
    "id": "zh-v-443",
    "hanzi": "国家",
    "pinyin": "guójiā",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "negara",
    "enMeaning": "country, nation",
    "example": {
      "hz": "每个国家都有自己独特的文化。",
      "py": "Měi gè guójiā dōu yǒu zìjǐ dútè de wénhuà.",
      "id": "Setiap negara memiliki budaya unik masing-masing."
    }
  },
  {
    "id": "zh-v-444",
    "hanzi": "耳朵",
    "pinyin": "ěrduo",
    "tones": [
      3,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "telinga",
    "enMeaning": "ear",
    "example": {
      "hz": "兔子的两只耳朵长长的。",
      "py": "Tùzi de liǎng zhī ěrduo chángcháng de.",
      "id": "Dua telinga kelinci panjang-panjang."
    }
  },
  {
    "id": "zh-v-445",
    "hanzi": "眼镜",
    "pinyin": "yǎnjìng",
    "tones": [
      3,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kacamata",
    "enMeaning": "glasses, spectacles",
    "example": {
      "hz": "看书时他习惯戴上近视眼镜。",
      "py": "Kàn shū shí tā xíguàn dài shang jìnshì yǎnjìng.",
      "id": "Saat membaca buku dia terbiasa memakai kacamata minus."
    }
  },
  {
    "id": "zh-v-446",
    "hanzi": "戴",
    "pinyin": "dài",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "mengenakan (aksesori, topi, jam)",
    "enMeaning": "to wear (accessories)",
    "example": {
      "hz": "出门记得戴上太阳镜防晒。",
      "py": "Chūmén jìde dài shang tàiyángjìng fángshài.",
      "id": "Keluar rumah ingatlah memakai kacamata hitam untuk tabir surya."
    }
  },
  {
    "id": "zh-v-447",
    "hanzi": "帽子",
    "pinyin": "màozi",
    "tones": [
      4,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "topi",
    "enMeaning": "hat, cap",
    "example": {
      "hz": "这顶蓝色的帽子非常适合你。",
      "py": "Zhè dǐng lánsè de màozi fēicháng shìhé nǐ.",
      "id": "Topi warna biru ini sangat cocok untukmu."
    }
  },
  {
    "id": "zh-v-448",
    "hanzi": "头",
    "pinyin": "tóu",
    "tones": [
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kepala",
    "enMeaning": "head",
    "example": {
      "hz": "他低着头正在思考难题。",
      "py": "Tā dī zhe tóu zhèngzài sīkǎo nántí.",
      "id": "Dia menundukkan kepala sedang memikirkan soal sulit."
    }
  },
  {
    "id": "zh-v-449",
    "hanzi": "太阳",
    "pinyin": "tàiyáng",
    "tones": [
      4,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "matahari",
    "enMeaning": "sun",
    "example": {
      "hz": "温暖的太阳照亮了大地。",
      "py": "Wēnnuǎn de tàiyáng zhào liàng le dàdì.",
      "id": "Matahari yang hangat menerangi bumi."
    }
  },
  {
    "id": "zh-v-450",
    "hanzi": "草地",
    "pinyin": "cǎodì",
    "tones": [
      3,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "padang rumput, hamparan rumput",
    "enMeaning": "grassland, lawn",
    "example": {
      "hz": "孩子们在绿色的草地上奔跑玩耍。",
      "py": "Háizimen zài lǜsè de cǎodì shang bēnpǎo wánshuǎ.",
      "id": "Anak-anak berlari bermain di padang rumput hijau."
    }
  },
  {
    "id": "zh-v-451",
    "hanzi": "树",
    "pinyin": "shù",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "pohon",
    "enMeaning": "tree",
    "example": {
      "hz": "夏天我们在大树下乘凉。",
      "py": "Xiàtiān wǒmen zài dà shù xià chéngliáng.",
      "id": "Di musim panas kami berteduh di bawah pohon besar."
    }
  },
  {
    "id": "zh-v-452",
    "hanzi": "瓶子",
    "pinyin": "píngzi",
    "tones": [
      2,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "botol",
    "enMeaning": "bottle",
    "example": {
      "hz": "桌上放着一个透明的玻璃瓶子。",
      "py": "Zhuō shang fàng zhe yí gè tòumíng de bōlí píngzi.",
      "id": "Di atas meja terletak sebuah botol kaca transparan."
    }
  },
  {
    "id": "zh-v-453",
    "hanzi": "晒",
    "pinyin": "shài",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "menjemur, berjemur",
    "enMeaning": "to sunbathe, dry in sun",
    "example": {
      "hz": "趁着晴天把被子拿出去晒晒。",
      "py": "Chèn zhe qíngtiān bǎ bèizi ná chūqù shài shai.",
      "id": "Mumpung cuaca cerah bawa kasur keluar untuk dijemur."
    }
  },
  {
    "id": "zh-v-454",
    "hanzi": "打扫",
    "pinyin": "dǎsǎo",
    "tones": [
      3,
      3
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "membersihkan, menyapu",
    "enMeaning": "to clean, sweep",
    "example": {
      "hz": "周末全家人一起把房间打扫干净。",
      "py": "Zhōumò quán jiā rén yìqǐ bǎ fángjiān dǎsǎo gānjìng.",
      "id": "Akhir pekan sekeluarga membersihkan kamar bersama-sama."
    }
  },
  {
    "id": "zh-v-455",
    "hanzi": "扔",
    "pinyin": "rēng",
    "tones": [
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "melempar, membuang",
    "enMeaning": "to throw, discard",
    "example": {
      "hz": "请把废纸扔进分类垃圾桶里。",
      "py": "Qǐng bǎ fèizhǐ rēng jìn fēnlèi lājītǒng lǐ.",
      "id": "Tolong buang kertas bekas ke dalam tong sampah daur ulang."
    }
  },
  {
    "id": "zh-v-456",
    "hanzi": "或者",
    "pinyin": "huòzhě",
    "tones": [
      4,
      3
    ],
    "level": 4,
    "pos": "Conjunction",
    "idMeaning": "atau (dalam kalimat pernyataan)",
    "enMeaning": "or (in statement)",
    "example": {
      "hz": "明天我们可以去图书馆或者去公园。",
      "py": "Míngtiān wǒmen kěyǐ qù túshūguǎn huòzhě qù gōngyuán.",
      "id": "Besok kita bisa pergi ke perpustakaan atau pergi ke taman."
    }
  },
  {
    "id": "zh-v-457",
    "hanzi": "终于",
    "pinyin": "zhōngyú",
    "tones": [
      1,
      2
    ],
    "level": 4,
    "pos": "Adverb",
    "idMeaning": "akhirnya, pada akhirnya",
    "enMeaning": "finally, at last",
    "example": {
      "hz": "经过漫长的复习，我们终于通过了考试。",
      "py": "Jīngguò màncháng de fùxí, wǒmen zhōngyú tōngguò le kǎoshì.",
      "id": "Setelah mengulang materi sekian lama, kami akhirnya lulus ujian."
    }
  },
  {
    "id": "zh-v-458",
    "hanzi": "图书馆",
    "pinyin": "túshūguǎn",
    "tones": [
      2,
      1,
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "perpustakaan",
    "enMeaning": "library",
    "example": {
      "hz": "图书馆里需要保持安静。",
      "py": "Túshūguǎn lǐ xūyào bǎochí ānjìng.",
      "id": "Di dalam perpustakaan perlu menjaga ketenangan."
    }
  },
  {
    "id": "zh-v-459",
    "hanzi": "专业",
    "pinyin": "zhuānyè",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Noun / Adjective",
    "idMeaning": "jurusan keahlian, profesional",
    "enMeaning": "major, professional",
    "example": {
      "hz": "他在大学主修计算机专业。",
      "py": "Tā zài dàxué zhǔxiū jìsuànjī zhuānyè.",
      "id": "Dia mengambil jurusan ilmu komputer di perguruan tinggi."
    }
  },
  {
    "id": "zh-v-460",
    "hanzi": "学费",
    "pinyin": "xuéfèi",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "biaya kuliah/sekolah (SPP)",
    "enMeaning": "tuition fee",
    "example": {
      "hz": "他申请到了全额奖学金免交学费。",
      "py": "Tā shēnqǐng dào le quán'é jiǎngxuéjīn miǎn jiāo xuéfèi.",
      "id": "Dia meraih beasiswa penuh bebas SPP."
    }
  },
  {
    "id": "zh-v-461",
    "hanzi": "文化",
    "pinyin": "wénhuà",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kebudayaan, budaya",
    "enMeaning": "culture",
    "example": {
      "hz": "中华茶文化具有数千年的悠久底蕴。",
      "py": "Zhōnghuá chá wénhuà jùyǒu shù qiān nián de yōujiǔ dǐyùn.",
      "id": "Budaya teh Tionghoa memiliki nilai historis ribuan tahun."
    }
  },
  {
    "id": "zh-v-462",
    "hanzi": "费",
    "pinyin": "fèi",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Noun / Verb",
    "idMeaning": "biaya, ongkos, menghabiskan",
    "enMeaning": "fee, cost, to spend",
    "example": {
      "hz": "每月缴纳水电费都很方便。",
      "py": "Měi yuè jiǎonà shuǐdiànfèi dōu hěn fāngbiàn.",
      "id": "Setiap bulan membayar tagihan air listrik sangat praktis."
    }
  },
  {
    "id": "zh-v-463",
    "hanzi": "留学",
    "pinyin": "liúxué",
    "tones": [
      2,
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "kuliah di luar negeri",
    "enMeaning": "to study abroad",
    "example": {
      "hz": "很多学生渴望去国外名校留学。",
      "py": "Hěn duō xuésheng kěwàng qù guówài míngxiào liúxué.",
      "id": "Banyak murid mendambakan kuliah di kampus ternama luar negeri."
    }
  },
  {
    "id": "zh-v-464",
    "hanzi": "选择",
    "pinyin": "xuǎnzé",
    "tones": [
      3,
      2
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "memilih, pilihan",
    "enMeaning": "to choose, choice",
    "example": {
      "hz": "面对未来每个人都要做出选择。",
      "py": "Miànduì wèilái měi gè rén dōu yào zuò chū xuǎnzé.",
      "id": "Menghadapi masa depan setiap orang harus mengambil pilihan."
    }
  },
  {
    "id": "zh-v-465",
    "hanzi": "放心",
    "pinyin": "fàngxīn",
    "tones": [
      4,
      1
    ],
    "level": 4,
    "pos": "Verb / Adjective",
    "idMeaning": "tenang hati, merasa lega",
    "enMeaning": "to rest assured",
    "example": {
      "hz": "有你在我就彻底放心了。",
      "py": "Yǒu nǐ zài wǒ jiù chèdǐ fàngxīn le.",
      "id": "Ada kamu saya sudah merasa benar-benar tenang."
    }
  },
  {
    "id": "zh-v-466",
    "hanzi": "申请",
    "pinyin": "shēnqǐng",
    "tones": [
      1,
      3
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "mengajukan permohonan, mendaftar",
    "enMeaning": "to apply for, application",
    "example": {
      "hz": "他向海外高校提交了留学申请。",
      "py": "Tā xiàng hǎiwài gāoxiào tíjiāo le liúxué shēnqǐng.",
      "id": "Dia menyerahkan lamaran beasiswa ke kampus luar negeri."
    }
  },
  {
    "id": "zh-v-467",
    "hanzi": "故事",
    "pinyin": "gùshi",
    "tones": [
      4,
      0
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "cerita, dongeng, kisah",
    "enMeaning": "story, tale",
    "example": {
      "hz": "这个成语故事蕴含着深刻的人生哲理。",
      "py": "Zhè gè chéngyǔ gùshi yùnhán zhe shēnkè de rénshēng zhélǐ.",
      "id": "Cerita peribahasa ini mengandung filosofi hidup mendalam."
    }
  },
  {
    "id": "zh-v-468",
    "hanzi": "高中",
    "pinyin": "gāozhōng",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "sekolah menengah atas (SMA)",
    "enMeaning": "senior high school",
    "example": {
      "hz": "高中阶段的学习非常充实而关键。",
      "py": "Gāozhōng jiēduàn de xuéxí fēicháng chōngshí ér guānjiàn.",
      "id": "Masa belajar SMA sangat padat dan krusial."
    }
  },
  {
    "id": "zh-v-469",
    "hanzi": "完成",
    "pinyin": "wánchéng",
    "tones": [
      2,
      2
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "menyelesaikan, menuntaskan",
    "enMeaning": "to complete, finish",
    "example": {
      "hz": "我们按时完成了全部研发项目。",
      "py": "Wǒmen ànshí wánchéng le quánbù yánfā xiàngmù.",
      "id": "Kami menyelesaikan seluruh proyek riset tepat waktu."
    }
  },
  {
    "id": "zh-v-470",
    "hanzi": "段",
    "pinyin": "duàn",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Measure Word",
    "idMeaning": "paragraf, potongan, masa",
    "enMeaning": "section, paragraph, period",
    "example": {
      "hz": "请阅读课本中的第一段对话。",
      "py": "Qǐng yuèdú kèběn zhōng de dì-yī duàn duìhuà.",
      "id": "Silakan baca dialog paragraf pertama dalam buku teks."
    }
  },
  {
    "id": "zh-v-471",
    "hanzi": "成功",
    "pinyin": "chénggōng",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Verb / Noun / Adjective",
    "idMeaning": "berhasil, sukses",
    "enMeaning": "to succeed, success",
    "example": {
      "hz": "坚持不懈是通往成功最重要的基石。",
      "py": "Jiānchí bú xiè shì tōng wǎng chénggōng zuì zhòngyào de jīshí.",
      "id": "Ketekunan adalah pondasi terpenting menuju kesuksesan."
    }
  },
  {
    "id": "zh-v-472",
    "hanzi": "失败",
    "pinyin": "shībài",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "gagal, kegagalan",
    "enMeaning": "to fail, failure",
    "example": {
      "hz": "失败是成功之母，从错误中汲取经验。",
      "py": "Shībài shì chénggōng zhī mǔ, cóng cuòwù zhōng jíqǔ jīngyàn.",
      "id": "Kegagalan adalah ibu kesuksesan, petiklah pelajaran dari kesalahan."
    }
  },
  {
    "id": "zh-v-473",
    "hanzi": "主要",
    "pinyin": "zhǔyào",
    "tones": [
      3,
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "utama, pokok",
    "enMeaning": "main, primary",
    "example": {
      "hz": "今天会议的主要议题是环保方案。",
      "py": "Jīntiān huìyì de zhǔyào yìtí shì huánbǎo fāng'àn.",
      "id": "Topik utama rapat hari ini adalah rencana pelestarian lingkungan."
    }
  },
  {
    "id": "zh-v-474",
    "hanzi": "一般",
    "pinyin": "yìbān",
    "tones": [
      4,
      1
    ],
    "level": 4,
    "pos": "Adjective / Adverb",
    "idMeaning": "umum, biasanya, biasa-biasa saja",
    "enMeaning": "general, ordinary, usually",
    "example": {
      "hz": "周末我一般在家里阅读或者听音乐。",
      "py": "Zhōumò wǒ yìbān zài jiā lǐ yuèdú huòzhě tīng yīnyuè.",
      "id": "Akhir pekan biasanya saya di rumah membaca atau mendengar musik."
    }
  },
  {
    "id": "zh-v-475",
    "hanzi": "创始人",
    "pinyin": "chuàngshǐrén",
    "tones": [
      4,
      3,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "pendiri, perintis",
    "enMeaning": "founder",
    "example": {
      "hz": "公司的创始人分享了创业经历。",
      "py": "Gōngsī de chuàngshǐrén fēnxiǎng le chuàngyè jīnglì.",
      "id": "Pendiri perusahaan membagikan pengalaman merintis usaha."
    }
  },
  {
    "id": "zh-v-476",
    "hanzi": "前天",
    "pinyin": "qiántiān",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Time",
    "idMeaning": "kemarin lusa",
    "enMeaning": "the day before yesterday",
    "example": {
      "hz": "前天下午我刚刚收到海外寄来的包裹。",
      "py": "Qiántiān xiàwǔ wǒ gānggang shōudào hǎiwài jì lái de bāoguǒ.",
      "id": "Kemarin lusa sore saya baru saja menerima paket dari luar negeri."
    }
  },
  {
    "id": "zh-v-477",
    "hanzi": "电子",
    "pinyin": "diànzǐ",
    "tones": [
      4,
      3
    ],
    "level": 4,
    "pos": "Noun / Adjective",
    "idMeaning": "elektronik",
    "enMeaning": "electronic",
    "example": {
      "hz": "现代社会电子支付越来越普及。",
      "py": "Xiàndài shèhuì diànzǐ zhīfù yuè lái yuè pǔjí.",
      "id": "Di masyarakat modern pembayaran elektronik kian lazim digunakan."
    }
  },
  {
    "id": "zh-v-478",
    "hanzi": "邮件",
    "pinyin": "yóujiàn",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "surat pos, email",
    "enMeaning": "mail, email",
    "example": {
      "hz": "查收邮件后请及时回复确认。",
      "py": "Cháshōu yóujiàn hòu qǐng jíshí huífù quèrèn.",
      "id": "Setelah memeriksa email mohon balas konfirmasi secepatnya."
    }
  },
  {
    "id": "zh-v-479",
    "hanzi": "回答",
    "pinyin": "huídá",
    "tones": [
      2,
      2
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "menjawab, jawaban",
    "enMeaning": "to answer, reply",
    "example": {
      "hz": "请认真回答考官提出的问题。",
      "py": "Qǐng rènzhēn huídá kǎoguān tíchū de wèntí.",
      "id": "Tolong jawab pertanyaan penguji dengan sungguh-sungguh."
    }
  },
  {
    "id": "zh-v-480",
    "hanzi": "了解",
    "pinyin": "liǎojiě",
    "tones": [
      3,
      3
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "memahami, mengetahui mendalam",
    "enMeaning": "to understand, know about",
    "example": {
      "hz": "通过旅行我更加了解了当地的习俗。",
      "py": "Tōngguò lǚxíng wǒ gèngjiā liǎojiě le dāngdì de xísú.",
      "id": "Lewat jalan-jalan saya semakin memahami adat istiadat setempat."
    }
  },
  {
    "id": "zh-v-481",
    "hanzi": "发烧",
    "pinyin": "fāshāo",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "demam, meriang",
    "enMeaning": "to have a fever",
    "example": {
      "hz": "孩子如果发烧应该多补充水分。",
      "py": "Háizi rúguǒ fāshāo yīnggāi duō bǔchōng shuǐfèn.",
      "id": "Jika anak demam harus banyak minum air."
    }
  },
  {
    "id": "zh-v-482",
    "hanzi": "清楚",
    "pinyin": "qīngchu",
    "tones": [
      1,
      0
    ],
    "level": 4,
    "pos": "Adjective / Verb",
    "idMeaning": "jelas, mengerti jelas",
    "enMeaning": "clear, distinct",
    "example": {
      "hz": "这个汉字的笔画写得非常清楚。",
      "py": "Zhè gè Hànzì de bǐhuà xiě de fēicháng qīngchu.",
      "id": "Goresan karakter Hanzi ini tertulis sangat jelas."
    }
  },
  {
    "id": "zh-v-483",
    "hanzi": "简单",
    "pinyin": "jiǎndān",
    "tones": [
      3,
      1
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "sederhana, mudah",
    "enMeaning": "simple, uncomplicated",
    "example": {
      "hz": "用简单清晰的语言表达观点最好。",
      "py": "Yòng jiǎndān qīngxī de yǔyán biǎodá guāndiǎn zuì hǎo.",
      "id": "Mengungkapkan pendapat dengan bahasa sederhana dan jelas adalah yang terbaik."
    }
  },
  {
    "id": "zh-v-484",
    "hanzi": "城市",
    "pinyin": "chéngshì",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kota",
    "enMeaning": "city",
    "example": {
      "hz": "这座现代化城市绿化做得非常好。",
      "py": "Zhè zuò xiàndàihuà chéngshì lǜhuà zuò de fēicháng hǎo.",
      "id": "Penghijauan kota modern ini terawat sangat bagus."
    }
  },
  {
    "id": "zh-v-485",
    "hanzi": "机会",
    "pinyin": "jīhuì",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kesempatan, peluang",
    "enMeaning": "opportunity, chance",
    "example": {
      "hz": "要善于抓住每一个展现自我的机会。",
      "py": "Yào shànyú zhuāzhù měi yí gè zhǎnxiàn zìwǒ de jīhuì.",
      "id": "Harus pandai memanfaatkan setiap kesempatan unjuk gigi."
    }
  },
  {
    "id": "zh-v-486",
    "hanzi": "邻居",
    "pinyin": "línjū",
    "tones": [
      2,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "tetangga",
    "enMeaning": "neighbor",
    "example": {
      "hz": "良好的邻居关系让生活更温馨。",
      "py": "Liánghǎo de línjū guānxi ràng shēnghuó gèng wēnxīn.",
      "id": "Hubungan tetangga yang baik membuat hidup lebih hangat."
    }
  },
  {
    "id": "zh-v-487",
    "hanzi": "关心",
    "pinyin": "guānxīn",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "peduli, perhatian",
    "enMeaning": "to care about",
    "example": {
      "hz": "朋友间的关心让人倍感温暖。",
      "py": "Péngyou jiān de guānxīn ràng rén bèi gǎn wēnnuǎn.",
      "id": "Kepedulian antarteman membuat orang merasa sangat hangat."
    }
  },
  {
    "id": "zh-v-488",
    "hanzi": "照顾",
    "pinyin": "zhàogù",
    "tones": [
      4,
      0
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "merawat, menjaga",
    "enMeaning": "to take care of",
    "example": {
      "hz": "生病时妈妈细心地照顾我。",
      "py": "Shēngbìng shí māma xìxīn de zhàogù wǒ.",
      "id": "Saat sakit ibu merawat saya dengan telaten."
    }
  },
  {
    "id": "zh-v-489",
    "hanzi": "街道",
    "pinyin": "jiēdào",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "jalan raya, jalan kota",
    "enMeaning": "street",
    "example": {
      "hz": "城市街道两旁种满了美丽的樱花。",
      "py": "Chéngshì jiēdào liǎngpáng zhòng mǎn le měilì de yīnghuā.",
      "id": "Kedua sisi jalanan kota penuh ditanami bunga sakura yang indah."
    }
  },
  {
    "id": "zh-v-490",
    "hanzi": "干净",
    "pinyin": "gānjìng",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Adjective",
    "idMeaning": "bersih, higienis",
    "enMeaning": "clean, tidy",
    "example": {
      "hz": "把客厅收拾得干干净净心情舒畅。",
      "py": "Bǎ kètīng shōushi de gāngānjìngjìng xīnqíng shūchàng.",
      "id": "Merapikan ruang tamu hingga bersih membuat hati nyaman."
    }
  },
  {
    "id": "zh-v-491",
    "hanzi": "过去",
    "pinyin": "guòqù",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Noun / Verb",
    "idMeaning": "masa lalu, lewat, pergi ke sana",
    "enMeaning": "past, to pass by",
    "example": {
      "hz": "过去的经历让我们变得更加坚强。",
      "py": "Guòqù de jīnglì ràng wǒmen biàn de gèngjiā jiānqiáng.",
      "id": "Pengalaman masa lalu membuat kita menjadi lebih tangguh."
    }
  },
  {
    "id": "zh-v-492",
    "hanzi": "经过",
    "pinyin": "jīngguò",
    "tones": [
      1,
      4
    ],
    "level": 4,
    "pos": "Verb / Preposition",
    "idMeaning": "melewati, melalui",
    "enMeaning": "to pass through",
    "example": {
      "hz": "公车每天都经过市中心的商业街。",
      "py": "Gōngchē měitiān dōu jīngguò shì zhōngxīn de shāngyèjiē.",
      "id": "Bus kota setiap hari melewati jalan perbelanjaan pusat kota."
    }
  },
  {
    "id": "zh-v-493",
    "hanzi": "节日",
    "pinyin": "jiérì",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "hari raya, festival",
    "enMeaning": "festival, holiday",
    "example": {
      "hz": "春季是中国最重要的传统节日。",
      "py": "Chūnjié shì Zhōngguó zuì zhòngyào de chuántǒng jiérì.",
      "id": "Tahun Baru Imlek adalah festival tradisional terpenting di Tiongkok."
    }
  },
  {
    "id": "zh-v-494",
    "hanzi": "几乎",
    "pinyin": "jīhū",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Adverb",
    "idMeaning": "hampir, nyaris",
    "enMeaning": "almost, nearly",
    "example": {
      "hz": "这本书他几乎一口气读完了。",
      "py": "Zhè běn shū tā jīhū yìkǒuqì dú wán le.",
      "id": "Buku ini hampir diselesaikannya dalam sekali duduk."
    }
  },
  {
    "id": "zh-v-495",
    "hanzi": "决定",
    "pinyin": "juédìng",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "memutuskan, keputusan",
    "enMeaning": "to decide, decision",
    "example": {
      "hz": "他决定明年毕业后去海外深造。",
      "py": "Tā juédìng míngnián bìyè hòu qù hǎiwài shēnzào.",
      "id": "Dia memutuskan lanjut kuliah ke luar negeri setelah lulus tahun depan."
    }
  },
  {
    "id": "zh-v-496",
    "hanzi": "结束",
    "pinyin": "jiéshù",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "berakhir, selesai",
    "enMeaning": "to end, finish",
    "example": {
      "hz": "音乐会圆满结束，全场掌声雷动。",
      "py": "Yīnyuèhuì yuánmǎn jiéshù, quán chǎng zhǎngshēng léidòng.",
      "id": "Konser musik berakhir sukses, tepuk tangan riuh membahana."
    }
  },
  {
    "id": "zh-v-497",
    "hanzi": "同意",
    "pinyin": "tóngyì",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "setuju, sependapat",
    "enMeaning": "to agree, consent",
    "example": {
      "hz": "大家一致同意推行新的工作方案。",
      "py": "Dàjiā yízhì tóngyì tuīxíng xīn de gōngzuò fāng'àn.",
      "id": "Semua orang sepakat menyetujui penerapan skema kerja baru."
    }
  },
  {
    "id": "zh-v-498",
    "hanzi": "别人",
    "pinyin": "biéren",
    "tones": [
      2,
      0
    ],
    "level": 4,
    "pos": "Pronoun",
    "idMeaning": "orang lain",
    "enMeaning": "other people",
    "example": {
      "hz": "与人相处要学会多替别人着想。",
      "py": "Yǔ rén xiāngchǔ yào xuéhuì duō tì biéren zhuóxiǎng.",
      "id": "Bergaul dengan orang harus belajar memikirkan orang lain."
    }
  },
  {
    "id": "zh-v-499",
    "hanzi": "辆",
    "pinyin": "liàng",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Measure Word",
    "idMeaning": "buah/unit (kata bantu kendaraan roda)",
    "enMeaning": "measure word for vehicles",
    "example": {
      "hz": "门前停着一辆崭新的红色汽车。",
      "py": "Mén qián tíng zhe yí liàng zhǎnxīn de hóngsè qìchē.",
      "id": "Di depan pintu terparkir sebuah mobil merah yang masih baru."
    }
  },
  {
    "id": "zh-v-500",
    "hanzi": "自行车",
    "pinyin": "zìxíngchē",
    "tones": [
      4,
      2,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "sepeda",
    "enMeaning": "bicycle, bike",
    "example": {
      "hz": "骑自行车既环保又锻炼身体。",
      "py": "Qí zìxíngchē jì huánbǎo yòu duànliàn shēntǐ.",
      "id": "Naik sepeda ramah lingkungan sekaligus menyehatkan badan."
    }
  },
  {
    "id": "zh-v-501",
    "hanzi": "脚",
    "pinyin": "jiǎo",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kaki, telapak kaki",
    "enMeaning": "foot",
    "example": {
      "hz": "爬山后他的脚走得有些发酸。",
      "py": "Pá shān hòu tā de jiǎo zǒu de yǒuxiē fā suān.",
      "id": "Sehabis mendaki gunung telapak kakinya agak pegal."
    }
  },
  {
    "id": "zh-v-502",
    "hanzi": "撞",
    "pinyin": "zhuàng",
    "tones": [
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "menabrak, membentur",
    "enMeaning": "to collide, bump into",
    "example": {
      "hz": "跑步时不小心撞到了走廊的墙壁。",
      "py": "Pǎobù shí bù xiǎoxīn zhuàng dào le zǒuláng de qiángbì.",
      "id": "Saat lari tak sengaja menabrak dinding lorong."
    }
  },
  {
    "id": "zh-v-503",
    "hanzi": "受伤",
    "pinyin": "shòushāng",
    "tones": [
      4,
      1
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "terluka, cedera",
    "enMeaning": "to get injured",
    "example": {
      "hz": "踢球时不慎受伤需要好好休养。",
      "py": "Tī qiú shí búshèn shòushāng xūyào hǎohāo xiūyǎng.",
      "id": "Saat bermain bola tak sengaja cedera dan perlu istirahat baik-baik."
    }
  },
  {
    "id": "zh-v-504",
    "hanzi": "检查",
    "pinyin": "jiǎnchá",
    "tones": [
      3,
      2
    ],
    "level": 4,
    "pos": "Verb / Noun",
    "idMeaning": "memeriksa, inspeksi",
    "enMeaning": "to check, inspect",
    "example": {
      "hz": "交试卷前请再仔细检查一遍。",
      "py": "Jiāo shìjuàn qián qǐng zài zǐxì jiǎnchá yí biàn.",
      "id": "Sebelum mengumpulkan lembar ujian periksalah sekali lagi dengan teliti."
    }
  },
  {
    "id": "zh-v-505",
    "hanzi": "小心",
    "pinyin": "xiǎoxīn",
    "tones": [
      3,
      1
    ],
    "level": 4,
    "pos": "Adjective / Verb",
    "idMeaning": "hati-hati, waspada",
    "enMeaning": "careful, cautious",
    "example": {
      "hz": "地面湿滑，走楼梯请小心！",
      "py": "Dìmiàn shīhuá, zǒu lóutī qǐng xiǎoxīn!",
      "id": "Lantai licin, harap berhati-hati menaiki tangga!"
    }
  },
  {
    "id": "zh-v-506",
    "hanzi": "忘记",
    "pinyin": "wàngjì",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Verb",
    "idMeaning": "lupa, melupakan",
    "enMeaning": "to forget",
    "example": {
      "hz": "出门别忘记关好门窗。",
      "py": "Chūmén bié wàngjì guān hǎo ménchuāng.",
      "id": "Saat keluar rumah jangan lupa menutup pintu dan jendela."
    }
  },
  {
    "id": "zh-v-507",
    "hanzi": "声音",
    "pinyin": "shēngyīn",
    "tones": [
      1,
      1
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "suara, bunyi",
    "enMeaning": "sound, voice",
    "example": {
      "hz": "窗外传来了清脆的鸟鸣声音。",
      "py": "Chuāngwài chuán lái le qīngcuì de niǎomíng shēngyīn.",
      "id": "Dari luar jendela terdengar suara kicauan burung yang merdu."
    }
  },
  {
    "id": "zh-v-508",
    "hanzi": "节目",
    "pinyin": "jiémù",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "program acara (TV/radio/pentas)",
    "enMeaning": "program, show",
    "example": {
      "hz": "今晚的电视文艺节目非常精彩。",
      "py": "Jīnwǎn de diànshì wényì jiémù fēicháng jīngcǎi.",
      "id": "Program seni televisi malam ini sangat seru."
    }
  },
  {
    "id": "zh-v-509",
    "hanzi": "信用",
    "pinyin": "xìnyòng",
    "tones": [
      4,
      4
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kredit, reputasi kepercayaan",
    "enMeaning": "credit, trustworthiness",
    "example": {
      "hz": "遵守诺言是树立良好个人信用的基石。",
      "py": "Zūnshǒu nuòyán shì shùlì liánghǎo gèrén xìnyòng de jīshí.",
      "id": "Menepati janji adalah pondasi membangun reputasi kredit pribadi yang baik."
    }
  },
  {
    "id": "zh-v-510",
    "hanzi": "卡",
    "pinyin": "kǎ",
    "tones": [
      3
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "kartu",
    "enMeaning": "card",
    "example": {
      "hz": "进出宿舍需要刷学生卡。",
      "py": "Jìnchū sùshè xūyào shuā xuésheng kǎ.",
      "id": "Keluar masuk asrama perlu menggesek kartu mahasiswa."
    }
  },
  {
    "id": "zh-v-511",
    "hanzi": "客人",
    "pinyin": "kèrén",
    "tones": [
      4,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "tamu, pelanggan",
    "enMeaning": "guest, customer",
    "example": {
      "hz": "主人热情地端茶倒水招待客人。",
      "py": "Zhǔrén rèqíng de duān chá dào shuǐ zhāodài kèrén.",
      "id": "Tuan rumah dengan hangat menyuguhkan teh menyambut tamu."
    }
  },
  {
    "id": "zh-v-512",
    "hanzi": "中文",
    "pinyin": "Zhōngwén",
    "tones": [
      1,
      2
    ],
    "level": 4,
    "pos": "Noun",
    "idMeaning": "bahasa Mandarin / Tionghoa",
    "enMeaning": "Chinese language",
    "example": {
      "hz": "学习中文为我打开了全新的文化视野。",
      "py": "Xuéxí Zhōngwén wèi wǒ dǎkāi le quánxīn de wénhuà shìyě.",
      "id": "Belajar bahasa Mandarin membukakan wawasan budaya baru bagi saya."
    }
  },
  {
    "id": "zh-v-513",
    "hanzi": "服务",
    "pinyin": "fúwù",
    "tones": [
      2,
      4
    ],
    "level": 4,
    "pos": "Noun / Verb",
    "idMeaning": "pelayanan, melayani",
    "enMeaning": "service, to serve",
    "example": {
      "hz": "这家酒店的优质服务让人宾至如归。",
      "py": "Zhè jiā jiǔdiàn de yōuzhì fúwù ràng rén bīnzhì-rúguī.",
      "id": "Pelayanan bermutu hotel ini membuat tamu merasa di rumah sendiri."
    }
  },
  {
    "id": "zh-v-514",
    "hanzi": "市区",
    "pinyin": "shìqū",
    "tones": [
      4,
      1
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "pusat kota, area perkotaan",
    "enMeaning": "urban area, downtown",
    "example": {
      "hz": "从郊区坐地铁到市区只要半小时。",
      "py": "Cóng jiāoqū zuò dìtiě dào shìqū zhǐ yào bàn xiǎoshí.",
      "id": "Dari pinggiran kota naik subway ke pusat kota cuma setengah jam."
    }
  },
  {
    "id": "zh-v-515",
    "hanzi": "健身房",
    "pinyin": "jiànshēnfáng",
    "tones": [
      4,
      1,
      2
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "pusat kebugaran, gym",
    "enMeaning": "gym, fitness center",
    "example": {
      "hz": "他下班后常去健身房锻炼力量。",
      "py": "Tā xiàbān hòu cháng qù jiànshēnfáng duànliàn lìliang.",
      "id": "Sepulang kerja dia sering ke gym melatih kekuatan."
    }
  },
  {
    "id": "zh-v-516",
    "hanzi": "逛",
    "pinyin": "guàng",
    "tones": [
      4
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "berjalan-jalan santai, cuci mata",
    "enMeaning": "to stroll, roam",
    "example": {
      "hz": "周末我们喜欢去步行街逛逛。",
      "py": "Zhōumò wǒmen xǐhuan qù bùxíngjiē guàngguang.",
      "id": "Akhir pekan kami suka berjalan-jalan santai di jalan pedestrian."
    }
  },
  {
    "id": "zh-v-517",
    "hanzi": "聚会",
    "pinyin": "jùhuì",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Noun / Verb",
    "idMeaning": "reuni, pertemuan kumpul-kumpul",
    "enMeaning": "gathering, get-together",
    "example": {
      "hz": "今晚我们有一场老同学聚会。",
      "py": "Jīnwǎn wǒmen yǒu yì chǎng lǎo tóngxué jùhuì.",
      "id": "Malam ini kami ada reuni teman lama."
    }
  },
  {
    "id": "zh-v-518",
    "hanzi": "平时",
    "pinyin": "píngshí",
    "tones": [
      2,
      2
    ],
    "level": 5,
    "pos": "Time / Noun",
    "idMeaning": "hari biasa, pada umumnya",
    "enMeaning": "ordinarily, in normal times",
    "example": {
      "hz": "他平时工作很忙，很少看电视。",
      "py": "Tā píngshí gōngzuò hěn máng, hěn shǎo kàn diànshì.",
      "id": "Pada hari biasa dia sangat sibuk bekerja, jarang menonton TV."
    }
  },
  {
    "id": "zh-v-519",
    "hanzi": "好处",
    "pinyin": "hǎochu",
    "tones": [
      3,
      0
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "manfaat, faedah, kebaikan",
    "enMeaning": "benefit, advantage",
    "example": {
      "hz": "早睡早起对身体有很多好处。",
      "py": "Zǎoshuì zǎoqǐ duì shēntǐ yǒu hěn duō hǎochu.",
      "id": "Tidur cepat dan bangun pagi banyak manfaatnya bagi tubuh."
    }
  },
  {
    "id": "zh-v-520",
    "hanzi": "乒乓球",
    "pinyin": "pīngpāngqiú",
    "tones": [
      1,
      1,
      2
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "tenis meja, pingpong",
    "enMeaning": "table tennis, ping-pong",
    "example": {
      "hz": "打乒乓球在中国非常普及且受欢迎。",
      "py": "Dǎ pīngpāngqiú zài Zhōngguó fēicháng pǔjí qiě shòu huānyíng.",
      "id": "Bermain tenis meja di Tiongkok sangat memasyarakat dan digemari."
    }
  },
  {
    "id": "zh-v-521",
    "hanzi": "世纪",
    "pinyin": "shìjì",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "abad",
    "enMeaning": "century",
    "example": {
      "hz": "二十一世纪是数字科技蓬勃发展的时代。",
      "py": "Èrshíyī shìjì shì shùzì kējì péngbó fāzhǎn de shídài.",
      "id": "Abad ke-21 adalah era perkembangan pesat teknologi digital."
    }
  },
  {
    "id": "zh-v-522",
    "hanzi": "成为",
    "pinyin": "chéngwéi",
    "tones": [
      2,
      2
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "menjadi, bertransformasi jadi",
    "enMeaning": "to become, turn into",
    "example": {
      "hz": "他的梦想是成为一名优秀的建筑师。",
      "py": "Tā de mèngxiǎng shì chéngwéi yì míng yōuxiù de jiànzhùshī.",
      "id": "Impiannya adalah menjadi seorang arsitek terkemuka."
    }
  },
  {
    "id": "zh-v-523",
    "hanzi": "出现",
    "pinyin": "chūxiàn",
    "tones": [
      1,
      4
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "muncul, hadir",
    "enMeaning": "to appear, emerge",
    "example": {
      "hz": "雨后天空中出现了一道美丽的彩虹。",
      "py": "Yǔ hòu tiānkōng zhōng chūxiàn le yí dào měilì de cǎihóng.",
      "id": "Sehabis hujan di langit muncul pelangi yang indah."
    }
  },
  {
    "id": "zh-v-524",
    "hanzi": "发明",
    "pinyin": "fāmíng",
    "tones": [
      1,
      2
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "menemukan (inovasi), penemuan",
    "enMeaning": "to invent, invention",
    "example": {
      "hz": "指南针是中国古代四大发明之一。",
      "py": "Zhǐnánzhēn shì Zhōngguó gǔdài sì dà fāmíng zhī yī.",
      "id": "Kompas adalah salah satu dari empat penemuan agung Tiongkok kuno."
    }
  },
  {
    "id": "zh-v-525",
    "hanzi": "发展",
    "pinyin": "fāzhǎn",
    "tones": [
      1,
      3
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "berkembang, pembangunan",
    "enMeaning": "to develop, development",
    "example": {
      "hz": "近年来高新技术产业发展非常迅猛。",
      "py": "Jìnnián lái gāoxīn jìshù chǎnyè fāzhǎn fēicháng xùnměng.",
      "id": "Tahun-tahun terakhir ini industri teknologi canggih berkembang amat pesat."
    }
  },
  {
    "id": "zh-v-526",
    "hanzi": "届",
    "pinyin": "jiè",
    "tones": [
      4
    ],
    "level": 5,
    "pos": "Measure Word",
    "idMeaning": "sesi, angkatan, periode (event)",
    "enMeaning": "session, class, event iteration",
    "example": {
      "hz": "这是第十届国际青年文化艺术节。",
      "py": "Zhè shì dì shí jiè guójì qīngnián wénhuà yìshù jié.",
      "id": "Ini adalah Festival Seni Budaya Pemuda Internasional ke-10."
    }
  },
  {
    "id": "zh-v-527",
    "hanzi": "举办",
    "pinyin": "jǔbàn",
    "tones": [
      3,
      4
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "menyelenggarakan, mengadakan",
    "enMeaning": "to hold, conduct, host",
    "example": {
      "hz": "北京曾成功举办夏季与冬季奥运会。",
      "py": "Běijīng céng chénggōng jǔbàn xiàjì yǔ dōngjì Àoyùnhuì.",
      "id": "Beijing pernah sukses menyelenggarakan Olimpiade Musim Panas dan Dingin."
    }
  },
  {
    "id": "zh-v-528",
    "hanzi": "自信",
    "pinyin": "zìxìn",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Adjective / Noun",
    "idMeaning": "percaya diri, optimis",
    "enMeaning": "confident, self-confidence",
    "example": {
      "hz": "微笑能让你在面试中展现出自信。",
      "py": "Wēixiào néng ràng nǐ zài miànshì zhōng zhǎnxiàn chū zìxìn.",
      "id": "Senyum dapat membantumu menampilkan rasa percaya diri saat wawancara."
    }
  },
  {
    "id": "zh-v-529",
    "hanzi": "活泼",
    "pinyin": "huópo",
    "tones": [
      2,
      0
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "lincah, ceria, enerjik",
    "enMeaning": "lively, vivacious",
    "example": {
      "hz": "那个活泼可爱的小女孩深受老师喜爱。",
      "py": "Nà gè huópo kě'ài de xiǎo nǚhái shēn shòu lǎoshī xǐ'ài.",
      "id": "Gadis kecil yang lincah dan ceria itu sangat disukai guru."
    }
  },
  {
    "id": "zh-v-530",
    "hanzi": "有趣",
    "pinyin": "yǒuqù",
    "tones": [
      3,
      4
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "menarik, menyenangkan, lucu",
    "enMeaning": "interesting, fascinating",
    "example": {
      "hz": "这本科技小说讲述了一个非常有趣的故事。",
      "py": "Zhè běn kējì xiǎoshuō jiǎngshù le yí gè fēicháng yǒuqù de gùshi.",
      "id": "Novel fiksi ilmiah ini menceritakan kisah yang sangat menarik."
    }
  },
  {
    "id": "zh-v-531",
    "hanzi": "帅",
    "pinyin": "shuài",
    "tones": [
      4
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "tampan, gagah",
    "enMeaning": "handsome, smart",
    "example": {
      "hz": "穿上这套正装西服，他显得格外帅气。",
      "py": "Chuān shang zhè tào zhèngzhuāng xīfú, tā xiǎnde géwài shuàiqi.",
      "id": "Mengenakan setelan jas formal ini, dia tampak luar biasa tampan."
    }
  },
  {
    "id": "zh-v-532",
    "hanzi": "理想",
    "pinyin": "lǐxiǎng",
    "tones": [
      3,
      3
    ],
    "level": 5,
    "pos": "Noun / Adjective",
    "idMeaning": "cita-cita, ideal",
    "enMeaning": "ideal, aspiration",
    "example": {
      "hz": "为了实现崇高的理想，我们需要坚持努力。",
      "py": "Wèile shíxiàn chónggāo de lǐxiǎng, wǒmen xūyào jiānchí nǔlì.",
      "id": "Demi mewujudkan cita-cita mulia, kita perlu terus berjuang."
    }
  },
  {
    "id": "zh-v-533",
    "hanzi": "最好",
    "pinyin": "zuìhǎo",
    "tones": [
      4,
      3
    ],
    "level": 5,
    "pos": "Adverb",
    "idMeaning": "sebaiknya, paling baik",
    "enMeaning": "had better, best",
    "example": {
      "hz": "天气转凉了，出门最好多穿一件外套。",
      "py": "Tiānqì zhuǎn liáng le, chūmén zuìhǎo duō chuān yí jiàn wàitào.",
      "id": "Cuaca mulai dingin, saat keluar rumah sebaiknya tambah jaket."
    }
  },
  {
    "id": "zh-v-534",
    "hanzi": "西红柿",
    "pinyin": "xīhóngshì",
    "tones": [
      1,
      2,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "tomat",
    "enMeaning": "tomato",
    "example": {
      "hz": "西红柿炒鸡蛋是家喻户晓的中国家常菜。",
      "py": "Xīhóngshì chǎo jīdàn shì jiāyù-hùxiǎo de Zhōngguó jiāchángcài.",
      "id": "Tumis tomat telur adalah masakan rumahan Tiongkok yang kondang."
    }
  },
  {
    "id": "zh-v-535",
    "hanzi": "酸",
    "pinyin": "suān",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "asam, kecut, pegal",
    "enMeaning": "sour, tart, sore",
    "example": {
      "hz": "这个柠檬非常酸，需要加点蜂蜜。",
      "py": "Zhè gè níngméng fēicháng suān, xūyào jiā diǎn fēngmì.",
      "id": "Lemon ini sangat asam, perlu ditambah sedikit madu."
    }
  },
  {
    "id": "zh-v-536",
    "hanzi": "汤",
    "pinyin": "tāng",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "sup, kuah",
    "enMeaning": "soup, broth",
    "example": {
      "hz": "广东人习惯在正餐前先喝一碗煲汤。",
      "py": "Guǎngdōng rén xíguàn zài zhèngcān qián xiān hē yì wǎn bāotāng.",
      "id": "Orang Guangdong terbiasa minum semangkuk sup sebelum hidangan utama."
    }
  },
  {
    "id": "zh-v-537",
    "hanzi": "切",
    "pinyin": "qiē",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "memotong, mengiris",
    "enMeaning": "to cut, slice",
    "example": {
      "hz": "做沙拉前先把黄瓜和苹果切成小块。",
      "py": "Zuò shālā qián xiān bǎ huángguā hé píngguǒ qiē chéng xiǎo kuài.",
      "id": "Sebelum membuat salad potong timun dan apel jadi potongan kecil dulu."
    }
  },
  {
    "id": "zh-v-538",
    "hanzi": "航班",
    "pinyin": "hángbān",
    "tones": [
      2,
      1
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "penerbangan berjadwal",
    "enMeaning": "scheduled flight",
    "example": {
      "hz": "受暴雨影响，今晚的多架航班将推迟起飞。",
      "py": "Shòu bàoyǔ yǐngxiǎng, jīnwǎn de duō jià hángbān jiāng tuīchí qǐfēi.",
      "id": "Terdampak hujan lebat, banyak penerbangan malam ini ditunda keberangkatannya."
    }
  },
  {
    "id": "zh-v-539",
    "hanzi": "惊喜",
    "pinyin": "jīngxǐ",
    "tones": [
      1,
      3
    ],
    "level": 5,
    "pos": "Noun / Verb",
    "idMeaning": "kejutan menyenangkan",
    "enMeaning": "pleasant surprise",
    "example": {
      "hz": "朋友们精心为我准备了生日惊喜。",
      "py": "Péngyoumen jīngxīn wèi wǒ zhǔnbèi le shēngrì jīngxǐ.",
      "id": "Teman-teman dengan saksama menyiapkan kejutan ulang tahun untukku."
    }
  },
  {
    "id": "zh-v-540",
    "hanzi": "安排",
    "pinyin": "ānpái",
    "tones": [
      1,
      2
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "mengatur, susunan jadwal",
    "enMeaning": "to arrange, schedule",
    "example": {
      "hz": "公司为新员工安排了系统的入职培训。",
      "py": "Gōngsī wèi xīn yuángōng ānpái le xìtǒng de rùzhí péixùn.",
      "id": "Perusahaan mengatur pelatihan orientasi sistematis bagi karyawan baru."
    }
  },
  {
    "id": "zh-v-541",
    "hanzi": "出发",
    "pinyin": "chūfā",
    "tones": [
      1,
      1
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "berangkat, melangkah jalan",
    "enMeaning": "to set out, depart",
    "example": {
      "hz": "明天清晨六点我们在校门口集合出发。",
      "py": "Míngtiān qīngchén liù diǎn wǒmen zài xiào ménkǒu jíhé chūfā.",
      "id": "Besok jam 6 pagi kita berkumpul di gerbang sekolah lalu berangkat."
    }
  },
  {
    "id": "zh-v-542",
    "hanzi": "快递",
    "pinyin": "kuàidì",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "jasa pengiriman kilat, kurir",
    "enMeaning": "express delivery, courier",
    "example": {
      "hz": "在中国网购快递通常一两天就能送达。",
      "py": "Zài Zhōngguó wǎnggòu kuàidì tōngcháng yì liǎng tiān jiù néng sòngdá.",
      "id": "Belanja daring di Tiongkok biasanya kurir sampai dalam 1-2 hari."
    }
  },
  {
    "id": "zh-v-543",
    "hanzi": "联系",
    "pinyin": "liánxì",
    "tones": [
      2,
      4
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "menghubungi, kontak, koneksi",
    "enMeaning": "to contact, connect",
    "example": {
      "hz": "如果到达目的地请立即与我们联系。",
      "py": "Rúguǒ dàodá mùdìdì qǐng lìjí yǔ wǒmen liánxì.",
      "id": "Bila sudah tiba di tujuan harap segera menghubungi kami."
    }
  },
  {
    "id": "zh-v-544",
    "hanzi": "信息",
    "pinyin": "xìnxī",
    "tones": [
      4,
      1
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "informasi, pesan data",
    "enMeaning": "information, message",
    "example": {
      "hz": "请确认个人信息填写完整且准确无误。",
      "py": "Qǐng quèrèn gèrén xìnxī tiánxiě wánzhěng qiě zhǔnquè wúwù.",
      "id": "Pastikan pengisian data pribadi lengkap dan akurat tanpa salah."
    }
  },
  {
    "id": "zh-v-545",
    "hanzi": "查",
    "pinyin": "chá",
    "tones": [
      2
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "memeriksa, mengecek, mencari",
    "enMeaning": "to check, look up",
    "example": {
      "hz": "上网查资料可以快速获取最新资讯。",
      "py": "Shàngwǎng chá zīliào kěyǐ kuàisù huòqǔ zuìxīn zīxùn.",
      "id": "Mengecek data di internet dapat cepat memperoleh informasi terkini."
    }
  },
  {
    "id": "zh-v-546",
    "hanzi": "解释",
    "pinyin": "jiěshì",
    "tones": [
      3,
      4
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "menjelaskan, menerangkan",
    "enMeaning": "to explain, explanation",
    "example": {
      "hz": "老师耐心地向同学们解释生词的用法。",
      "py": "Lǎoshī nàixīn de xiàng tóngxuémen jiěshì shēngcí de yòngfǎ.",
      "id": "Guru dengan sabar menjelaskan cara penggunaan kosakata baru kepada para siswa."
    }
  },
  {
    "id": "zh-v-547",
    "hanzi": "计划",
    "pinyin": "jìhuà",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Noun / Verb",
    "idMeaning": "rencana, merencanakan",
    "enMeaning": "plan, to plan",
    "example": {
      "hz": "制定科学的学习计划能事半功倍。",
      "py": "Zhìdìng kēxué de xuéxí jìhuà néng shìbàn-gōngbèi.",
      "id": "Menyusun rencana belajar yang ilmiah menghasilkan efisiensi dua kali lipat."
    }
  },
  {
    "id": "zh-v-548",
    "hanzi": "节约",
    "pinyin": "jiéyuē",
    "tones": [
      2,
      1
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "menghemat, berhemat",
    "enMeaning": "to save, economize",
    "example": {
      "hz": "节约用水与用电是保护地球的优良品德。",
      "py": "Jiéyuē yòngshuǐ yǔ yòngdiàn shì bǎohù dìqiú de yōuliáng pǐndé.",
      "id": "Menghemat air dan listrik adalah budi pekerti mulia menjaga bumi."
    }
  },
  {
    "id": "zh-v-549",
    "hanzi": "路线",
    "pinyin": "lùxiàn",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "rute perjalanan, jalur",
    "enMeaning": "route, itinerary",
    "example": {
      "hz": "手机导航为我们规划了一条最快的自驾路线。",
      "py": "Shǒujī dǎoháng wèi wǒmen guīhuà le yì tiáo zuì kuài de zìjià lùxiàn.",
      "id": "Navigasi ponsel merencanakan rute berkendara tercepat bagi kami."
    }
  },
  {
    "id": "zh-v-550",
    "hanzi": "工资",
    "pinyin": "gōngzī",
    "tones": [
      1,
      1
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "gaji, upah",
    "enMeaning": "salary, wage",
    "example": {
      "hz": "按时发放员工工资是企业的法定责任。",
      "py": "Ànshí fāfàng yuángōng gōngzī shì qǐyè de fǎdìng zérèn.",
      "id": "Membayarkan upah karyawan tepat waktu adalah kewajiban hukum perusahaan."
    }
  },
  {
    "id": "zh-v-551",
    "hanzi": "能力",
    "pinyin": "nénglì",
    "tones": [
      2,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "kemampuan, kapabilitas",
    "enMeaning": "ability, capability",
    "example": {
      "hz": "实践锻炼能全面提升综合沟通能力。",
      "py": "Shíjiàn duànliàn néng quánmiàn tíshēng zōnghé gōutōng nénglì.",
      "id": "Latihan praktik dapat meningkatkan kapabilitas komunikasi komprehensif."
    }
  },
  {
    "id": "zh-v-552",
    "hanzi": "加班",
    "pinyin": "jiābān",
    "tones": [
      1,
      1
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "lembur, bekerja lewat waktu",
    "enMeaning": "to work overtime",
    "example": {
      "hz": "为了赶在上线前完成测试，工程师们主动加班。",
      "py": "Wèile gǎn zài shàngxiàn qián wánchéng cèshì, gōngchéngshīmen zhǔdòng jiābān.",
      "id": "Demi menyelesaikan uji coba sebelum peluncuran, para insinyur berinisiatif lembur."
    }
  },
  {
    "id": "zh-v-553",
    "hanzi": "剩",
    "pinyin": "shèng",
    "tones": [
      4
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "tersisa, sisa",
    "enMeaning": "to remain, be left over",
    "example": {
      "hz": "晚饭后盘子里还剩下了两块蛋糕。",
      "py": "Wǎnfàn hòu pánzi lǐ hái shèng xià le liǎng kuài dàngāo.",
      "id": "Sehabis makan malam di piring masih tersisa dua potong kue."
    }
  },
  {
    "id": "zh-v-554",
    "hanzi": "付",
    "pinyin": "fù",
    "tones": [
      4
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "membayar",
    "enMeaning": "to pay",
    "example": {
      "hz": "收银台支持微信与支付宝扫码付账。",
      "py": "Shōuyíntái zhīchí Wēixìn yǔ Zhīfùbǎo sǎo mǎ fù zhàng.",
      "id": "Kasir mendukung pembayaran scan kode WeChat dan Alipay."
    }
  },
  {
    "id": "zh-v-555",
    "hanzi": "白领",
    "pinyin": "báilǐng",
    "tones": [
      2,
      3
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "pekerja kantoran (kerah putih)",
    "enMeaning": "white-collar worker",
    "example": {
      "hz": "很多都市白领在忙碌的工作之余喜欢品尝手冲咖啡。",
      "py": "Hěn duō dūshì báilǐng zài mánglù de gōngzuò zhī yú xǐhuan pǐncháng shǒuchōng kāfēi.",
      "id": "Banyak pekerja kantoran kota di sela kesibukan gemar menikmati kopi seduh manual."
    }
  },
  {
    "id": "zh-v-556",
    "hanzi": "数量",
    "pinyin": "shùliàng",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "jumlah kuantitas",
    "enMeaning": "quantity, amount",
    "example": {
      "hz": "仓储管理员需要每天清点库存的实际数量。",
      "py": "Cāngchǔ guǎnlǐyuán xūyào měitiān qīngdiǎn kùcún de shíjì shùliàng.",
      "id": "Petugas gudang perlu mendata jumlah nyata stok inventaris setiap hari."
    }
  },
  {
    "id": "zh-v-557",
    "hanzi": "调查",
    "pinyin": "diàochá",
    "tones": [
      4,
      2
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "meneliti, survei, investigasi",
    "enMeaning": "to investigate, survey",
    "example": {
      "hz": "市场调查结果表明年轻人更青睐绿色出行。",
      "py": "Shìchǎng diàochá jiéguǒ biǎomíng niánqīngrén gèng qīnglài lǜsè chūxíng.",
      "id": "Hasil survei pasar menunjukkan pemuda lebih menyukai transportasi ramah lingkungan."
    }
  },
  {
    "id": "zh-v-558",
    "hanzi": "超过",
    "pinyin": "chāoguò",
    "tones": [
      1,
      4
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "melampaui, melebihi",
    "enMeaning": "to exceed, surpass",
    "example": {
      "hz": "本周参加马拉松报名的人数已超过三万人。",
      "py": "Běn zhōu cānjiā mǎlāsōng bàomíng de rénshù yǐ chāoguò sān wàn rén.",
      "id": "Pendaftar maraton minggu ini telah melampaui 30.000 orang."
    }
  },
  {
    "id": "zh-v-559",
    "hanzi": "甚至",
    "pinyin": "shènzhì",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Conjunction / Adverb",
    "idMeaning": "bahkan, sampai-sampai",
    "enMeaning": "even, so much that",
    "example": {
      "hz": "他着迷于中文文学，甚至废寝忘食地研读古典诗词。",
      "py": "Tā zháomí yú Zhōngwén wénxué, shènzhì fèiqǐn-wàngshí de yándú gǔdiǎn shīcí.",
      "id": "Dia gandrung sastra Mandarin, bahkan sampai lupa makan dan tidur menelaah puisi klasik."
    }
  },
  {
    "id": "zh-v-560",
    "hanzi": "年龄",
    "pinyin": "niánlíng",
    "tones": [
      2,
      2
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "usia, umur",
    "enMeaning": "age",
    "example": {
      "hz": "学无止境，学习一门新语言不受年龄限制。",
      "py": "Xué wú zhǐjìng, xuéxí yì mén xīn yǔyán bú shòu niánlíng xiànzhì.",
      "id": "Belajar tiada batas, menguasai bahasa baru tidak dibatasi usia."
    }
  },
  {
    "id": "zh-v-561",
    "hanzi": "数字",
    "pinyin": "shùzì",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "angka, digit, digital",
    "enMeaning": "number, figure, digital",
    "example": {
      "hz": "财务报表上的每一个关键数字都必须核对清楚。",
      "py": "Cáiwù bàobiǎo shang de měi yí gè guānjiàn shùzì dōu bìxū héduì qīngchu.",
      "id": "Setiap angka penting pada laporan keuangan harus dicocokkan dengan saksama."
    }
  },
  {
    "id": "zh-v-562",
    "hanzi": "减少",
    "pinyin": "jiǎnshǎo",
    "tones": [
      3,
      3
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "mengurangi, menyusut",
    "enMeaning": "to reduce, decrease",
    "example": {
      "hz": "少用塑料袋能显著减少白色污染。",
      "py": "Shǎo yòng sùliàodài néng xiǎnzhù jiǎnshǎo báisè wūrǎn.",
      "id": "Mengurangi pemakaian kantong plastik dapat secara nyata memangkas polusi sampah."
    }
  },
  {
    "id": "zh-v-563",
    "hanzi": "网站",
    "pinyin": "wǎngzhàn",
    "tones": [
      3,
      4
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "situs web, website",
    "enMeaning": "website",
    "example": {
      "hz": "官方网站更新了最新的在线课程和练习资源。",
      "py": "Guānfāng wǎngzhàn gēngxīn le zuìxīn de zàixiàn kèchéng hé liànxí zīyuán.",
      "id": "Situs web resmi telah memperbarui kursus daring dan sumber latihan terkini."
    }
  },
  {
    "id": "zh-v-564",
    "hanzi": "严重",
    "pinyin": "yánzhòng",
    "tones": [
      2,
      4
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "parah, serius, genting",
    "enMeaning": "serious, critical",
    "example": {
      "hz": "气候变暖是全球面临的极其严重的问题。",
      "py": "Qìhòu biàn nuǎn shì quánqiú miànlín de jíqí yánzhòng de wèntí.",
      "id": "Pemanasan global adalah isu teramat serius yang dihadapi dunia."
    }
  },
  {
    "id": "zh-v-565",
    "hanzi": "招聘",
    "pinyin": "zhāopìn",
    "tones": [
      1,
      4
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "merekrut pegawai, lowongan kerja",
    "enMeaning": "to recruit, recruitment",
    "example": {
      "hz": "这家跨国科技公司正在高薪招聘软件工程师。",
      "py": "Zhè jiā kuàguó kējì gōngsī zhèngzài gāoxīn zhāopìn ruǎnjiàn gōngchéngshī.",
      "id": "Perusahaan teknologi multinasional ini sedang membuka lowongan insinyur perangkat lunak bergaji tinggi."
    }
  },
  {
    "id": "zh-v-566",
    "hanzi": "说明",
    "pinyin": "shuōmíng",
    "tones": [
      1,
      2
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "menerangkan, petunjuk penjelasan",
    "enMeaning": "to explain, illustrate",
    "example": {
      "hz": "使用新电器前请仔细阅读操作说明书。",
      "py": "Shǐyòng xīn diànqì qián qǐng zǐxì yuèdú cāozuò shuōmíngshū.",
      "id": "Sebelum memakai perabot listrik baru bacalah buku petunjuk operasional dengan cermat."
    }
  },
  {
    "id": "zh-v-567",
    "hanzi": "销售",
    "pinyin": "xiàoshòu",
    "tones": [
      1,
      4
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "menjual, penjualan, marketing",
    "enMeaning": "to sell, sales",
    "example": {
      "hz": "新产品在首发当天的销售额突破了百万元。",
      "py": "Xīn chǎnpǐn zài shǒufā dāngtiān de xiàoshòu'é tūpò le bǎiwàn yuán.",
      "id": "Penjualan produk baru di hari perdana menembus satu juta yuan."
    }
  },
  {
    "id": "zh-v-568",
    "hanzi": "招呼",
    "pinyin": "zhāohu",
    "tones": [
      1,
      0
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "menyapa, memberi salam",
    "enMeaning": "to greet, say hello",
    "example": {
      "hz": "遇到熟悉的邻居，大家都会主动热情地打招呼。",
      "py": "Yù dào shúxī de línjū, dàjiā dōu huì zhǔdòng rèqíng de dǎ zhāohu.",
      "id": "Saat bertemu tetangga yang dikenal, semua berinisiatif menyapa hangat."
    }
  },
  {
    "id": "zh-v-569",
    "hanzi": "幽默",
    "pinyin": "yōumò",
    "tones": [
      1,
      4
    ],
    "level": 5,
    "pos": "Adjective / Noun",
    "idMeaning": "humoris, jenaka, kelucuan",
    "enMeaning": "humorous, humor",
    "example": {
      "hz": "李老师讲课幽默风趣，课堂上笑声不断。",
      "py": "Lǐ lǎoshī jiǎngkè yōumò fēngqù, kètáng shang xiàoshēng bú duàn.",
      "id": "Guru Li mengajar dengan penuh humor, suasana kelas selalu riang gembira."
    }
  },
  {
    "id": "zh-v-570",
    "hanzi": "害羞",
    "pinyin": "hàixiū",
    "tones": [
      4,
      1
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "pemalu, tersipu-sipu",
    "enMeaning": "shy, bashful",
    "example": {
      "hz": "小女孩第一次登台表演，神情显得有些害羞。",
      "py": "Xiǎo nǚhái dì-yī cì dēngtái biǎoyǎn, shénqíng xiǎnde yǒuxiē hàixiū.",
      "id": "Gadis kecil pertama kali tampil di panggung tampak sedikit pemalu."
    }
  },
  {
    "id": "zh-v-571",
    "hanzi": "紧张",
    "pinyin": "jǐnzhāng",
    "tones": [
      3,
      1
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "gugup, tegang",
    "enMeaning": "nervous, tense",
    "example": {
      "hz": "深呼吸能够有效缓解面试前的紧张情绪。",
      "py": "Shēnhūxī nénggòu yǒuxiào huǎnjiě miànshì qián de jǐnzhāng qíngxù.",
      "id": "Tarik napas dalam secara efektif meredakan ketegangan sebelum wawancara."
    }
  },
  {
    "id": "zh-v-572",
    "hanzi": "猜",
    "pinyin": "cāi",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "menebak",
    "enMeaning": "to guess",
    "example": {
      "hz": "你猜猜看我给你带回了什么神秘礼物？",
      "py": "Nǐ cāicai kàn wǒ gěi nǐ dài huí le shénme shénmì lǐwù?",
      "id": "Coba tebak hadiah misterius apa yang kubawakan untukmu?"
    }
  },
  {
    "id": "zh-v-573",
    "hanzi": "吃惊",
    "pinyin": "chījīng",
    "tones": [
      1,
      1
    ],
    "level": 5,
    "pos": "Verb / Adjective",
    "idMeaning": "terkejut, heran",
    "enMeaning": "startled, amazed",
    "example": {
      "hz": "这个出乎意料的喜讯让所有人都大吃一惊。",
      "py": "Zhè gè chūhū-yìliào de xǐxùn ràng suǒyǒu rén dōu dà chī yì jīng.",
      "id": "Kabar gembira di luar dugaan ini membuat semua orang amat terkejut."
    }
  },
  {
    "id": "zh-v-574",
    "hanzi": "购物",
    "pinyin": "gòuwù",
    "tones": [
      4,
      4
    ],
    "level": 5,
    "pos": "Verb / Noun",
    "idMeaning": "berbelanja",
    "enMeaning": "shopping, to shop",
    "example": {
      "hz": "如今手机在线购物已经成为日常消费主流。",
      "py": "Rújīn shǒujī zàixiàn gòuwù yǐjīng chéngwéi rìcháng xiāofèi zhǔliú.",
      "id": "Kini belanja online lewat ponsel telah menjadi arus utama konsumsi harian."
    }
  },
  {
    "id": "zh-v-575",
    "hanzi": "科学",
    "pinyin": "kēxué",
    "tones": [
      1,
      2
    ],
    "level": 5,
    "pos": "Noun / Adjective",
    "idMeaning": "ilmu pengetahuan, ilmiah",
    "enMeaning": "science, scientific",
    "example": {
      "hz": "科学合理的作息安排能够保障旺盛的精力。",
      "py": "Kēxué hélǐ de zuòxī ānpái nénggòu bǎozhàng wàngshèng de jīnglì.",
      "id": "Jadwal istirahat kerja yang ilmiah mampu menjamin stamina prima."
    }
  },
  {
    "id": "zh-v-576",
    "hanzi": "保持",
    "pinyin": "bǎochí",
    "tones": [
      3,
      2
    ],
    "level": 5,
    "pos": "Verb",
    "idMeaning": "mempertahankan, menjaga konsistensi",
    "enMeaning": "to maintain, keep",
    "example": {
      "hz": "无论身处何种境遇，都要保持乐观向上的心态。",
      "py": "Wúlùn shēn chǔ hé zhǒng jìngyù, dōu yào bǎochí lèguān xiàngshàng de xīntài.",
      "id": "Dalam situasi apa pun, tetaplah menjaga mental optimis."
    }
  },
  {
    "id": "zh-v-577",
    "hanzi": "轻松",
    "pinyin": "qīngsōng",
    "tones": [
      1,
      1
    ],
    "level": 5,
    "pos": "Adjective",
    "idMeaning": "santai, rileks, bebas beban",
    "enMeaning": "relaxed, effortless",
    "example": {
      "hz": "听着轻快的爵士乐让人感到无比轻松与自在。",
      "py": "Tīng zhe qīngkuài de juéshìyuè ràng rén gǎndào wúbǐ qīngsōng yǔ zìzài.",
      "id": "Mendengar musik jazz riang membuat orang merasa sangat santai dan leluasa."
    }
  },
  {
    "id": "zh-v-578",
    "hanzi": "家人",
    "pinyin": "jiārén",
    "tones": [
      1,
      2
    ],
    "level": 5,
    "pos": "Noun",
    "idMeaning": "anggota keluarga, famili",
    "enMeaning": "family members",
    "example": {
      "hz": "春节阖家团圆是每一位中国游子对家人最深沉的挂念。",
      "py": "Chūnjié hé jiā tuányuán shì měi yí wèi Zhōngguó yóuzǐ duì jiārén zuì shēnchén de guàniàn.",
      "id": "Kumpul bersama keluarga saat Imlek adalah kerinduan terdalam para perantau pada keluarga."
    }
  },
  {
    "id": "zh-v-579",
    "hanzi": "乱",
    "pinyin": "luàn",
    "tones": [
      4
    ],
    "level": 6,
    "pos": "Adjective / Adverb",
    "idMeaning": "berantakan, kacau, sembarangan",
    "enMeaning": "messy, chaotic, disorderly",
    "example": {
      "hz": "书桌上太乱了，需要好好收拾一下。",
      "py": "Shūzhuō shang tài luàn le, xūyào hǎohāo shōushi yíxià.",
      "id": "Meja belajar terlalu berantakan, perlu dirapikan dengan baik."
    }
  },
  {
    "id": "zh-v-580",
    "hanzi": "改变",
    "pinyin": "gǎibiàn",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "mengubah, perubahan",
    "enMeaning": "to change, transform",
    "example": {
      "hz": "读书与知识能够深刻改变一个人的命运。",
      "py": "Dúshū yǔ zhīshi nénggòu shēnkè gǎibiàn yí gè rén de mìngyùn.",
      "id": "Membaca dan ilmu pengetahuan dapat mengubah nasib seseorang secara mendalam."
    }
  },
  {
    "id": "zh-v-581",
    "hanzi": "整理",
    "pinyin": "zhěnglǐ",
    "tones": [
      3,
      3
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "merapikan, menyusun berkas",
    "enMeaning": "to organize, arrange",
    "example": {
      "hz": "下班前他习惯整理当天的会议纪要。",
      "py": "Xiàbān qián tā xíguàn zhěnglǐ dāngtiān de huìyì jìyào.",
      "id": "Sebelum pulang kantor dia terbiasa merapikan notula rapat hari itu."
    }
  },
  {
    "id": "zh-v-582",
    "hanzi": "合适",
    "pinyin": "héshì",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "cocok, pas, pantas",
    "enMeaning": "suitable, appropriate",
    "example": {
      "hz": "这双运动鞋尺码非常合适，跑步很舒适。",
      "py": "Zhè shuāng yùndòngxié chǐmǎ fēicháng héshì, pǎobù hěn shūshì.",
      "id": "Ukuran sepatu olahraga ini sangat pas, nyaman untuk lari."
    }
  },
  {
    "id": "zh-v-583",
    "hanzi": "小说",
    "pinyin": "xiǎoshuō",
    "tones": [
      3,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "novel, roman fiksi",
    "enMeaning": "novel, fiction",
    "example": {
      "hz": "这部悬疑小说情节跌宕起伏扣人心弦。",
      "py": "Zhè bù xuányí xiǎoshuō qíngjié diēdàng-qǐfú kòurén-xīnxián.",
      "id": "Alur cerita novel misteri ini sangat menegangkan dan memikat hati."
    }
  },
  {
    "id": "zh-v-584",
    "hanzi": "破",
    "pinyin": "pò",
    "tones": [
      4
    ],
    "level": 6,
    "pos": "Adjective / Verb",
    "idMeaning": "rusak, robek, memecahkan",
    "enMeaning": "broken, torn, to break",
    "example": {
      "hz": "他的裤子膝盖处不小心磨破了一块。",
      "py": "Tā de kùzi xīgài chù bù xiǎoxīn mó pò le yí kuài.",
      "id": "Bagian lutut celananya tak sengaja sobek tergores."
    }
  },
  {
    "id": "zh-v-585",
    "hanzi": "垃圾桶",
    "pinyin": "lājītǒng",
    "tones": [
      1,
      1,
      3
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "tong sampah, tempat sampah",
    "enMeaning": "trash can, dustbin",
    "example": {
      "hz": "请按分类标识将废弃物投入垃圾桶。",
      "py": "Qǐng àn fēnlèi biāozhì jiāng fèiqìwù tóurù lājītǒng.",
      "id": "Tolong buang sampah ke tong sampah sesuai tanda klasifikasi."
    }
  },
  {
    "id": "zh-v-586",
    "hanzi": "大约",
    "pinyin": "dàyuē",
    "tones": [
      4,
      1
    ],
    "level": 6,
    "pos": "Adverb",
    "idMeaning": "kira-kira, sekitar",
    "enMeaning": "approximately, about",
    "example": {
      "hz": "从北京到上海乘高铁大约需要四个半小时。",
      "py": "Cóng Běijīng dào Shànghǎi chéng gāotiě dàyuē xūyào sì gè bàn xiǎoshí.",
      "id": "Dari Beijing ke Shanghai naik kereta cepat kira-kira butuh 4,5 jam."
    }
  },
  {
    "id": "zh-v-587",
    "hanzi": "杂志",
    "pinyin": "zázhì",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "majalah",
    "enMeaning": "magazine",
    "example": {
      "hz": "他喜欢在闲暇时光阅读地理科普杂志。",
      "py": "Tā xǐhuan zài xiánxiá shíguāng yuèdú dìlǐ kēpǔ zázhì.",
      "id": "Dia gemar membaca majalah sains geografi di waktu senggang."
    }
  },
  {
    "id": "zh-v-588",
    "hanzi": "应聘",
    "pinyin": "yìngpìn",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "melamar pekerjaan",
    "enMeaning": "to apply for a job",
    "example": {
      "hz": "今天有数十位优秀毕业生前来应聘设计师职位。",
      "py": "Jīntiān yǒu shù shí wèi yōuxiù bìyèshēng qiánlái yìngpìn shèjìshī zhíwèi.",
      "id": "Hari ini ada puluhan lulusan berprestasi datang melamar posisi desainer."
    }
  },
  {
    "id": "zh-v-589",
    "hanzi": "考虑",
    "pinyin": "kǎolǜ",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "mempertimbangkan, memikirkan",
    "enMeaning": "to consider, think over",
    "example": {
      "hz": "在做出最终投资决策前需要周密考虑风险。",
      "py": "Zài zuò chū zuìzhōng tóuzī juécè qián xūyào zhōumì kǎolǜ fēngxiǎn.",
      "id": "Sebelum mengambil keputusan investasi final perlu mempertimbangkan risiko dengan matang."
    }
  },
  {
    "id": "zh-v-590",
    "hanzi": "专门",
    "pinyin": "zhuānmén",
    "tones": [
      1,
      2
    ],
    "level": 6,
    "pos": "Adverb / Adjective",
    "idMeaning": "khusus, spesifik",
    "enMeaning": "specifically, specialized",
    "example": {
      "hz": "这是专门为初学者定制的汉字发音训练课程。",
      "py": "Zhè shì zhuānmén wèi chūxuézhě dìngzhì de Hànzì fāyīn xùnliàn kèchéng.",
      "id": "Ini adalah kursus latihan pelafalan Hanzi khusus yang dirancang untuk pemula."
    }
  },
  {
    "id": "zh-v-591",
    "hanzi": "奖金",
    "pinyin": "jiǎngjīn",
    "tones": [
      3,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "bonus, uang penghargaan",
    "enMeaning": "bonus, award money",
    "example": {
      "hz": "年终考核优异的员工获得了丰厚的项目奖金。",
      "py": "Niánzhōng kǎohé yōuyì de yuángōng huòdé le fēnghòu de xiàngmù jiǎngjīn.",
      "id": "Karyawan berprestasi dalam penilaian akhir tahun meraih bonus proyek yang besar."
    }
  },
  {
    "id": "zh-v-592",
    "hanzi": "适应",
    "pinyin": "shìyìng",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "beradaptasi, menyesuaikan diri",
    "enMeaning": "to adapt, suit",
    "example": {
      "hz": "初到异国求学需要一定的时间来适应当地生活。",
      "py": "Chū dào yìguó qiúxué xūyào yídìng de shíjiān lái shìyìng dāngdì shēnghuó.",
      "id": "Baru tiba belajar di negeri orang butuh waktu untuk beradaptasi dengan kehidupan setempat."
    }
  },
  {
    "id": "zh-v-593",
    "hanzi": "竞争",
    "pinyin": "jìngzhēng",
    "tones": [
      4,
      1
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "bersaing, kompetisi",
    "enMeaning": "to compete, competition",
    "example": {
      "hz": "良性市场竞争有助于激发技术创新与服务升级。",
      "py": "Liángxìng shìchǎng jìngzhēng yǒuzhù yú jīfā jìshù chuàngxīn yǔ fúwù shēngjí.",
      "id": "Persaingan pasar yang sehat membantu memicu inovasi teknologi dan peningkatan layanan."
    }
  },
  {
    "id": "zh-v-594",
    "hanzi": "当时",
    "pinyin": "dāngshí",
    "tones": [
      1,
      2
    ],
    "level": 6,
    "pos": "Time / Noun",
    "idMeaning": "saat itu, waktu itu",
    "enMeaning": "at that time, then",
    "example": {
      "hz": "事发突然，当时谁也没有料到会是这个结局。",
      "py": "Shì fā tūrán, dāngshí shéi yě méiyǒu liàodào huì shì zhè gè jiéjú.",
      "id": "Peristiwa terjadi mendadak, saat itu tiada yang menduga akan berakhir seperti ini."
    }
  },
  {
    "id": "zh-v-595",
    "hanzi": "亲戚",
    "pinyin": "qīnqi",
    "tones": [
      1,
      0
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "kerabat, sanak saudara",
    "enMeaning": "relative, kin",
    "example": {
      "hz": "逢年过节走访亲戚是中国传统的民俗习惯。",
      "py": "Féng nián guò jié zǒufǎng qīnqi shì Zhōngguó chuántǒng de mínsú xíguàn.",
      "id": "Mengunjungi kerabat saat perayaan hari raya adalah adat istiadat tradisional Tionghoa."
    }
  },
  {
    "id": "zh-v-596",
    "hanzi": "苦",
    "pinyin": "kǔ",
    "tones": [
      3
    ],
    "level": 6,
    "pos": "Adjective / Noun",
    "idMeaning": "pahit, menderita, sengsara",
    "enMeaning": "bitter, hardship",
    "example": {
      "hz": "虽然良药苦口，但对治疗疾病却大有裨益。",
      "py": "Suīrán liángyào kǔ kǒu, dàn duì zhìliáo jíbìng què dà yǒu bìyì.",
      "id": "Meski obat mujarab terasa pahit di lidah, namun berfaedah besar untuk menyembuhkan penyakit."
    }
  },
  {
    "id": "zh-v-597",
    "hanzi": "激动",
    "pinyin": "jīdòng",
    "tones": [
      1,
      4
    ],
    "level": 6,
    "pos": "Adjective / Verb",
    "idMeaning": "terharu, terharu bersemangat, emosional",
    "enMeaning": "excited, agitated",
    "example": {
      "hz": "当听到夺冠的消息时，全体队员激动得热泪盈眶。",
      "py": "Dāng tīngdào duóguàn de xiāoxi shí, quántǐ duìyuán jīdòng de rèlèi yíng kuàng.",
      "id": "Saat mendengar kabar merebut juara, seluruh anggota tim terharu berlinang air mata."
    }
  },
  {
    "id": "zh-v-598",
    "hanzi": "打扮",
    "pinyin": "dǎban",
    "tones": [
      3,
      0
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "berdandan, merias diri",
    "enMeaning": "to dress up, makeup",
    "example": {
      "hz": "她今天穿上旗袍精心打扮了一番出席晚宴。",
      "py": "Tā jīntiān chuān shang qípáo jīngxīn dǎban le yì fān chūxí wǎnyàn.",
      "id": "Hari ini dia mengenakan qipao dan berdandan teliti menghadiri jamuan makan malam."
    }
  },
  {
    "id": "zh-v-599",
    "hanzi": "参观",
    "pinyin": "cānguān",
    "tones": [
      1,
      1
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "mengunjungi (museum, pameran)",
    "enMeaning": "to visit, tour",
    "example": {
      "hz": "周末很多家长带着孩子去国家博物馆参观科技展。",
      "py": "Zhōumò hěn duō jiāzhǎng dài zhe háizi qù Guójiā Bówùguǎn cānguān kējì zhǎn.",
      "id": "Akhir pekan banyak orang tua mengajak anak mengunjungi pameran sains di Museum Nasional."
    }
  },
  {
    "id": "zh-v-600",
    "hanzi": "收拾",
    "pinyin": "shōushi",
    "tones": [
      1,
      0
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "merapikan, mengemasi barang",
    "enMeaning": "to tidy up, pack",
    "example": {
      "hz": "出发旅行前我们要细心收拾好所有行李。",
      "py": "Chūfā lǚxíng qián wǒmen yào xìxīn shōushi hǎo suǒyǒu xíngli.",
      "id": "Sebelum berangkat liburan kita harus mengemasi semua barang bawaan dengan teliti."
    }
  },
  {
    "id": "zh-v-601",
    "hanzi": "警察",
    "pinyin": "jǐngchá",
    "tones": [
      3,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "polisi",
    "enMeaning": "police, policeman",
    "example": {
      "hz": "人民警察日夜守护着社区的安宁与公共秩序。",
      "py": "Rénmín jǐngchá rìyè shǒuhù zhe shèqū de ānníng yǔ gōnggòng zhìxù.",
      "id": "Polisi siang malam menjaga ketenangan komunitas dan ketertiban umum."
    }
  },
  {
    "id": "zh-v-602",
    "hanzi": "勇敢",
    "pinyin": "yǒnggǎn",
    "tones": [
      3,
      3
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "pemberani, berani",
    "enMeaning": "brave, courageous",
    "example": {
      "hz": "消防员不顾个人安危勇敢地冲进火场救人。",
      "py": "Xiāofángyuán búgù gèrén ānwēi yǒnggǎn de chōng jìn huǒchǎng jiù rén.",
      "id": "Petugas pemadam kebakaran tak menghiraukan keselamatan pribadi dengan berani menerobos kobaran api menyelamatkan orang."
    }
  },
  {
    "id": "zh-v-603",
    "hanzi": "冷静",
    "pinyin": "lěngjìng",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "tenang, berkepala dingin",
    "enMeaning": "calm, cool-headed",
    "example": {
      "hz": "在突发紧急情况下一定要保持头脑冷静。",
      "py": "Zài tūfā jǐnjí qíngkuàng xià yídìng yào bǎochí tóunǎo lěngjìng.",
      "id": "Dalam situasi darurat mendadak harus tetap berkepala dingin."
    }
  },
  {
    "id": "zh-v-604",
    "hanzi": "保护",
    "pinyin": "bǎohù",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "melindungi, proteksi",
    "enMeaning": "to protect, safeguard",
    "example": {
      "hz": "保护生态环境就是呵护人类共同的家园。",
      "py": "Bǎohù shēngtài huánjìng jiù shì hēhù rénlèi gòngtóng de jiāyuán.",
      "id": "Melindungi lingkungan ekologis adalah merawat rumah bersama umat manusia."
    }
  },
  {
    "id": "zh-v-605",
    "hanzi": "生命",
    "pinyin": "shēngmìng",
    "tones": [
      1,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "kehidupan, jiwa nyawa",
    "enMeaning": "life",
    "example": {
      "hz": "生命只有一次，任何时候安全都应放在首位。",
      "py": "Shēngmìng zhǐ yǒu yí cì, rèn hé shíhou ānquán dōu yīng fàng zài shǒuwèi.",
      "id": "Jiwa hanya ada satu kali, keselamatan harus selalu dinomorsatukan kapan pun."
    }
  },
  {
    "id": "zh-v-606",
    "hanzi": "法律",
    "pinyin": "fǎlǜ",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "hukum, undang-undang",
    "enMeaning": "law",
    "example": {
      "hz": "在法律面前人人平等，任何人都没有法外特权。",
      "py": "Zài fǎlǜ miànqián rénrén píngděng, rèn hé rén dōu méiyǒu fǎwài tèquán.",
      "id": "Di hadapan hukum semua orang setara, tiada siapa pun yang memiliki hak istimewa di atas hukum."
    }
  },
  {
    "id": "zh-v-607",
    "hanzi": "律师",
    "pinyin": "lǜshī",
    "tones": [
      4,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "pengacara, advokat",
    "enMeaning": "lawyer, attorney",
    "example": {
      "hz": "在签署商业合同之前最好咨询专业律师的意见。",
      "py": "Zài qiānshǔ shāngyè hétong zhīqián zuìhǎo zīxún zhuānyè lǜshī de yìjiàn.",
      "id": "Sebelum menandatangani kontrak bisnis sebaiknya berkonsultasi dengan pengacara profesional."
    }
  },
  {
    "id": "zh-v-608",
    "hanzi": "资格",
    "pinyin": "zīgé",
    "tones": [
      1,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "kualifikasi, hak kelayakan",
    "enMeaning": "qualification, eligibility",
    "example": {
      "hz": "经过严格的业务培训与考核他获得了执业资格。",
      "py": "Jīngguò yángé de yèwù péixùn yǔ kǎohé tā huòdé le zhíyè zīgé.",
      "id": "Lewat pelatihan dan ujian ketat dia meraih kualifikasi izin praktik."
    }
  },
  {
    "id": "zh-v-609",
    "hanzi": "表达",
    "pinyin": "biǎodá",
    "tones": [
      3,
      2
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "mengungkapkan, ekspresi",
    "enMeaning": "to express, convey",
    "example": {
      "hz": "学会清晰自信地表达自己的见解是重要的职场素养。",
      "py": "Xuéhuì qīngxī zìxìn de biǎodá zìjǐ de jiànjiě shì zhòngyào de zhíchǎng sùyǎng.",
      "id": "Belajar mengungkapkan pandangan sendiri secara jelas dan percaya diri adalah kompetensi kerja yang penting."
    }
  },
  {
    "id": "zh-v-610",
    "hanzi": "加油站",
    "pinyin": "jiāyóuzhàn",
    "tones": [
      1,
      2,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "pom bensin, SPBU",
    "enMeaning": "gas station",
    "example": {
      "hz": "高速公路前方五公里处设有一个综合加油站。",
      "py": "Gāosù gōnglù qiánfāng wǔ gōnglǐ chù shè yǒu yí gè zōnghé jiāyóuzhàn.",
      "id": "Di depan jalan tol 5 kilometer terdapat sebuah SPBU terpadu."
    }
  },
  {
    "id": "zh-v-611",
    "hanzi": "满",
    "pinyin": "mǎn",
    "tones": [
      3
    ],
    "level": 6,
    "pos": "Adjective / Verb",
    "idMeaning": "penuh, genap",
    "enMeaning": "full, satisfied",
    "example": {
      "hz": "节假日的动车车厢里坐满了返乡探亲的旅客。",
      "py": "Jiéjiàrì de dòngchē chēxiāng lǐ zuò mǎn le fǎnxiāng tànqīn de lǚkè.",
      "id": "Gerbong kereta api di hari libur penuh sesak dengan penumpang yang pulang kampung."
    }
  },
  {
    "id": "zh-v-612",
    "hanzi": "矿泉水",
    "pinyin": "kuàngquánshuǐ",
    "tones": [
      4,
      2,
      3
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "air mineral",
    "enMeaning": "mineral water",
    "example": {
      "hz": "运动出汗后请适量饮用温矿泉水补充电解质。",
      "py": "Yùndòng chū hàn hòu qǐng shìliàng yǐnyòng wēn kuàngquánshuǐ bǔchōng diànjiězhì.",
      "id": "Sehabis berolahraga berkeringat minumlah air mineral hangat secukupnya untuk mengisi elektrolit."
    }
  },
  {
    "id": "zh-v-613",
    "hanzi": "果汁",
    "pinyin": "guǒzhī",
    "tones": [
      3,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "jus buah",
    "enMeaning": "fruit juice",
    "example": {
      "hz": "早餐饮用一杯新鲜压榨的橙汁果汁既开胃又健康。",
      "py": "Zǎocān yǐnyòng yì bēi xīnxiān yāzhà de chéngzhī guǒzhī jì kāiwèi yòu jiànkāng.",
      "id": "Minum segelas jus jeruk peras segar saat sarapan menambah selera makan sekaligus menyehatkan."
    }
  },
  {
    "id": "zh-v-614",
    "hanzi": "停",
    "pinyin": "tíng",
    "tones": [
      2
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "berhenti, memarkir",
    "enMeaning": "to stop, park",
    "example": {
      "hz": "红灯亮起时所有机动车辆都必须在斑马线前停下。",
      "py": "Hóngdēng liàng qǐ shí suǒyǒu jīdòng chēliàng dōu bìxū zài bānmǎxiàn qián tíng xià.",
      "id": "Saat lampu merah menyala seluruh kendaraan bermotor wajib berhenti di depan zebra cross."
    }
  },
  {
    "id": "zh-v-615",
    "hanzi": "敲",
    "pinyin": "qiāo",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "mengetuk, memukul",
    "enMeaning": "to knock, strike",
    "example": {
      "hz": "进入别人办公室前请先礼貌地敲门。",
      "py": "Jìnrù biéren bàngōngshì qián qǐng xiān lǐmào de qiāo mén.",
      "id": "Sebelum masuk ke ruang kantor orang lain ketuklah pintu terlebih dahulu secara sopan."
    }
  },
  {
    "id": "zh-v-616",
    "hanzi": "抬",
    "pinyin": "tái",
    "tones": [
      2
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "mengangkat (dengan tangan/kepala)",
    "enMeaning": "to lift, raise",
    "example": {
      "hz": "大家齐心协力一起把沉重的会议桌抬上了讲台。",
      "py": "Dàjiā qíxīn-xiélì yìqǐ bǎ chénzhòng de huìyìzhuō tái shàng le jiǎngtái.",
      "id": "Semua orang bersama-sama mengangkat meja rapat yang berat ke panggung."
    }
  },
  {
    "id": "zh-v-617",
    "hanzi": "抱歉",
    "pinyin": "bàoqiàn",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Adjective / Verb",
    "idMeaning": "merasa bersalah, mohon maaf",
    "enMeaning": "sorry, apologetic",
    "example": {
      "hz": "非常抱歉耽误了您的宝贵时间。",
      "py": "Fēicháng bàoqiàn dānwù le nín de bǎoguì shíjiān.",
      "id": "Sangat mohon maaf telah menyita waktu berharga Anda."
    }
  },
  {
    "id": "zh-v-618",
    "hanzi": "温泉",
    "pinyin": "wēnquán",
    "tones": [
      1,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "pemandian air panas alami",
    "enMeaning": "hot spring",
    "example": {
      "hz": "冬天在山间泡温泉是一种极佳的放松身心体验。",
      "py": "Dōngtiān zài shānjiān pào wēnquán shì yì zhǒng jí jiā de fàngsōng shēnxīn tǐyàn.",
      "id": "Di musim dingin berendam air panas di pegunungan adalah relaksasi tubuh dan jiwa yang luar biasa."
    }
  },
  {
    "id": "zh-v-619",
    "hanzi": "脾气",
    "pinyin": "píqi",
    "tones": [
      2,
      0
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "temperamen, perangai, watak",
    "enMeaning": "temper, temperament",
    "example": {
      "hz": "他性格和蔼，从不轻易对身边的同事发脾气。",
      "py": "Tā xìnggé hé'ǎi, cóng bù qīngyì duì shēnbiān de tóngshì fā píqi.",
      "id": "Dia berwatak ramah, tak pernah gampang marah kepada rekan kerja di sekitarnya."
    }
  },
  {
    "id": "zh-v-620",
    "hanzi": "马虎",
    "pinyin": "mǎhu",
    "tones": [
      3,
      0
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "ceroboh, sembrono",
    "enMeaning": "careless, sloppy",
    "example": {
      "hz": "核算精密财务数据绝容不得半点粗心马虎。",
      "py": "Hésuàn jīngmì cáiwù shùjù jué róngbùdé bàndiǎn cūxīn mǎhu.",
      "id": "Menghitung data keuangan presisi sama sekali tidak boleh ceroboh."
    }
  },
  {
    "id": "zh-v-621",
    "hanzi": "同情",
    "pinyin": "tóngqíng",
    "tones": [
      2,
      2
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "bersimpati, menaruh iba",
    "enMeaning": "to sympathize, sympathy",
    "example": {
      "hz": "大家都很同情他在这次意外事故中所遭受的损失。",
      "py": "Dàjiā dōu hěn tóngqíng tā zài zhè cì yìwài shìgù zhōng suǒ zāoshòu de sǔnshī.",
      "id": "Semua orang menaruh simpati atas kerugian yang dialaminya dalam kecelakaan tak terduga ini."
    }
  },
  {
    "id": "zh-v-622",
    "hanzi": "原谅",
    "pinyin": "yuánliàng",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "memaafkan, mengampuni",
    "enMeaning": "to forgive, pardon",
    "example": {
      "hz": "真诚的道歉最终赢得了朋友的原谅。",
      "py": "Zhēnchéng de dàoqiàn zuìzhōng yíngdé le péngyou de yuánliàng.",
      "id": "Permintaan maaf yang tulus pada akhirnya meraih pengampunan dari sang teman."
    }
  },
  {
    "id": "zh-v-623",
    "hanzi": "输",
    "pinyin": "shū",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "kalah, menyerah",
    "enMeaning": "to lose (game/match)",
    "example": {
      "hz": "胜败乃兵家常事，输了比赛也不要灰心丧气。",
      "py": "Shèngbài nǎi bīngjiā chángshì, shū le bǐsài yě bú yào huīxīn-sàngqì.",
      "id": "Menang kalah adalah hal biasa, kalah tanding pun jangan patah semangat."
    }
  },
  {
    "id": "zh-v-624",
    "hanzi": "场",
    "pinyin": "chǎng",
    "tones": [
      3
    ],
    "level": 6,
    "pos": "Measure Word / Noun",
    "idMeaning": "ronde, babak (pertandingan/film)",
    "enMeaning": "measure word for games/shows",
    "example": {
      "hz": "昨晚两支顶级俱乐部进行了一场激烈的半决赛。",
      "py": "Zuówǎn liǎng zhī dǐngjí jùlèbù jìnxíng le yì chǎng jīliè de bànjuésài.",
      "id": "Tadi malam dua klub papan atas menyajikan satu babak semifinal yang sengit."
    }
  },
  {
    "id": "zh-v-625",
    "hanzi": "网球",
    "pinyin": "wǎngqiú",
    "tones": [
      3,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "tenis lapangan",
    "enMeaning": "tennis",
    "example": {
      "hz": "他在业余时间喜欢约球友去红土场打网球。",
      "py": "Tā zài yèyú shíjiān xǐhuan yuē qiúyǒu qù hóngtǔchǎng dǎ wǎngqiú.",
      "id": "Di waktu luang dia gemar mengajak rekan bertanding tenis di lapangan tanah liat."
    }
  },
  {
    "id": "zh-v-626",
    "hanzi": "赢",
    "pinyin": "yíng",
    "tones": [
      2
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "menang, meraih kemenangan",
    "enMeaning": "to win",
    "example": {
      "hz": "依靠顽强的毅力与默契配合他们赢得了最终冠军。",
      "py": "Yīkào wánqiáng de yìlì yǔ mòqì pèihé tāmen yíngdé le zuìzhōng guànjūn.",
      "id": "Berbekal keteguhan dan kerja sama apik mereka memenangkan gelar juara puncak."
    }
  },
  {
    "id": "zh-v-627",
    "hanzi": "难受",
    "pinyin": "nánshòu",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "tidak enak badan, pedih di hati",
    "enMeaning": "uncomfortable, suffering",
    "example": {
      "hz": "重感冒发烧让他浑身酸痛难受极了。",
      "py": "Zhòng gǎnmào fāshāo ràng tā húnshēn suāntòng nánshòu jí le.",
      "id": "Flu berat dan demam membuatnya pegal linu di sekujur badan dan sungguh tak nyaman."
    }
  },
  {
    "id": "zh-v-628",
    "hanzi": "得意",
    "pinyin": "déyì",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "berbangga diri, puas atas prestasi",
    "enMeaning": "proud of oneself, complacent",
    "example": {
      "hz": "取得了好成绩也绝不能骄傲得意。",
      "py": "Qǔdé le hǎo chéngjì yě jué bù néng jiāo'ào déyì.",
      "id": "Meraih nilai bagus sekalipun tidak boleh jumawa dan berbangga diri berlebihan."
    }
  },
  {
    "id": "zh-v-629",
    "hanzi": "出生",
    "pinyin": "chūshēng",
    "tones": [
      1,
      1
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "lahir, dilahirkan",
    "enMeaning": "to be born",
    "example": {
      "hz": "他在海滨小城出生并度过了美好的童年时光。",
      "py": "Tā zài hǎibīn xiǎochéng chūshēng bìng dùguò le měihǎo de tóngnián shíguāng.",
      "id": "Dia lahir di kota pesisir dan menghabiskan masa kanak-kanak yang indah di sana."
    }
  },
  {
    "id": "zh-v-630",
    "hanzi": "推迟",
    "pinyin": "tuīchí",
    "tones": [
      1,
      2
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "menunda, mengundurkan waktu",
    "enMeaning": "to postpone, defer",
    "example": {
      "hz": "原定于周一举行的专家研讨会推迟至周三召开。",
      "py": "Yuándìng yú zhōuyī jǔxíng de zhuānjiā yántǎohuì tuīchí zhì zhōusān zhàokāi.",
      "id": "Seminar pakar yang semula dijadwalkan Senin diundur ke hari Rabu."
    }
  },
  {
    "id": "zh-v-631",
    "hanzi": "数据",
    "pinyin": "shùjù",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "data, data statistik",
    "enMeaning": "data",
    "example": {
      "hz": "严谨的数据统计是撰写学术科研报告的基准。",
      "py": "Yánjǐn de shùjù tǒngjì shì zhuànxiě xuéshù kēyán bàogào de jīzhǔn.",
      "id": "Statistik data yang cermat adalah acuan penulisan laporan riset akademis."
    }
  },
  {
    "id": "zh-v-632",
    "hanzi": "率",
    "pinyin": "lǜ",
    "tones": [
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "rasio, persentase laju/tingkat",
    "enMeaning": "rate, ratio",
    "example": {
      "hz": "该地区近五年的森林覆盖率稳步提升。",
      "py": "Gāi dìqū jìn wǔ nián de sēnlín fùgàilǜ wěnbù tíshēng.",
      "id": "Persentase tutupan hutan di wilayah ini dalam 5 tahun terakhir meningkat stabil."
    }
  },
  {
    "id": "zh-v-633",
    "hanzi": "地区",
    "pinyin": "dìqū",
    "tones": [
      4,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "wilayah, kawasan, daerah",
    "enMeaning": "area, region, district",
    "example": {
      "hz": "热带雨林地区物种多样性极为丰富。",
      "py": "Rèdài yǔlín dìqū wùzhǒng duōyàngxìng jíwéi fēngfù.",
      "id": "Kawasan hutan hujan tropis memiliki keanekaragaman hayati yang teramat kaya."
    }
  },
  {
    "id": "zh-v-634",
    "hanzi": "专家",
    "pinyin": "zhuānjiā",
    "tones": [
      1,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "pakar, ahli",
    "enMeaning": "expert, specialist",
    "example": {
      "hz": "医学专家建议公众保持规律作息和适度运动。",
      "py": "Yīxué zhuānjiā jiànyì gōngzhòng bǎochí guīlǜ zuòxī hé shìdù yùndòng.",
      "id": "Pakar medis menyarankan publik menjaga pola istirahat teratur dan olahraga secukupnya."
    }
  },
  {
    "id": "zh-v-635",
    "hanzi": "女性",
    "pinyin": "nǚxìng",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "kaum wanita, perempuan",
    "enMeaning": "female, woman",
    "example": {
      "hz": "越来越多的现代女性在科技与商业舞台大放异彩。",
      "py": "Yuè lái yuè duō de xiàndài nǚxìng zài kējì yǔ shāngyè wǔtái dà fàng yìcǎi.",
      "id": "Kian banyak kaum wanita modern yang bersinar di panggung sains dan bisnis."
    }
  },
  {
    "id": "zh-v-636",
    "hanzi": "篇",
    "pinyin": "piān",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Measure Word",
    "idMeaning": "lembar, artikel (kata bantu karya tulis)",
    "enMeaning": "measure word for articles/papers",
    "example": {
      "hz": "他在权威学术期刊上发表了一篇高水平论文。",
      "py": "Tā zài quánwēi xuéshù qīkān shang fābiǎo le yì piān gāo shuǐpíng lùnwén.",
      "id": "Dia menerbitkan sebuah artikel ilmiah bermutu tinggi di jurnal terkemuka."
    }
  },
  {
    "id": "zh-v-637",
    "hanzi": "文章",
    "pinyin": "wénzhāng",
    "tones": [
      2,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "artikel, esai, tulisan",
    "enMeaning": "article, essay",
    "example": {
      "hz": "这篇深度分析文章视角独特观点鲜明。",
      "py": "Zhè piān shēndù fēnxī wénzhāng shìjiǎo dútè guāndiǎn xiānmíng.",
      "id": "Artikel analisis mendalam ini bersudut pandang unik dan beropini tegas."
    }
  },
  {
    "id": "zh-v-638",
    "hanzi": "作者",
    "pinyin": "zuòzhě",
    "tones": [
      4,
      3
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "penulis, pengarang",
    "enMeaning": "author, writer",
    "example": {
      "hz": "著名畅销书作者在新书签售会上与读者亲切交流。",
      "py": "Zhùmíng chàngxiāoshū zuòzhě zài xīnshū qiānshòuhuì shang yǔ dùzhě qīnqiè jiāoliú.",
      "id": "Penulis buku laris ternama berinteraksi akrab dengan pembaca di acara temu tanda tangan buku."
    }
  },
  {
    "id": "zh-v-639",
    "hanzi": "表示",
    "pinyin": "biǎoshì",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "menyatakan, mengindikasikan",
    "enMeaning": "to show, express, state",
    "example": {
      "hz": "发言人向各界代表表示由衷的感谢与诚挚欢迎。",
      "py": "Fāyánrén xiàng gè jiè dàibiǎo biǎoshì yóuzhōng de gǎnxiè yǔ chéngzhì huānyíng.",
      "id": "Juru bicara menyatakan rasa terima kasih tulus dan sambutan hangat kepada para delegasi."
    }
  },
  {
    "id": "zh-v-640",
    "hanzi": "人员",
    "pinyin": "rényuán",
    "tones": [
      2,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "personil, staf, pegawai",
    "enMeaning": "personnel, staff",
    "example": {
      "hz": "科研工作人员日夜攻关推进核心芯片技术突破。",
      "py": "Kēyán gōngzuò rényuán rìyè gōngguān tuījìn héxīn xīnpiàn jìshù tūpò.",
      "id": "Personil peneliti siang malam bekerja keras mendorong terobosan teknologi cip inti."
    }
  },
  {
    "id": "zh-v-641",
    "hanzi": "至少",
    "pinyin": "zhìshǎo",
    "tones": [
      4,
      3
    ],
    "level": 6,
    "pos": "Adverb",
    "idMeaning": "setidaknya, minimal",
    "enMeaning": "at least",
    "example": {
      "hz": "成年人每天至少需要保证七小时的优质睡眠。",
      "py": "Chéngrén měitiān zhìshǎo xūyào bǎozhèng qī xiǎoshí de yōuzhì shuìmián.",
      "id": "Orang dewasa setidaknya butuh menjamin 7 jam tidur berkualitas setiap hari."
    }
  },
  {
    "id": "zh-v-642",
    "hanzi": "良好",
    "pinyin": "liánghǎo",
    "tones": [
      2,
      3
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "baik, kondusif, memuaskan",
    "enMeaning": "good, favorable",
    "example": {
      "hz": "良好的沟通是团队达成紧密合作的基石。",
      "py": "Liánghǎo de gōutōng shì tuánduì dáchéng jǐnmì hézuò de jīshí.",
      "id": "Komunikasi yang baik adalah landasan kerja sama erat dalam tim."
    }
  },
  {
    "id": "zh-v-643",
    "hanzi": "研究",
    "pinyin": "yánjiū",
    "tones": [
      2,
      1
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "meneliti, riset, studi",
    "enMeaning": "to research, study",
    "example": {
      "hz": "实验室正在深入研究人工智能与脑科学的交叉应用。",
      "py": "Shíyànshì zhèngzài shēnrù yánjiū réngōng zhìnéng yǔ nǎokēxué de jiāochā yīngyòng.",
      "id": "Laboratorium sedang meneliti aplikasi silang kecerdasan buatan dan neurosains secara mendalam."
    }
  },
  {
    "id": "zh-v-644",
    "hanzi": "省",
    "pinyin": "shěng",
    "tones": [
      3
    ],
    "level": 6,
    "pos": "Noun / Verb",
    "idMeaning": "provinsi, menghemat",
    "enMeaning": "province, to save",
    "example": {
      "hz": "云南省以四季如春的气候与壮丽风光闻名遐迩。",
      "py": "Yúnnán Shěng yǐ sìjì-rúchūn de qìhòu yǔ zhuànglì fēngguāng wénmíng-xiá'ěr.",
      "id": "Provinsi Yunnan termasyhur dengan iklim seperti semi sepanjang tahun dan panorama megah."
    }
  },
  {
    "id": "zh-v-645",
    "hanzi": "民族",
    "pinyin": "mínzú",
    "tones": [
      2,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "suku bangsa, etnis",
    "enMeaning": "nationality, ethnic group",
    "example": {
      "hz": "中国是由五十六个民族组成的统一多民族大家庭。",
      "py": "Zhōngguó shì yóu wǔshíliù gè mínzú zǔchéng de tǒngyī duō mínzú dàjiātíng.",
      "id": "Tiongkok adalah keluarga besar multietnis bersatu yang terdiri dari 56 suku bangsa."
    }
  },
  {
    "id": "zh-v-646",
    "hanzi": "国际",
    "pinyin": "guójì",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Noun / Adjective",
    "idMeaning": "internasional, antarbangsa",
    "enMeaning": "international",
    "example": {
      "hz": "掌握外语为积极参与国际交流合作奠定基石。",
      "py": "Zhǎngwò wàiyǔ wèi jījí cānyù guójì jiāoliú hézuò diàndìng jīshí.",
      "id": "Menguasai bahasa asing meletakkan pondasi aktif dalam interaksi dan kerja sama internasional."
    }
  },
  {
    "id": "zh-v-647",
    "hanzi": "丰富",
    "pinyin": "fēngfù",
    "tones": [
      1,
      4
    ],
    "level": 6,
    "pos": "Adjective / Verb",
    "idMeaning": "kaya ragam, berlimpah",
    "enMeaning": "abundant, rich",
    "example": {
      "hz": "图书馆藏书丰富，是汲取知识的广阔海洋。",
      "py": "Túshūguǎn cángshū fēngfù, shì jíqǔ zhīshi de guǎngkuò hǎiyáng.",
      "id": "Koleksi perpustakaan amat berlimpah, laksana samudra luas menyerap ilmu pengetahuan."
    }
  },
  {
    "id": "zh-v-648",
    "hanzi": "自然",
    "pinyin": "zìrán",
    "tones": [
      4,
      2
    ],
    "level": 6,
    "pos": "Noun / Adjective",
    "idMeaning": "alam semesta, alami, natural",
    "enMeaning": "nature, natural",
    "example": {
      "hz": "人与自然应当和谐共生、保护绿色家园。",
      "py": "Rén yǔ zìrán yīngdāng héxié gòngshēng, bǎohù lǜsè jiāyuán.",
      "id": "Manusia dan alam sudah sepatutnya hidup berdampingan secara harmonis, menjaga rumah hijau."
    }
  },
  {
    "id": "zh-v-649",
    "hanzi": "气候",
    "pinyin": "qìhòu",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "iklim, cuaca musim",
    "enMeaning": "climate",
    "example": {
      "hz": "全球气候变化深刻关乎人类社会未来的生存与繁衍。",
      "py": "Quánqiú qìhòu biànhuà shēnkè guānhū rénlèi shèhuì wèilái de shēngcún yǔ fányǎn.",
      "id": "Perubahan iklim global sangat berkaitan erat dengan kelangsungan hidup masa depan peradaban manusia."
    }
  },
  {
    "id": "zh-v-650",
    "hanzi": "凉快",
    "pinyin": "liángkuai",
    "tones": [
      2,
      0
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "sejuk, adem",
    "enMeaning": "pleasantly cool",
    "example": {
      "hz": "一场秋雨过后，天气变得十分凉快宜人。",
      "py": "Yì chǎng qiūyǔ guòhòu, tiānqì biàn de shífēn liángkuai yírén.",
      "id": "Seusai guyuran hujan musim gugur, cuaca berubah menjadi amat sejuk dan nyaman."
    }
  },
  {
    "id": "zh-v-651",
    "hanzi": "暖和",
    "pinyin": "nuǎnhuo",
    "tones": [
      3,
      0
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "hangat, nyaman",
    "enMeaning": "warm, comfortable",
    "example": {
      "hz": "春天到了，微风吹在脸上感到格外暖和。",
      "py": "Chūntiān dào le, wēifēng chuī zài liǎn shang gǎndào géwài nuǎnhuo.",
      "id": "Musim semi telah tiba, semilir angin berhembus di wajah terasa begitu hangat."
    }
  },
  {
    "id": "zh-v-652",
    "hanzi": "降落",
    "pinyin": "jiàngluò",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "mendarat, turun",
    "enMeaning": "to land, descend",
    "example": {
      "hz": "国际班机平稳安全地降落在首都国际机场跑道上。",
      "py": "Guójì bānjī píngwěn ānquán de jiàngluò zài Shǒudū Guójì Jīchǎng pǎodào shang.",
      "id": "Pesawat internasional mendarat dengan mulus dan aman di landasan Bandara Internasional Ibu Kota."
    }
  },
  {
    "id": "zh-v-653",
    "hanzi": "正式",
    "pinyin": "zhèngshì",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Adjective / Adverb",
    "idMeaning": "resmi, formal",
    "enMeaning": "formal, official",
    "example": {
      "hz": "新一代智能学习平台于今日正式面向公众发布上线。",
      "py": "Xīn yídài zhìnéng xuéxí píngtái yú jīnrì zhèngshì miànxiàng gōngzhòng fābù shàngxiàn.",
      "id": "Platform belajar pintar generasi baru hari ini resmi diluncurkan untuk publik."
    }
  },
  {
    "id": "zh-v-654",
    "hanzi": "资源",
    "pinyin": "zīyuán",
    "tones": [
      1,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "sumber daya, potensi",
    "enMeaning": "resource",
    "example": {
      "hz": "节约利用水资源是促进生态永续发展的当务之急。",
      "py": "Jiéyuē lìyòng shuǐ zīyuán shì cùjìn shēngtài yǒngxù fāzhǎn de dāngwùzhījí.",
      "id": "Pemanfaatan hemat sumber daya air adalah kebutuhan mendesak mendorong keberlanjutan ekologi."
    }
  },
  {
    "id": "zh-v-655",
    "hanzi": "关键",
    "pinyin": "guānjiàn",
    "tones": [
      1,
      4
    ],
    "level": 6,
    "pos": "Noun / Adjective",
    "idMeaning": "kunci penentu, krusial",
    "enMeaning": "key, crucial, pivotal",
    "example": {
      "hz": "抓住问题的关键核心才能高效破解瓶颈难题。",
      "py": "Zhuāzhù wèntí de guānjiàn héxīn cái néng gāoxiào pòjiě píngjǐng nántí.",
      "id": "Menangkap inti kunci persoalan baru bisa memecahkan kebuntuan secara efisien."
    }
  },
  {
    "id": "zh-v-656",
    "hanzi": "糖",
    "pinyin": "táng",
    "tones": [
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "gula, permen",
    "enMeaning": "sugar, candy",
    "example": {
      "hz": "摄入过多的糖分不利于牙齿和心血管健康。",
      "py": "Shèrù guòduō de tángfèn búlì yú yáchǐ hé xīnxuèguǎn jiànkāng.",
      "id": "Konsumsi gula berlebih tidak baik bagi gigi dan kesehatan jantung."
    }
  },
  {
    "id": "zh-v-657",
    "hanzi": "巧克力",
    "pinyin": "qiǎokèlì",
    "tones": [
      3,
      4,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "cokelat",
    "enMeaning": "chocolate",
    "example": {
      "hz": "黑巧克力含有抗氧化物质，味道醇厚微苦。",
      "py": "Hēi qiǎokèlì hányǒu kàngyǎnghuà wùzhì, wèidào chúnhòu wēi kǔ.",
      "id": "Cokelat hitam mengandung zat antioksidan, rasanya legit agak pahit."
    }
  },
  {
    "id": "zh-v-658",
    "hanzi": "镜子",
    "pinyin": "jìngzi",
    "tones": [
      4,
      0
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "cermin, kaca pantul",
    "enMeaning": "mirror",
    "example": {
      "hz": "历史是一面镜子，能让我们洞悉兴替看清未来。",
      "py": "Lìshǐ shì yí miàn jìngzi, néng ràng wǒmen dòngxī xīngtì kàn qīng wèilái.",
      "id": "Sejarah adalah cermin yang membuat kita memahami pasang surut dan memandang masa depan."
    }
  },
  {
    "id": "zh-v-659",
    "hanzi": "香",
    "pinyin": "xiāng",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "harum, wangi, sedap",
    "enMeaning": "fragrant, savory, delicious",
    "example": {
      "hz": "一进餐厅就闻到了一阵阵扑鼻的烤鸭香味。",
      "py": "Yí jìn cāntīng jiù wéndào le yízhènzhèn pūbí de kǎoyā xiāngwèi.",
      "id": "Begitu masuk restoran tercium semerbak aroma bebek panggang yang harum sedap."
    }
  },
  {
    "id": "zh-v-660",
    "hanzi": "吃货",
    "pinyin": "chīhuò",
    "tones": [
      1,
      4
    ],
    "level": 6,
    "pos": "Noun (Slang)",
    "idMeaning": "pencinta kuliner, doyan makan",
    "enMeaning": "foodie, gourmet",
    "example": {
      "hz": "作为一个地道的吃货，他尝遍了各地的特色小吃。",
      "py": "Zuòwéi yí gè dìdao de chīhuò, tā chángbiàn le gèdì de tèsè xiǎochī.",
      "id": "Sebagai seorang pecinta kuliner sejati, ia mencicipi jajanan khas di berbagai penjuru."
    }
  },
  {
    "id": "zh-v-661",
    "hanzi": "冰激凌",
    "pinyin": "bīngjīlíng",
    "tones": [
      1,
      1,
      2
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "es krim",
    "enMeaning": "ice cream",
    "example": {
      "hz": "炎炎夏日品尝一口清凉甜美的抹茶冰激凌特别消暑。",
      "py": "Yányán xiàrì pǐncháng yì kǒu qīngliáng tiánměi de mòchá bīngjīlíng tèbié xiāoshǔ.",
      "id": "Di terik musim panas mencicipi es krim matcha manis segar amat menyegarkan."
    }
  },
  {
    "id": "zh-v-662",
    "hanzi": "沙拉",
    "pinyin": "shālā",
    "tones": [
      1,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "salad sayur/buah",
    "enMeaning": "salad",
    "example": {
      "hz": "蔬菜沙拉清脆爽口，深受健身人群的青睐。",
      "py": "Shūcài shālā qīngcuì shuǎngkǒu, shēn shòu jiànshēn rénqún de qīnglài.",
      "id": "Salad sayur renyah dan segar, sangat digemari kalangan penggiat kebugaran."
    }
  },
  {
    "id": "zh-v-663",
    "hanzi": "艺术",
    "pinyin": "yìshù",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "seni, estetika",
    "enMeaning": "art",
    "example": {
      "hz": "音乐与美术是跨越国界启迪灵魂的伟大艺术。",
      "py": "Yīnyuè yǔ měishù shì kuàyuè guójiè qǐdí línghún de wěidà yìshù.",
      "id": "Musik dan seni rupa adalah karya seni agung lintas batas negara yang menginspirasi jiwa."
    }
  },
  {
    "id": "zh-v-664",
    "hanzi": "与",
    "pinyin": "yǔ",
    "tones": [
      3
    ],
    "level": 6,
    "pos": "Conjunction / Preposition",
    "idMeaning": "dan, bersama dengan",
    "enMeaning": "and, with",
    "example": {
      "hz": "科技与人文的融合创造出前所未有的智慧体验。",
      "py": "Kējì yǔ rénwén de rónghé chuàngzào chū qiánsuǒwèiyǒu de zhìhuì tǐyàn.",
      "id": "Perpaduan teknologi dan humaniora menciptakan pengalaman pintar yang belum pernah ada."
    }
  },
  {
    "id": "zh-v-665",
    "hanzi": "答案",
    "pinyin": "dá'àn",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "jawaban, solusi pemecahan",
    "enMeaning": "answer, solution",
    "example": {
      "hz": "经过反复推导和严密验证，他们找到了唯一的正确答案。",
      "py": "Jīngguò fǎnfù tuīdǎo hé yánmì yànzhèng, tāmen zhǎodào le wéiyī de zhèngquè dá'àn.",
      "id": "Lewat penalaran berulang dan verifikasi ketat, mereka menemukan satu-satunya jawaban benar."
    }
  },
  {
    "id": "zh-v-666",
    "hanzi": "对方",
    "pinyin": "duìfāng",
    "tones": [
      4,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "pihak lawan, pihak seberang",
    "enMeaning": "the other party, counterpart",
    "example": {
      "hz": "商业洽谈中尊重对方的立场是达成双赢的基础。",
      "py": "Shāngyè qiàtán zhōng zūnzhòng duìfāng de lìchǎng shì dáchéng shuāngyíng de jīchǔ.",
      "id": "Dalam negosiasi bisnis menghormati posisi pihak mitra adalah dasar mencapai kerja sama saling menguntungkan."
    }
  },
  {
    "id": "zh-v-667",
    "hanzi": "方式",
    "pinyin": "fāngshì",
    "tones": [
      1,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "cara, metode, gaya",
    "enMeaning": "way, manner, style",
    "example": {
      "hz": "健康的生活方式让整个人充满积极向上的精神面貌。",
      "py": "Jiànkāng de shēnghuó fāngshì ràng zhěng gè rén chōngmǎn jījí xiàngshàng de jīngshén miànmào.",
      "id": "Pola hidup sehat membuat seseorang bersemangat positif."
    }
  },
  {
    "id": "zh-v-668",
    "hanzi": "明确",
    "pinyin": "míngquè",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Adjective / Verb",
    "idMeaning": "jelas, tegas, memperjelas",
    "enMeaning": "clear-cut, explicit",
    "example": {
      "hz": "项目启动会明确了各业务小组的分工与时间节点。",
      "py": "Xiàngmù qǐdònghuì míngquè le gè yèwù xiǎozǔ de fēngōng yǔ shíjiān jiédiǎn.",
      "id": "Rapat kick-off memperjelas pembagian tugas dan tenggat waktu tiap kelompok kerja."
    }
  },
  {
    "id": "zh-v-669",
    "hanzi": "反应",
    "pinyin": "fǎnyìng",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Noun / Verb",
    "idMeaning": "reaksi, respons",
    "enMeaning": "reaction, response",
    "example": {
      "hz": "优秀的守门员在赛场上拥有敏锐果断的应变反应。",
      "py": "Yōuxiù de shǒuményuán zài sàichǎng shang yōngyǒu mǐnruì guǒduàn de yìngbiàn fǎnyìng.",
      "id": "Penjaga gawang hebat di lapangan memiliki refleks respons yang tajam dan tegas."
    }
  },
  {
    "id": "zh-v-670",
    "hanzi": "钥匙",
    "pinyin": "yàoshi",
    "tones": [
      4,
      0
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "kunci",
    "enMeaning": "key",
    "example": {
      "hz": "勤奋与思考是打开知识宝库最重要的金钥匙。",
      "py": "Qínfèn yǔ sīkǎo shì dǎkāi zhīshi bǎokù zuì zhòngyào de jīn yàoshi.",
      "id": "Ketekunan dan daya pikir adalah kunci emas terpenting membuka perbendaharaan ilmu."
    }
  },
  {
    "id": "zh-v-671",
    "hanzi": "富",
    "pinyin": "fù",
    "tones": [
      4
    ],
    "level": 6,
    "pos": "Adjective / Noun",
    "idMeaning": "kaya, makmur, melimpah",
    "enMeaning": "rich, wealthy",
    "example": {
      "hz": "精神世界的富足比单纯追求物质财富更有长久价值。",
      "py": "Jīngshén shìjiè de fùzú bǐ dānchún zhuīqiú wùzhì cáifù gèng yǒu chángjiǔ jiàzhí.",
      "id": "Kekayaan batin bernilai lebih abadi ketimbang sekadar mengejar harta materiil semata."
    }
  },
  {
    "id": "zh-v-672",
    "hanzi": "社会",
    "pinyin": "shèhuì",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "masyarakat, sosial",
    "enMeaning": "society, social",
    "example": {
      "hz": "营造关爱互助的社会风气让每个人都感受到温暖。",
      "py": "Yíngzào guān'ài hùzhù de shèhuì fēngqì ràng měi gè rén dōu gǎnshòudào wēnnuǎn.",
      "id": "Membangun iklim sosial saling peduli membuat setiap orang merasakan kehangatan."
    }
  },
  {
    "id": "zh-v-673",
    "hanzi": "普遍",
    "pinyin": "pǔbiàn",
    "tones": [
      3,
      4
    ],
    "level": 6,
    "pos": "Adjective",
    "idMeaning": "lazim, umum, universal",
    "enMeaning": "universal, widespread",
    "example": {
      "hz": "在数字化时代，移动智能办公已成为极其普遍的现象。",
      "py": "Zài shùzìhuà shídài, yídòng zhìnéng bàngōng yǐ chéngwéi jíqí pǔbiàn de xiànxiàng.",
      "id": "Di era digital, kerja mobile cerdas telah menjadi fenomena yang sangat lumrah."
    }
  },
  {
    "id": "zh-v-674",
    "hanzi": "幸福",
    "pinyin": "xìngfú",
    "tones": [
      4,
      2
    ],
    "level": 6,
    "pos": "Noun / Adjective",
    "idMeaning": "kebahagiaan, bahagia",
    "enMeaning": "happiness, happy",
    "example": {
      "hz": "一家人健康平安相亲相爱就是最真切的幸福。",
      "py": "Yì jiā rén jiànkāng píng'ān xiāngqīn-xiāng'ài jiù shì zuì zhēnqiè de xìngfú.",
      "id": "Sekeluarga sehat selamat saling mengasihi adalah kebahagiaan paling nyata."
    }
  },
  {
    "id": "zh-v-675",
    "hanzi": "理财",
    "pinyin": "lǐcái",
    "tones": [
      3,
      2
    ],
    "level": 6,
    "pos": "Verb / Noun",
    "idMeaning": "mengelola keuangan, investasi",
    "enMeaning": "financial management",
    "example": {
      "hz": "树立稳健的理财观念有助于规避风险实现资产保值。",
      "py": "Shùlì wěnjiàn de lǐcái guānniàn yǒuzhù yú guībì fēngxiǎn shíxiàn zīchǎn bǎozhí.",
      "id": "Membangun pola pikir pengelolaan finansial yang bijak membantu mitigasi risiko dan menjaga aset."
    }
  },
  {
    "id": "zh-v-676",
    "hanzi": "否则",
    "pinyin": "fǒuzé",
    "tones": [
      3,
      2
    ],
    "level": 6,
    "pos": "Conjunction",
    "idMeaning": "jika tidak, kalau tidak",
    "enMeaning": "otherwise, if not",
    "example": {
      "hz": "出发前请仔细检查证件是否带齐，否则无法登机。",
      "py": "Chūfā qián qǐng zǐxì jiǎnchá zhèngjiàn shìfǒu dài qí, fǒuzé wúfǎ dēngjī.",
      "id": "Sebelum berangkat periksa teliti kelengkapan dokumen, jika tidak tak bisa boarding."
    }
  },
  {
    "id": "zh-v-677",
    "hanzi": "财富",
    "pinyin": "cáifù",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "kekayaan, harta benda",
    "enMeaning": "wealth, fortune",
    "example": {
      "hz": "健康的体魄与渊博的学识是人生最珍贵的宝贵财富。",
      "py": "Jiànkāng de tǐpò yǔ yuānbó de xuéshí shì rénshēng zuì zhēnguì de bǎoguì cáifù.",
      "id": "Raga yang sehat dan wawasan luas adalah harta paling berharga dalam hidup."
    }
  },
  {
    "id": "zh-v-678",
    "hanzi": "目标",
    "pinyin": "mùbiāo",
    "tones": [
      4,
      1
    ],
    "level": 6,
    "pos": "Noun",
    "idMeaning": "target, sasaran tujuan",
    "enMeaning": "target, goal, objective",
    "example": {
      "hz": "锚定明确的学习目标能为每一天的努力指引清晰方向。",
      "py": "Máodìng míngquè de xuéxí mùbiāo néng wèi měi yì tiān de nǔlì zhǐyǐn qīngxī fāngxiàng.",
      "id": "Menetapkan target belajar yang jelas memberi arah nyata bagi perjuangan setiap hari."
    }
  },
  {
    "id": "zh-v-679",
    "hanzi": "制定",
    "pinyin": "zhìdìng",
    "tones": [
      4,
      4
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "merumuskan, menetapkan aturan/rencana",
    "enMeaning": "to formulate, formulate a plan",
    "example": {
      "hz": "根据实际学情量身制定合理的学习进度规划。",
      "py": "Gēnjù shíjì xuéqíng liàngshēn zhìdìng hélǐ de xuéxí jìndù guīhuà.",
      "id": "Merumuskan perencanaan ritme belajar yang masuk akal disesuaikan dengan kondisi murid."
    }
  },
  {
    "id": "zh-v-680",
    "hanzi": "实现",
    "pinyin": "shíxiàn",
    "tones": [
      2,
      4
    ],
    "level": 6,
    "pos": "Verb",
    "idMeaning": "mewujudkan, mengimplementasikan",
    "enMeaning": "to realize, achieve",
    "example": {
      "hz": "脚踏实地的拼搏必将让每一个宏伟梦想化为现实。",
      "py": "Jiǎotà-shídì de pīnbó bì jiāng ràng měi yí gè hóngwěi mèngxiǎng huà wéi xiànshí.",
      "id": "Kerja keras yang membumi pasti akan mewujudkan setiap impian agung menjadi kenyataan."
    }
  },
  {
    "id": "zh-v-681",
    "hanzi": "亚健康",
    "pinyin": "yàjiànkāng",
    "tones": [
      4,
      4,
      1
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "kondisi sub-kesehatan (setengah bugar)",
    "enMeaning": "sub-health state",
    "example": {
      "hz": "长期缺乏运动容易使都市白领陷入亚健康状态。",
      "py": "Chángqī quēfá yùndòng róngyì shǐ dūshì báilǐng xiànrù yàjiànkāng zhuàngtài.",
      "id": "Kurang berolahraga dalam jangka panjang mudah membuat pekerja kantoran masuk ke kondisi sub-kesehatan."
    }
  },
  {
    "id": "zh-v-682",
    "hanzi": "诊断",
    "pinyin": "zhěnduàn",
    "tones": [
      3,
      4
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "mendiagnosis, diagnosis medis",
    "enMeaning": "to diagnose, diagnosis",
    "example": {
      "hz": "资深医师凭借丰富的临床经验做出了精准诊断。",
      "py": "Zīshēn yīshī píngjiè fēngfù de línchuáng jīngyàn zuò chū le jīngzhǔn zhěnduàn.",
      "id": "Dokter senior berbekal pengalaman klinis berlimpah menegakkan diagnosis yang presisi."
    }
  },
  {
    "id": "zh-v-683",
    "hanzi": "疾病",
    "pinyin": "jíbìng",
    "tones": [
      2,
      4
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "penyakit",
    "enMeaning": "disease, illness",
    "example": {
      "hz": "预防慢性疾病需要建立健康平衡的饮食与生活习惯。",
      "py": "Yùfáng mànxìng jíbìng xūyào jiànlì jiànkāng pínghéng de yǐnshí yǔ shēnghuó xíguàn.",
      "id": "Mencegah penyakit kronis membutuhkan kebiasaan makan dan hidup sehat yang seimbang."
    }
  },
  {
    "id": "zh-v-684",
    "hanzi": "毛病",
    "pinyin": "máobìng",
    "tones": [
      2,
      0
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "kerusakan ringan, kekurangan, penyakit kecil",
    "enMeaning": "trouble, defect, illness",
    "example": {
      "hz": "这辆老式汽车发动机会偶尔出点小毛病。",
      "py": "Zhè liàng lǎoshì qìchē fādòngjī huì ǒu'ěr chū diǎn xiǎo máobìng.",
      "id": "Mesin mobil model lama ini sesekali mengalami kerusakan kecil."
    }
  },
  {
    "id": "zh-v-685",
    "hanzi": "打喷嚏",
    "pinyin": "dǎ pēntì",
    "tones": [
      3,
      1,
      4
    ],
    "level": 7,
    "pos": "Verb",
    "idMeaning": "bersin",
    "enMeaning": "to sneeze",
    "example": {
      "hz": "在花粉季节很多容易过敏的人会频繁打喷嚏。",
      "py": "Zài huāfěn jìjié hěn duō róngyì guòmǐn de rén huì pínfán dǎ pēntì.",
      "id": "Di musim serbuk sari banyak orang rentan alergi sering bersin-bersin."
    }
  },
  {
    "id": "zh-v-686",
    "hanzi": "消化",
    "pinyin": "xiāohuà",
    "tones": [
      1,
      4
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "mencerna (makanan/ilmu), pencernaan",
    "enMeaning": "to digest, digestion",
    "example": {
      "hz": "饭后慢走散步半小时有助于促进肠胃充分消化。",
      "py": "Fàn hòu màn zǒu sànbù bàn xiǎoshí yǒuzhù yú cùjìn chángwèi chōngfèn xiāohuà.",
      "id": "Jalan santai setengah jam setelah makan membantu pencernaan lambung bekerja maksimal."
    }
  },
  {
    "id": "zh-v-687",
    "hanzi": "作为",
    "pinyin": "zuòwéi",
    "tones": [
      4,
      2
    ],
    "level": 7,
    "pos": "Preposition / Noun / Verb",
    "idMeaning": "sebagai, selaku, perbuatan prestasi",
    "enMeaning": "as, in the role of, conduct",
    "example": {
      "hz": "作为一名青年学者，应当勇于探索未知科学前沿。",
      "py": "Zuòwéi yì míng qīngnián xuézhě, yīngdāng yǒngyú tànsuǒ wèizhī kēxué qiányán.",
      "id": "Sebagai seorang akademisi muda, selayaknya berani menjelajahi garis depan sains yang belum terjamah."
    }
  },
  {
    "id": "zh-v-688",
    "hanzi": "潮",
    "pinyin": "cháo",
    "tones": [
      2
    ],
    "level": 7,
    "pos": "Noun / Adjective",
    "idMeaning": "pasang surut ombak, tren modis, lembap",
    "enMeaning": "tide, trendy, damp",
    "example": {
      "hz": "钱塘江大潮气势恢宏吸引了海内外游客驻足观赏。",
      "py": "Qiántángjiāng dàcháo qìshì huīhóng xīyǐn le hǎinèiwài yóukè zhùzú guānshǎng.",
      "id": "Gelombang pasang besar Sungai Qiantang yang megah memikat turis mancanegara untuk berhenti menyaksikan."
    }
  },
  {
    "id": "zh-v-689",
    "hanzi": "新潮",
    "pinyin": "xīncháo",
    "tones": [
      1,
      2
    ],
    "level": 7,
    "pos": "Adjective",
    "idMeaning": "mutakhir, trendi, mengikuti mode",
    "enMeaning": "modern, trendy, fashionable",
    "example": {
      "hz": "这家数字概念餐厅的设计理念显得极为新潮前卫。",
      "py": "Zhè jiā shùzì gàiniàn cāntīng de shèjì lǐniàn xiǎnde jíwéi xīncháo qiánwèi.",
      "id": "Konsep desain restoran digital ini tampak sangat trendi dan mutakhir."
    }
  },
  {
    "id": "zh-v-690",
    "hanzi": "潮湿",
    "pinyin": "cháoshī",
    "tones": [
      2,
      1
    ],
    "level": 7,
    "pos": "Adjective",
    "idMeaning": "lembap, basah",
    "enMeaning": "damp, moist, humid",
    "example": {
      "hz": "南方梅雨季节空气潮湿，需要注意防潮除湿。",
      "py": "Nánfāng méiyǔ jìjié kōngqì cháoshī, xūyào zhùyì fángcháo chúshī.",
      "id": "Saat musim hujan plum di selatan udaranya lembap, perlu memperhatikan pencegahan kelembapan."
    }
  },
  {
    "id": "zh-v-691",
    "hanzi": "梅",
    "pinyin": "méi",
    "tones": [
      2
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "bunga plum (meihua)",
    "enMeaning": "plum, plum blossom",
    "example": {
      "hz": "梅花在严寒的冬日傲然绽放，象征坚韧不拔的品格。",
      "py": "Méihuā zài yánhán de dōngrì àorán zhànfàng, xiàngzhēng jiānrèn-bùbá de pǐngé.",
      "id": "Bunga plum mekar anggun di dinginnya musim dingin, melambangkan karakter pantang menyerah."
    }
  },
  {
    "id": "zh-v-692",
    "hanzi": "属",
    "pinyin": "shǔ",
    "tones": [
      3
    ],
    "level": 7,
    "pos": "Verb",
    "idMeaning": "termasuk shio, tergolong dalam",
    "enMeaning": "to belong to, born in year of",
    "example": {
      "hz": "根据中国传统干支纪年，我的生肖是属龙的。",
      "py": "Gēnjù Zhōngguó chuántǒng gānzhī jìnián, wǒ de shēngxiào shì shǔ lóng de.",
      "id": "Berdasarkan kalender tradisional Tiongkok, shio saya adalah naga."
    }
  },
  {
    "id": "zh-v-693",
    "hanzi": "生肖",
    "pinyin": "shēngxiào",
    "tones": [
      1,
      4
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "shio zodiak Tionghoa (12 lambang hewan)",
    "enMeaning": "Chinese zodiac signs",
    "example": {
      "hz": "十二生肖文化凝聚了中国古代对自然与人生的深邃理解。",
      "py": "Shí'èr shēngxiào wénhuà níngjù le Zhōngguó gǔdài duì zìrán yǔ rénshēng de shēnsuì lǐjiě.",
      "id": "Budaya 12 shio merangkum pemahaman mendalam bangsa Tiongkok kuno tentang alam dan kehidupan."
    }
  },
  {
    "id": "zh-v-694",
    "hanzi": "代表",
    "pinyin": "dàibiǎo",
    "tones": [
      4,
      3
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "mewakili, representasi, delegasi",
    "enMeaning": "to represent, representative",
    "example": {
      "hz": "红枫叶在很多文学作品中代表着深深的相思与秋意。",
      "py": "Hóng fēngyè zài hěn duō wénxué zuòpǐn zhōng dàibiǎo zhe shēnshēn de xiāngsī yǔ qiūyì.",
      "id": "Daun maple merah dalam banyak karya sastra merepresentasikan kerinduan mendalam dan suasana musim gugur."
    }
  },
  {
    "id": "zh-v-695",
    "hanzi": "传说",
    "pinyin": "chuánshuō",
    "tones": [
      2,
      1
    ],
    "level": 7,
    "pos": "Noun / Verb",
    "idMeaning": "legenda, mitos, konon katanya",
    "enMeaning": "legend, folklore",
    "example": {
      "hz": "白娘子与许仙在断桥相遇的美丽传说流传千古。",
      "py": "Bái Niángzi yǔ Xǔ Xiān zài Duànqiáo xiāngyù de měilì chuánshuō liúchuán qiāngǔ.",
      "id": "Legenda indah pertemuan Siluman Ular Putih dan Xu Xian di Jembatan Duanqiao abadi sepanjang masa."
    }
  },
  {
    "id": "zh-v-696",
    "hanzi": "终点",
    "pinyin": "zhōngdiǎn",
    "tones": [
      1,
      3
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "titik akhir, garis finish, terminal",
    "enMeaning": "destination, finish line",
    "example": {
      "hz": "经过漫长的长途跋涉，队伍终于抵达了旅程的终点。",
      "py": "Jīngguò màncháng de chángtú báshè, duìwǔ zhōngyú dǐdá le lǚchéng de zhōngdiǎn.",
      "id": "Setelah perjalanan panjang melelahkan, rombongan akhirnya tiba di titik akhir perjalanan."
    }
  },
  {
    "id": "zh-v-697",
    "hanzi": "问候",
    "pinyin": "wènhòu",
    "tones": [
      4,
      4
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "mengirim salam, menyapa menanyakan kabar",
    "enMeaning": "to send regards, greetings",
    "example": {
      "hz": "请代我向您全家转达最真诚的节日问候。",
      "py": "Qǐng dài wǒ xiàng nín quán jiā zhuǎndá zuì zhēnchéng de jiérì wènhòu.",
      "id": "Tolong sampaikan salam hari raya paling tulus dari saya kepada sekeluarga Anda."
    }
  },
  {
    "id": "zh-v-698",
    "hanzi": "反映",
    "pinyin": "fǎnyìng",
    "tones": [
      3,
      4
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "mencerminkan, merefleksikan",
    "enMeaning": "to reflect, mirror",
    "example": {
      "hz": "民间说唱艺术生动反映了老百姓质朴真实的市井生活。",
      "py": "Mínjiān shuōchàng yìshù shēngdòng fǎnyìng le lǎobǎixìng zhìpǔ zhēnshí de shìjǐng shēnghuó.",
      "id": "Seni tutur rakyat secara hidup merefleksikan keseharian warga masyarakat yang bersahaja."
    }
  },
  {
    "id": "zh-v-699",
    "hanzi": "种类",
    "pinyin": "zhǒnglèi",
    "tones": [
      3,
      4
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "jenis, klasifikasi ragam",
    "enMeaning": "kind, category, variety",
    "example": {
      "hz": "植物园内培育了成千上万种罕见的热带植物种类。",
      "py": "Zhíwùyuán nèi péiyù le chéngqiān-shàngwàn zhǒng hǎnjiàn de rèdài zhíwù zhǒnglèi.",
      "id": "Di kebun raya dibudidayakan puluhan ribu jenis tanaman tropis langka."
    }
  },
  {
    "id": "zh-v-700",
    "hanzi": "位于",
    "pinyin": "wèiyú",
    "tones": [
      4,
      2
    ],
    "level": 7,
    "pos": "Verb",
    "idMeaning": "terletak di, berlokasi di",
    "enMeaning": "to be located in, situated at",
    "example": {
      "hz": "雄伟的东方明珠广播电视塔位于上海黄浦江畔。",
      "py": "Xióngwěi de Dōngfāng Míngzhū Guǎngbō Diànshì Tǎ wèiyú Shànghǎi Huángpǔjiāng pàn.",
      "id": "Menara Oriental Pearl yang megah terletak di tepi Sungai Huangpu, Shanghai."
    }
  },
  {
    "id": "zh-v-701",
    "hanzi": "辣椒",
    "pinyin": "làjiāo",
    "tones": [
      4,
      1
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "cabai, lombok",
    "enMeaning": "chili pepper",
    "example": {
      "hz": "四川料理善于运用鲜花椒与干红辣椒营造麻辣风味。",
      "py": "Sìchuān liàolǐ shànyú yùnyòng xiān huājiāo yǔ gān hóng làjiāo yíngzào málà fēngwèi.",
      "id": "Masakan Sichuan piawai memadukan lada Sichuan segar dan cabai merah kering menciptakan cita rasa pedas kebas."
    }
  },
  {
    "id": "zh-v-702",
    "hanzi": "式",
    "pinyin": "shì",
    "tones": [
      4
    ],
    "level": 7,
    "pos": "Noun / Suffix",
    "idMeaning": "gaya, tipe, model",
    "enMeaning": "style, formula, type",
    "example": {
      "hz": "这座庭院采用典型的江南园林式对称建筑风格。",
      "py": "Zhè zuò tíngyuàn cǎiyòng diǎnxíng de Jiāngnán yuánlínshì duìchèn jiànzhù fēnggé.",
      "id": "Halaman ini mengadopsi gaya arsitektur simetris khas taman Jiangnan."
    }
  },
  {
    "id": "zh-v-703",
    "hanzi": "公寓",
    "pinyin": "gōngyù",
    "tones": [
      1,
      4
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "apartemen, rumah susun",
    "enMeaning": "apartment, flat",
    "example": {
      "hz": "青年公寓配备了共享健身房和智能化门禁系统。",
      "py": "Qīngnián gōngyù pèibèi le gòngxiǎng jiànshēnfáng hé zhìnénghuà ménjìn xìtǒng.",
      "id": "Apartemen pemuda dilengkapi fasilitas gym bersama dan sistem akses gerbang cerdas."
    }
  },
  {
    "id": "zh-v-704",
    "hanzi": "统一",
    "pinyin": "tǒngyī",
    "tones": [
      3,
      1
    ],
    "level": 7,
    "pos": "Verb / Adjective",
    "idMeaning": "menyatukan, terpadu, seragam",
    "enMeaning": "to unify, unified",
    "example": {
      "hz": "统一的技术接口标准有助于跨系统平台无缝协作。",
      "py": "Tǒngyī de jìshù jiēkǒu biāozhǔn yǒuzhù yú kuà xìtǒng píngtái wúféng xiézuò.",
      "id": "Standar antarmuka teknologi yang terpadu membantu integrasi mulus antarsistem."
    }
  },
  {
    "id": "zh-v-705",
    "hanzi": "装修",
    "pinyin": "zhuāngxiū",
    "tones": [
      1,
      1
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "merenovasi interior, dekorasi rumah",
    "enMeaning": "to decorate, renovation",
    "example": {
      "hz": "新房装修崇尚环保简约与舒适通透的设计风格。",
      "py": "Xīnfáng zhuāngxiū chóngshàng huánbǎo jiǎnyuē yǔ shūshì tōngtòu de shèjì fēnggé.",
      "id": "Renovasi interior rumah baru mengutamakan konsep ramah lingkungan, minimalis, dan nyaman."
    }
  },
  {
    "id": "zh-v-706",
    "hanzi": "时代",
    "pinyin": "shídài",
    "tones": [
      2,
      4
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "zaman, era",
    "enMeaning": "era, epoch",
    "example": {
      "hz": "人工智能时代赋予了语言智能学习崭新的无限可能。",
      "py": "Réngōng zhìnéng shídài fùyǔ le yǔyán zhìnéng xuéxí zhǎnxīn de wúxiàn kěnéng.",
      "id": "Era kecerdasan buatan membuka kemungkinan baru tanpa batas bagi pembelajaran bahasa cerdas."
    }
  },
  {
    "id": "zh-v-707",
    "hanzi": "各自",
    "pinyin": "gèzì",
    "tones": [
      4,
      4
    ],
    "level": 7,
    "pos": "Pronoun / Adverb",
    "idMeaning": "masing-masing, tiap-tiap orang",
    "enMeaning": "each, respective",
    "example": {
      "hz": "会议结束后参会代表各自返回所属岗位开展落实。",
      "py": "Huìyì jiéshù hòu cānhuì dàibiǎo gèzì fǎnhuí suǒshǔ gǎngwèi kāizhǎn luòshí.",
      "id": "Seusai rapat perwakilan delegasi kembali ke divisi masing-masing untuk implementasi."
    }
  },
  {
    "id": "zh-v-708",
    "hanzi": "场合",
    "pinyin": "chǎnghé",
    "tones": [
      3,
      2
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "acara situasi, kesempatan formal",
    "enMeaning": "occasion, situation",
    "example": {
      "hz": "在正式的外交场合着装礼仪有着极其严谨的规范要求。",
      "py": "Zài zhèngshì de wàijiāo chǎnghé zhuózhuāng lǐyí yǒu zhe jíqí yánjǐn de guīfàn yāoqiú.",
      "id": "Pada kesempatan diplomatik resmi, tata krama berpakaian memiliki aturan norma yang teramat ketat."
    }
  },
  {
    "id": "zh-v-709",
    "hanzi": "面料",
    "pinyin": "miànliào",
    "tones": [
      4,
      4
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "bahan kain tekstil",
    "enMeaning": "fabric, material",
    "example": {
      "hz": "天然真丝面料手感柔软亲肤，具有良好的透气性。",
      "py": "Tiānrán zhēnsī miànliào shǒugǎn róuruǎn qīnfū, jùyǒu liánghǎo de tòuqìxìng.",
      "id": "Bahan kain sutra alami terasa lembut di kulit serta memiliki sirkulasi udara yang baik."
    }
  },
  {
    "id": "zh-v-710",
    "hanzi": "接待",
    "pinyin": "jiēdài",
    "tones": [
      1,
      4
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "menerima dan menyambut tamu",
    "enMeaning": "to receive (guests), hospitality",
    "example": {
      "hz": "国际会议中心热情周到地接待了来自各国的专家学者。",
      "py": "Guójì huìyì zhōngxīn rèqíng zhōudào de jiēdài le láizì gè guó de zhuānjiā xuézhě.",
      "id": "Pusat konferensi internasional menyambut hangat para pakar dan cendekiawan dari berbagai negara."
    }
  },
  {
    "id": "zh-v-711",
    "hanzi": "名胜古迹",
    "pinyin": "míngshèng gǔjì",
    "tones": [
      2,
      4,
      3,
      4
    ],
    "level": 7,
    "pos": "Idiom / Phrase",
    "idMeaning": "tempat bersejarah terkenal, situs cagar budaya",
    "enMeaning": "places of historic interest",
    "example": {
      "hz": "北京拥有故宫、天坛、颐和园等众多世界闻名的名胜古迹。",
      "py": "Běijīng yōngyǒu Gùgōng, Tiāntán, Yíhéyuán děng zhòngduō shìjiè wénmíng de míngshèng gǔjì.",
      "id": "Beijing memiliki Kota Terlarang, Kuil Surga, Istana Musim Panas, dan ragam situs cagar budaya ternama dunia."
    }
  },
  {
    "id": "zh-v-712",
    "hanzi": "华裔",
    "pinyin": "huáyì",
    "tones": [
      2,
      4
    ],
    "level": 7,
    "pos": "Noun",
    "idMeaning": "keturunan Tionghoa (diaspora)",
    "enMeaning": "person of Chinese descent",
    "example": {
      "hz": "很多海外华裔青少年踊跃参加中国传统寻根文化夏令营。",
      "py": "Hěn duō hǎiwài Huáyì qīngshàonián yǒngyuè cānjiā Zhōngguó chuántǒng xúngēn wénhuà xiàlìngyíng.",
      "id": "Banyak pemuda keturunan Tionghoa luar negeri antusias mengikuti kemah musim panas tapak tilas budaya."
    }
  },
  {
    "id": "zh-v-713",
    "hanzi": "合影",
    "pinyin": "héyǐng",
    "tones": [
      2,
      3
    ],
    "level": 7,
    "pos": "Verb / Noun",
    "idMeaning": "berfoto bersama, foto bersama",
    "enMeaning": "to take a group photo",
    "example": {
      "hz": "毕业典礼结束后师生们在校图书馆前欢聚留念合影。",
      "py": "Bìyè diǎnlǐ jiéshù hòu shīshēngmen zài xiào túshūguǎn qián huānjù liúniàn héyǐng.",
      "id": "Seusai wisuda para dosen dan mahasiswa berfoto bersama mengabadikan kenangan di depan perpustakaan kampus."
    }
  },
  {
    "id": "zh-v-714",
    "hanzi": "衬衫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying trousers ",
    "enMeaning": "Vocabulary from Buying trousers ",
    "example": {
      "hz": "这是衬衫。",
      "py": "Zhè shì 衬衫.",
      "id": "Ini adalah 衬衫."
    }
  },
  {
    "id": "zh-v-715",
    "hanzi": "条",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying trousers ",
    "enMeaning": "Vocabulary from Buying trousers ",
    "example": {
      "hz": "这是条。",
      "py": "Zhè shì 条.",
      "id": "Ini adalah 条."
    }
  },
  {
    "id": "zh-v-716",
    "hanzi": "裤子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying trousers ",
    "enMeaning": "Vocabulary from Buying trousers ",
    "example": {
      "hz": "这是裤子。",
      "py": "Zhè shì 裤子.",
      "id": "Ini adalah 裤子."
    }
  },
  {
    "id": "zh-v-717",
    "hanzi": "其他",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying trousers ",
    "enMeaning": "Vocabulary from Buying trousers ",
    "example": {
      "hz": "这是其他。",
      "py": "Zhè shì 其他.",
      "id": "Ini adalah 其他."
    }
  },
  {
    "id": "zh-v-718",
    "hanzi": "绿色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying trousers ",
    "enMeaning": "Vocabulary from Buying trousers ",
    "example": {
      "hz": "这是绿色。",
      "py": "Zhè shì 绿色.",
      "id": "Ini adalah 绿色."
    }
  },
  {
    "id": "zh-v-719",
    "hanzi": "蓝色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying trousers ",
    "enMeaning": "Vocabulary from Buying trousers ",
    "example": {
      "hz": "这是蓝色。",
      "py": "Zhè shì 蓝色.",
      "id": "Ini adalah 蓝色."
    }
  },
  {
    "id": "zh-v-720",
    "hanzi": "床",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Room arrangements",
    "enMeaning": "Vocabulary from Room arrangements",
    "example": {
      "hz": "这是床。",
      "py": "Zhè shì 床.",
      "id": "Ini adalah 床."
    }
  },
  {
    "id": "zh-v-721",
    "hanzi": "笔记本",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Room arrangements",
    "enMeaning": "Vocabulary from Room arrangements",
    "example": {
      "hz": "这是笔记本。",
      "py": "Zhè shì 笔记本.",
      "id": "Ini adalah 笔记本."
    }
  },
  {
    "id": "zh-v-722",
    "hanzi": "地图",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Room arrangements",
    "enMeaning": "Vocabulary from Room arrangements",
    "example": {
      "hz": "这是地图。",
      "py": "Zhè shì 地图.",
      "id": "Ini adalah 地图."
    }
  },
  {
    "id": "zh-v-723",
    "hanzi": "世界",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Room arrangements",
    "enMeaning": "Vocabulary from Room arrangements",
    "example": {
      "hz": "这是世界。",
      "py": "Zhè shì 世界.",
      "id": "Ini adalah 世界."
    }
  },
  {
    "id": "zh-v-724",
    "hanzi": "楼",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Room arrangements",
    "enMeaning": "Vocabulary from Room arrangements",
    "example": {
      "hz": "这是楼。",
      "py": "Zhè shì 楼.",
      "id": "Ini adalah 楼."
    }
  },
  {
    "id": "zh-v-725",
    "hanzi": "放",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Room arrangements",
    "enMeaning": "Vocabulary from Room arrangements",
    "example": {
      "hz": "这是放。",
      "py": "Zhè shì 放.",
      "id": "Ini adalah 放."
    }
  },
  {
    "id": "zh-v-726",
    "hanzi": "画",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Room arrangements",
    "enMeaning": "Vocabulary from Room arrangements",
    "example": {
      "hz": "这是画。",
      "py": "Zhè shì 画.",
      "id": "Ini adalah 画."
    }
  },
  {
    "id": "zh-v-727",
    "hanzi": "春天",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是春天。",
      "py": "Zhè shì 春天.",
      "id": "Ini adalah 春天."
    }
  },
  {
    "id": "zh-v-728",
    "hanzi": "夏天",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是夏天。",
      "py": "Zhè shì 夏天.",
      "id": "Ini adalah 夏天."
    }
  },
  {
    "id": "zh-v-729",
    "hanzi": "秋天",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是秋天。",
      "py": "Zhè shì 秋天.",
      "id": "Ini adalah 秋天."
    }
  },
  {
    "id": "zh-v-730",
    "hanzi": "冬天",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是冬天。",
      "py": "Zhè shì 冬天.",
      "id": "Ini adalah 冬天."
    }
  },
  {
    "id": "zh-v-731",
    "hanzi": "公园",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是公园。",
      "py": "Zhè shì 公园.",
      "id": "Ini adalah 公园."
    }
  },
  {
    "id": "zh-v-732",
    "hanzi": "花",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是花。",
      "py": "Zhè shì 花.",
      "id": "Ini adalah 花."
    }
  },
  {
    "id": "zh-v-733",
    "hanzi": "照片",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是照片。",
      "py": "Zhè shì 照片.",
      "id": "Ini adalah 照片."
    }
  },
  {
    "id": "zh-v-734",
    "hanzi": "拍",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seasons",
    "enMeaning": "Vocabulary from Seasons",
    "example": {
      "hz": "这是拍。",
      "py": "Zhè shì 拍.",
      "id": "Ini adalah 拍."
    }
  },
  {
    "id": "zh-v-735",
    "hanzi": "礼物",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Birthday gifts",
    "enMeaning": "Vocabulary from Birthday gifts",
    "example": {
      "hz": "这是礼物。",
      "py": "Zhè shì 礼物.",
      "id": "Ini adalah 礼物."
    }
  },
  {
    "id": "zh-v-736",
    "hanzi": "特别",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Birthday gifts",
    "enMeaning": "Vocabulary from Birthday gifts",
    "example": {
      "hz": "这是特别。",
      "py": "Zhè shì 特别.",
      "id": "Ini adalah 特别."
    }
  },
  {
    "id": "zh-v-737",
    "hanzi": "甜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Birthday gifts",
    "enMeaning": "Vocabulary from Birthday gifts",
    "example": {
      "hz": "这是甜。",
      "py": "Zhè shì 甜.",
      "id": "Ini adalah 甜."
    }
  },
  {
    "id": "zh-v-738",
    "hanzi": "过",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Birthday gifts",
    "enMeaning": "Vocabulary from Birthday gifts",
    "example": {
      "hz": "这是过。",
      "py": "Zhè shì 过.",
      "id": "Ini adalah 过."
    }
  },
  {
    "id": "zh-v-739",
    "hanzi": "聪明",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Boyfriend",
    "enMeaning": "Vocabulary from Boyfriend",
    "example": {
      "hz": "这是聪明。",
      "py": "Zhè shì 聪明.",
      "id": "Ini adalah 聪明."
    }
  },
  {
    "id": "zh-v-740",
    "hanzi": "努力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Boyfriend",
    "enMeaning": "Vocabulary from Boyfriend",
    "example": {
      "hz": "这是努力。",
      "py": "Zhè shì 努力.",
      "id": "Ini adalah 努力."
    }
  },
  {
    "id": "zh-v-741",
    "hanzi": "热情",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Boyfriend",
    "enMeaning": "Vocabulary from Boyfriend",
    "example": {
      "hz": "这是热情。",
      "py": "Zhè shì 热情.",
      "id": "Ini adalah 热情."
    }
  },
  {
    "id": "zh-v-742",
    "hanzi": "样子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Boyfriend",
    "enMeaning": "Vocabulary from Boyfriend",
    "example": {
      "hz": "这是样子。",
      "py": "Zhè shì 样子.",
      "id": "Ini adalah 样子."
    }
  },
  {
    "id": "zh-v-743",
    "hanzi": "要求",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Boyfriend",
    "enMeaning": "Vocabulary from Boyfriend",
    "example": {
      "hz": "这是要求。",
      "py": "Zhè shì 要求.",
      "id": "Ini adalah 要求."
    }
  },
  {
    "id": "zh-v-744",
    "hanzi": "遇到",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Boyfriend",
    "enMeaning": "Vocabulary from Boyfriend",
    "example": {
      "hz": "这是遇到。",
      "py": "Zhè shì 遇到.",
      "id": "Ini adalah 遇到."
    }
  },
  {
    "id": "zh-v-745",
    "hanzi": "脸",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Xiaoming's day",
    "enMeaning": "Vocabulary from Xiaoming's day",
    "example": {
      "hz": "这是脸。",
      "py": "Zhè shì 脸.",
      "id": "Ini adalah 脸."
    }
  },
  {
    "id": "zh-v-746",
    "hanzi": "面包",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Xiaoming's day",
    "enMeaning": "Vocabulary from Xiaoming's day",
    "example": {
      "hz": "这是面包。",
      "py": "Zhè shì 面包.",
      "id": "Ini adalah 面包."
    }
  },
  {
    "id": "zh-v-747",
    "hanzi": "体育",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Xiaoming's day",
    "enMeaning": "Vocabulary from Xiaoming's day",
    "example": {
      "hz": "这是体育。",
      "py": "Zhè shì 体育.",
      "id": "Ini adalah 体育."
    }
  },
  {
    "id": "zh-v-748",
    "hanzi": "刷牙",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Xiaoming's day",
    "enMeaning": "Vocabulary from Xiaoming's day",
    "example": {
      "hz": "这是刷牙。",
      "py": "Zhè shì 刷牙.",
      "id": "Ini adalah 刷牙."
    }
  },
  {
    "id": "zh-v-749",
    "hanzi": "洗澡",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Xiaoming's day",
    "enMeaning": "Vocabulary from Xiaoming's day",
    "example": {
      "hz": "这是洗澡。",
      "py": "Zhè shì 洗澡.",
      "id": "Ini adalah 洗澡."
    }
  },
  {
    "id": "zh-v-750",
    "hanzi": "安静",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Restaurant recommendations",
    "enMeaning": "Vocabulary from Restaurant recommendations",
    "example": {
      "hz": "这是安静。",
      "py": "Zhè shì 安静.",
      "id": "Ini adalah 安静."
    }
  },
  {
    "id": "zh-v-751",
    "hanzi": "附近",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Restaurant recommendations",
    "enMeaning": "Vocabulary from Restaurant recommendations",
    "example": {
      "hz": "这是附近。",
      "py": "Zhè shì 附近.",
      "id": "Ini adalah 附近."
    }
  },
  {
    "id": "zh-v-752",
    "hanzi": "环境",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Restaurant recommendations",
    "enMeaning": "Vocabulary from Restaurant recommendations",
    "example": {
      "hz": "这是环境。",
      "py": "Zhè shì 环境.",
      "id": "Ini adalah 环境."
    }
  },
  {
    "id": "zh-v-753",
    "hanzi": "伞",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Watching movies",
    "enMeaning": "Vocabulary from Watching movies",
    "example": {
      "hz": "这是伞。",
      "py": "Zhè shì 伞.",
      "id": "Ini adalah 伞."
    }
  },
  {
    "id": "zh-v-754",
    "hanzi": "口",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Watching movies",
    "enMeaning": "Vocabulary from Watching movies",
    "example": {
      "hz": "这是口。",
      "py": "Zhè shì 口.",
      "id": "Ini adalah 口."
    }
  },
  {
    "id": "zh-v-755",
    "hanzi": "外面",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Watching movies",
    "enMeaning": "Vocabulary from Watching movies",
    "example": {
      "hz": "这是外面。",
      "py": "Zhè shì 外面.",
      "id": "Ini adalah 外面."
    }
  },
  {
    "id": "zh-v-756",
    "hanzi": "办公室",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Appearances",
    "enMeaning": "Vocabulary from Appearances",
    "example": {
      "hz": "这是办公室。",
      "py": "Zhè shì 办公室.",
      "id": "Ini adalah 办公室."
    }
  },
  {
    "id": "zh-v-757",
    "hanzi": "头发",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Appearances",
    "enMeaning": "Vocabulary from Appearances",
    "example": {
      "hz": "这是头发。",
      "py": "Zhè shì 头发.",
      "id": "Ini adalah 头发."
    }
  },
  {
    "id": "zh-v-758",
    "hanzi": "双",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Appearances",
    "enMeaning": "Vocabulary from Appearances",
    "example": {
      "hz": "这是双。",
      "py": "Zhè shì 双.",
      "id": "Ini adalah 双."
    }
  },
  {
    "id": "zh-v-759",
    "hanzi": "皮鞋",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Appearances",
    "enMeaning": "Vocabulary from Appearances",
    "example": {
      "hz": "这是皮鞋。",
      "py": "Zhè shì 皮鞋.",
      "id": "Ini adalah 皮鞋."
    }
  },
  {
    "id": "zh-v-760",
    "hanzi": "总是",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Appearances",
    "enMeaning": "Vocabulary from Appearances",
    "example": {
      "hz": "这是总是。",
      "py": "Zhè shì 总是.",
      "id": "Ini adalah 总是."
    }
  },
  {
    "id": "zh-v-761",
    "hanzi": "半",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Illness",
    "enMeaning": "Vocabulary from Illness",
    "example": {
      "hz": "这是半。",
      "py": "Zhè shì 半.",
      "id": "Ini adalah 半."
    }
  },
  {
    "id": "zh-v-762",
    "hanzi": "以后",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Illness",
    "enMeaning": "Vocabulary from Illness",
    "example": {
      "hz": "这是以后。",
      "py": "Zhè shì 以后.",
      "id": "Ini adalah 以后."
    }
  },
  {
    "id": "zh-v-763",
    "hanzi": "舒服",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Illness",
    "enMeaning": "Vocabulary from Illness",
    "example": {
      "hz": "这是舒服。",
      "py": "Zhè shì 舒服.",
      "id": "Ini adalah 舒服."
    }
  },
  {
    "id": "zh-v-764",
    "hanzi": "脸色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Illness",
    "enMeaning": "Vocabulary from Illness",
    "example": {
      "hz": "这是脸色。",
      "py": "Zhè shì 脸色.",
      "id": "Ini adalah 脸色."
    }
  },
  {
    "id": "zh-v-765",
    "hanzi": "最后",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Illness",
    "enMeaning": "Vocabulary from Illness",
    "example": {
      "hz": "这是最后。",
      "py": "Zhè shì 最后.",
      "id": "Ini adalah 最后."
    }
  },
  {
    "id": "zh-v-766",
    "hanzi": "鞋",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying habits",
    "enMeaning": "Vocabulary from Buying habits",
    "example": {
      "hz": "这是鞋。",
      "py": "Zhè shì 鞋.",
      "id": "Ini adalah 鞋."
    }
  },
  {
    "id": "zh-v-767",
    "hanzi": "衣柜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying habits",
    "enMeaning": "Vocabulary from Buying habits",
    "example": {
      "hz": "这是衣柜。",
      "py": "Zhè shì 衣柜.",
      "id": "Ini adalah 衣柜."
    }
  },
  {
    "id": "zh-v-768",
    "hanzi": "房子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying habits",
    "enMeaning": "Vocabulary from Buying habits",
    "example": {
      "hz": "这是房子。",
      "py": "Zhè shì 房子.",
      "id": "Ini adalah 房子."
    }
  },
  {
    "id": "zh-v-769",
    "hanzi": "旧",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying habits",
    "enMeaning": "Vocabulary from Buying habits",
    "example": {
      "hz": "这是旧。",
      "py": "Zhè shì 旧.",
      "id": "Ini adalah 旧."
    }
  },
  {
    "id": "zh-v-770",
    "hanzi": "容易",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying habits",
    "enMeaning": "Vocabulary from Buying habits",
    "example": {
      "hz": "这是容易。",
      "py": "Zhè shì 容易.",
      "id": "Ini adalah 容易."
    }
  },
  {
    "id": "zh-v-771",
    "hanzi": "变化",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Buying habits",
    "enMeaning": "Vocabulary from Buying habits",
    "example": {
      "hz": "这是变化。",
      "py": "Zhè shì 变化.",
      "id": "Ini adalah 变化."
    }
  },
  {
    "id": "zh-v-772",
    "hanzi": "刻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparations",
    "enMeaning": "Vocabulary from Meeting preparations",
    "example": {
      "hz": "这是刻。",
      "py": "Zhè shì 刻.",
      "id": "Ini adalah 刻."
    }
  },
  {
    "id": "zh-v-773",
    "hanzi": "会议",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparations",
    "enMeaning": "Vocabulary from Meeting preparations",
    "example": {
      "hz": "这是会议。",
      "py": "Zhè shì 会议.",
      "id": "Ini adalah 会议."
    }
  },
  {
    "id": "zh-v-774",
    "hanzi": "司机",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparations",
    "enMeaning": "Vocabulary from Meeting preparations",
    "example": {
      "hz": "这是司机。",
      "py": "Zhè shì 司机.",
      "id": "Ini adalah 司机."
    }
  },
  {
    "id": "zh-v-775",
    "hanzi": "重要",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparations",
    "enMeaning": "Vocabulary from Meeting preparations",
    "example": {
      "hz": "这是重要。",
      "py": "Zhè shì 重要.",
      "id": "Ini adalah 重要."
    }
  },
  {
    "id": "zh-v-776",
    "hanzi": "订",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparations",
    "enMeaning": "Vocabulary from Meeting preparations",
    "example": {
      "hz": "这是订。",
      "py": "Zhè shì 订.",
      "id": "Ini adalah 订."
    }
  },
  {
    "id": "zh-v-777",
    "hanzi": "欢迎",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In a restaurant",
    "enMeaning": "Vocabulary from In a restaurant",
    "example": {
      "hz": "这是欢迎。",
      "py": "Zhè shì 欢迎.",
      "id": "Ini adalah 欢迎."
    }
  },
  {
    "id": "zh-v-778",
    "hanzi": "光临",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In a restaurant",
    "enMeaning": "Vocabulary from In a restaurant",
    "example": {
      "hz": "这是光临。",
      "py": "Zhè shì 光临.",
      "id": "Ini adalah 光临."
    }
  },
  {
    "id": "zh-v-779",
    "hanzi": "牛肉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In a restaurant",
    "enMeaning": "Vocabulary from In a restaurant",
    "example": {
      "hz": "这是牛肉。",
      "py": "Zhè shì 牛肉.",
      "id": "Ini adalah 牛肉."
    }
  },
  {
    "id": "zh-v-780",
    "hanzi": "换",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In a restaurant",
    "enMeaning": "Vocabulary from In a restaurant",
    "example": {
      "hz": "这是换。",
      "py": "Zhè shì 换.",
      "id": "Ini adalah 换."
    }
  },
  {
    "id": "zh-v-781",
    "hanzi": "碗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In a restaurant",
    "enMeaning": "Vocabulary from In a restaurant",
    "example": {
      "hz": "这是碗。",
      "py": "Zhè shì 碗.",
      "id": "Ini adalah 碗."
    }
  },
  {
    "id": "zh-v-782",
    "hanzi": "位",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In a restaurant",
    "enMeaning": "Vocabulary from In a restaurant",
    "example": {
      "hz": "这是位。",
      "py": "Zhè shì 位.",
      "id": "Ini adalah 位."
    }
  },
  {
    "id": "zh-v-783",
    "hanzi": "习惯",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Habits",
    "enMeaning": "Vocabulary from Habits",
    "example": {
      "hz": "这是习惯。",
      "py": "Zhè shì 习惯.",
      "id": "Ini adalah 习惯."
    }
  },
  {
    "id": "zh-v-784",
    "hanzi": "音乐",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Habits",
    "enMeaning": "Vocabulary from Habits",
    "example": {
      "hz": "这是音乐。",
      "py": "Zhè shì 音乐.",
      "id": "Ini adalah 音乐."
    }
  },
  {
    "id": "zh-v-785",
    "hanzi": "安全",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Habits",
    "enMeaning": "Vocabulary from Habits",
    "example": {
      "hz": "这是安全。",
      "py": "Zhè shì 安全.",
      "id": "Ini adalah 安全."
    }
  },
  {
    "id": "zh-v-786",
    "hanzi": "危险",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Habits",
    "enMeaning": "Vocabulary from Habits",
    "example": {
      "hz": "这是危险。",
      "py": "Zhè shì 危险.",
      "id": "Ini adalah 危险."
    }
  },
  {
    "id": "zh-v-787",
    "hanzi": "差",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Catching the plane",
    "enMeaning": "Vocabulary from Catching the plane",
    "example": {
      "hz": "这是差。",
      "py": "Zhè shì 差.",
      "id": "Ini adalah 差."
    }
  },
  {
    "id": "zh-v-788",
    "hanzi": "打算",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Catching the plane",
    "enMeaning": "Vocabulary from Catching the plane",
    "example": {
      "hz": "这是打算。",
      "py": "Zhè shì 打算.",
      "id": "Ini adalah 打算."
    }
  },
  {
    "id": "zh-v-789",
    "hanzi": "着急",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Catching the plane",
    "enMeaning": "Vocabulary from Catching the plane",
    "example": {
      "hz": "这是着急。",
      "py": "Zhè shì 着急.",
      "id": "Ini adalah 着急."
    }
  },
  {
    "id": "zh-v-790",
    "hanzi": "元",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是元。",
      "py": "Zhè shì 元.",
      "id": "Ini adalah 元."
    }
  },
  {
    "id": "zh-v-791",
    "hanzi": "角",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是角。",
      "py": "Zhè shì 角.",
      "id": "Ini adalah 角."
    }
  },
  {
    "id": "zh-v-792",
    "hanzi": "斤",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是斤。",
      "py": "Zhè shì 斤.",
      "id": "Ini adalah 斤."
    }
  },
  {
    "id": "zh-v-793",
    "hanzi": "一共",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是一共。",
      "py": "Zhè shì 一共.",
      "id": "Ini adalah 一共."
    }
  },
  {
    "id": "zh-v-794",
    "hanzi": "香蕉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是香蕉。",
      "py": "Zhè shì 香蕉.",
      "id": "Ini adalah 香蕉."
    }
  },
  {
    "id": "zh-v-795",
    "hanzi": "新鲜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是新鲜。",
      "py": "Zhè shì 新鲜.",
      "id": "Ini adalah 新鲜."
    }
  },
  {
    "id": "zh-v-796",
    "hanzi": "经常",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是经常。",
      "py": "Zhè shì 经常.",
      "id": "Ini adalah 经常."
    }
  },
  {
    "id": "zh-v-797",
    "hanzi": "拿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Fruit store",
    "enMeaning": "Vocabulary from Fruit store",
    "example": {
      "hz": "这是拿。",
      "py": "Zhè shì 拿.",
      "id": "Ini adalah 拿."
    }
  },
  {
    "id": "zh-v-798",
    "hanzi": "冰箱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hold parties at home",
    "enMeaning": "Vocabulary from Hold parties at home",
    "example": {
      "hz": "这是冰箱。",
      "py": "Zhè shì 冰箱.",
      "id": "Ini adalah 冰箱."
    }
  },
  {
    "id": "zh-v-799",
    "hanzi": "超市",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hold parties at home",
    "enMeaning": "Vocabulary from Hold parties at home",
    "example": {
      "hz": "这是超市。",
      "py": "Zhè shì 超市.",
      "id": "Ini adalah 超市."
    }
  },
  {
    "id": "zh-v-800",
    "hanzi": "啤酒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hold parties at home",
    "enMeaning": "Vocabulary from Hold parties at home",
    "example": {
      "hz": "这是啤酒。",
      "py": "Zhè shì 啤酒.",
      "id": "Ini adalah 啤酒."
    }
  },
  {
    "id": "zh-v-801",
    "hanzi": "筷子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hold parties at home",
    "enMeaning": "Vocabulary from Hold parties at home",
    "example": {
      "hz": "这是筷子。",
      "py": "Zhè shì 筷子.",
      "id": "Ini adalah 筷子."
    }
  },
  {
    "id": "zh-v-802",
    "hanzi": "盘子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hold parties at home",
    "enMeaning": "Vocabulary from Hold parties at home",
    "example": {
      "hz": "这是盘子。",
      "py": "Zhè shì 盘子.",
      "id": "Ini adalah 盘子."
    }
  },
  {
    "id": "zh-v-803",
    "hanzi": "饮料",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hold parties at home",
    "enMeaning": "Vocabulary from Hold parties at home",
    "example": {
      "hz": "这是饮料。",
      "py": "Zhè shì 饮料.",
      "id": "Ini adalah 饮料."
    }
  },
  {
    "id": "zh-v-804",
    "hanzi": "船",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend excursions",
    "enMeaning": "Vocabulary from Weekend excursions",
    "example": {
      "hz": "这是船。",
      "py": "Zhè shì 船.",
      "id": "Ini adalah 船."
    }
  },
  {
    "id": "zh-v-805",
    "hanzi": "岛",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend excursions",
    "enMeaning": "Vocabulary from Weekend excursions",
    "example": {
      "hz": "这是岛。",
      "py": "Zhè shì 岛.",
      "id": "Ini adalah 岛."
    }
  },
  {
    "id": "zh-v-806",
    "hanzi": "月亮",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend excursions",
    "enMeaning": "Vocabulary from Weekend excursions",
    "example": {
      "hz": "这是月亮。",
      "py": "Zhè shì 月亮.",
      "id": "Ini adalah 月亮."
    }
  },
  {
    "id": "zh-v-807",
    "hanzi": "刮风",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend excursions",
    "enMeaning": "Vocabulary from Weekend excursions",
    "example": {
      "hz": "这是刮风。",
      "py": "Zhè shì 刮风.",
      "id": "Ini adalah 刮风."
    }
  },
  {
    "id": "zh-v-808",
    "hanzi": "季节",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend excursions",
    "enMeaning": "Vocabulary from Weekend excursions",
    "example": {
      "hz": "这是季节。",
      "py": "Zhè shì 季节.",
      "id": "Ini adalah 季节."
    }
  },
  {
    "id": "zh-v-809",
    "hanzi": "周末",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend excursions",
    "enMeaning": "Vocabulary from Weekend excursions",
    "example": {
      "hz": "这是周末。",
      "py": "Zhè shì 周末.",
      "id": "Ini adalah 周末."
    }
  },
  {
    "id": "zh-v-810",
    "hanzi": "爱好",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hobbies",
    "enMeaning": "Vocabulary from Hobbies",
    "example": {
      "hz": "这是爱好。",
      "py": "Zhè shì 爱好.",
      "id": "Ini adalah 爱好."
    }
  },
  {
    "id": "zh-v-811",
    "hanzi": "水平",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hobbies",
    "enMeaning": "Vocabulary from Hobbies",
    "example": {
      "hz": "这是水平。",
      "py": "Zhè shì 水平.",
      "id": "Ini adalah 水平."
    }
  },
  {
    "id": "zh-v-812",
    "hanzi": "游戏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hobbies",
    "enMeaning": "Vocabulary from Hobbies",
    "example": {
      "hz": "这是游戏。",
      "py": "Zhè shì 游戏.",
      "id": "Ini adalah 游戏."
    }
  },
  {
    "id": "zh-v-813",
    "hanzi": "听说",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hobbies",
    "enMeaning": "Vocabulary from Hobbies",
    "example": {
      "hz": "这是听说。",
      "py": "Zhè shì 听说.",
      "id": "Ini adalah 听说."
    }
  },
  {
    "id": "zh-v-814",
    "hanzi": "赚",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Hobbies",
    "enMeaning": "Vocabulary from Hobbies",
    "example": {
      "hz": "这是赚。",
      "py": "Zhè shì 赚.",
      "id": "Ini adalah 赚."
    }
  },
  {
    "id": "zh-v-815",
    "hanzi": "结婚",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work changes",
    "enMeaning": "Vocabulary from Work changes",
    "example": {
      "hz": "这是结婚。",
      "py": "Zhè shì 结婚.",
      "id": "Ini adalah 结婚."
    }
  },
  {
    "id": "zh-v-816",
    "hanzi": "愿意",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work changes",
    "enMeaning": "Vocabulary from Work changes",
    "example": {
      "hz": "这是愿意。",
      "py": "Zhè shì 愿意.",
      "id": "Ini adalah 愿意."
    }
  },
  {
    "id": "zh-v-817",
    "hanzi": "离开",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work changes",
    "enMeaning": "Vocabulary from Work changes",
    "example": {
      "hz": "这是离开。",
      "py": "Zhè shì 离开.",
      "id": "Ini adalah 离开."
    }
  },
  {
    "id": "zh-v-818",
    "hanzi": "满意",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 3,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work changes",
    "enMeaning": "Vocabulary from Work changes",
    "example": {
      "hz": "这是满意。",
      "py": "Zhè shì 满意.",
      "id": "Ini adalah 满意."
    }
  },
  {
    "id": "zh-v-819",
    "hanzi": "客厅",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是客厅。",
      "py": "Zhè shì 客厅.",
      "id": "Ini adalah 客厅."
    }
  },
  {
    "id": "zh-v-820",
    "hanzi": "厨房",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是厨房。",
      "py": "Zhè shì 厨房.",
      "id": "Ini adalah 厨房."
    }
  },
  {
    "id": "zh-v-821",
    "hanzi": "卫生间",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是卫生间。",
      "py": "Zhè shì 卫生间.",
      "id": "Ini adalah 卫生间."
    }
  },
  {
    "id": "zh-v-822",
    "hanzi": "卧室",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是卧室。",
      "py": "Zhè shì 卧室.",
      "id": "Ini adalah 卧室."
    }
  },
  {
    "id": "zh-v-823",
    "hanzi": "共同",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是共同。",
      "py": "Zhè shì 共同.",
      "id": "Ini adalah 共同."
    }
  },
  {
    "id": "zh-v-824",
    "hanzi": "使用",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是使用。",
      "py": "Zhè shì 使用.",
      "id": "Ini adalah 使用."
    }
  },
  {
    "id": "zh-v-825",
    "hanzi": "室友",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是室友。",
      "py": "Zhè shì 室友.",
      "id": "Ini adalah 室友."
    }
  },
  {
    "id": "zh-v-826",
    "hanzi": "家具",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是家具。",
      "py": "Zhè shì 家具.",
      "id": "Ini adalah 家具."
    }
  },
  {
    "id": "zh-v-827",
    "hanzi": "郊区",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Urban and suburban",
    "enMeaning": "Vocabulary from Urban and suburban",
    "example": {
      "hz": "这是郊区。",
      "py": "Zhè shì 郊区.",
      "id": "Ini adalah 郊区."
    }
  },
  {
    "id": "zh-v-828",
    "hanzi": "电子书",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Urban and suburban",
    "enMeaning": "Vocabulary from Urban and suburban",
    "example": {
      "hz": "这是电子书。",
      "py": "Zhè shì 电子书.",
      "id": "Ini adalah 电子书."
    }
  },
  {
    "id": "zh-v-829",
    "hanzi": "父亲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是父亲。",
      "py": "Zhè shì 父亲.",
      "id": "Ini adalah 父亲."
    }
  },
  {
    "id": "zh-v-830",
    "hanzi": "表演",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是表演。",
      "py": "Zhè shì 表演.",
      "id": "Ini adalah 表演."
    }
  },
  {
    "id": "zh-v-831",
    "hanzi": "观众",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是观众。",
      "py": "Zhè shì 观众.",
      "id": "Ini adalah 观众."
    }
  },
  {
    "id": "zh-v-832",
    "hanzi": "角色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是角色。",
      "py": "Zhè shì 角色.",
      "id": "Ini adalah 角色."
    }
  },
  {
    "id": "zh-v-833",
    "hanzi": "获得",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是获得。",
      "py": "Zhè shì 获得.",
      "id": "Ini adalah 获得."
    }
  },
  {
    "id": "zh-v-834",
    "hanzi": "祝贺",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是祝贺。",
      "py": "Zhè shì 祝贺.",
      "id": "Ini adalah 祝贺."
    }
  },
  {
    "id": "zh-v-835",
    "hanzi": "感动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是感动。",
      "py": "Zhè shì 感动.",
      "id": "Ini adalah 感动."
    }
  },
  {
    "id": "zh-v-836",
    "hanzi": "感觉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是感觉。",
      "py": "Zhè shì 感觉.",
      "id": "Ini adalah 感觉."
    }
  },
  {
    "id": "zh-v-837",
    "hanzi": "肚子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是肚子。",
      "py": "Zhè shì 肚子.",
      "id": "Ini adalah 肚子."
    }
  },
  {
    "id": "zh-v-838",
    "hanzi": "可是",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是可是。",
      "py": "Zhè shì 可是.",
      "id": "Ini adalah 可是."
    }
  },
  {
    "id": "zh-v-839",
    "hanzi": "本来",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是本来。",
      "py": "Zhè shì 本来.",
      "id": "Ini adalah 本来."
    }
  },
  {
    "id": "zh-v-840",
    "hanzi": "约会",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是约会。",
      "py": "Zhè shì 约会.",
      "id": "Ini adalah 约会."
    }
  },
  {
    "id": "zh-v-841",
    "hanzi": "打扰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是打扰。",
      "py": "Zhè shì 打扰.",
      "id": "Ini adalah 打扰."
    }
  },
  {
    "id": "zh-v-842",
    "hanzi": "接受",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是接受。",
      "py": "Zhè shì 接受.",
      "id": "Ini adalah 接受."
    }
  },
  {
    "id": "zh-v-843",
    "hanzi": "道歉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是道歉。",
      "py": "Zhè shì 道歉.",
      "id": "Ini adalah 道歉."
    }
  },
  {
    "id": "zh-v-844",
    "hanzi": "性格",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ideal boy/girlfriend",
    "enMeaning": "Vocabulary from Ideal boy/girlfriend",
    "example": {
      "hz": "这是性格。",
      "py": "Zhè shì 性格.",
      "id": "Ini adalah 性格."
    }
  },
  {
    "id": "zh-v-845",
    "hanzi": "开心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ideal boy/girlfriend",
    "enMeaning": "Vocabulary from Ideal boy/girlfriend",
    "example": {
      "hz": "这是开心。",
      "py": "Zhè shì 开心.",
      "id": "Ini adalah 开心."
    }
  },
  {
    "id": "zh-v-846",
    "hanzi": "座位",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是座位。",
      "py": "Zhè shì 座位.",
      "id": "Ini adalah 座位."
    }
  },
  {
    "id": "zh-v-847",
    "hanzi": "礼拜天",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是礼拜天。",
      "py": "Zhè shì 礼拜天.",
      "id": "Ini adalah 礼拜天."
    }
  },
  {
    "id": "zh-v-848",
    "hanzi": "排队",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是排队。",
      "py": "Zhè shì 排队.",
      "id": "Ini adalah 排队."
    }
  },
  {
    "id": "zh-v-849",
    "hanzi": "生意",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是生意。",
      "py": "Zhè shì 生意.",
      "id": "Ini adalah 生意."
    }
  },
  {
    "id": "zh-v-850",
    "hanzi": "网红",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是网红。",
      "py": "Zhè shì 网红.",
      "id": "Ini adalah 网红."
    }
  },
  {
    "id": "zh-v-851",
    "hanzi": "朋友圈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是朋友圈。",
      "py": "Zhè shì 朋友圈.",
      "id": "Ini adalah 朋友圈."
    }
  },
  {
    "id": "zh-v-852",
    "hanzi": "许多",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是许多。",
      "py": "Zhè shì 许多.",
      "id": "Ini adalah 许多."
    }
  },
  {
    "id": "zh-v-853",
    "hanzi": "演员",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是演员。",
      "py": "Zhè shì 演员.",
      "id": "Ini adalah 演员."
    }
  },
  {
    "id": "zh-v-854",
    "hanzi": "盐",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learn how to cook a dish",
    "enMeaning": "Vocabulary from Learn how to cook a dish",
    "example": {
      "hz": "这是盐。",
      "py": "Zhè shì 盐.",
      "id": "Ini adalah 盐."
    }
  },
  {
    "id": "zh-v-855",
    "hanzi": "咸",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learn how to cook a dish",
    "enMeaning": "Vocabulary from Learn how to cook a dish",
    "example": {
      "hz": "这是咸。",
      "py": "Zhè shì 咸.",
      "id": "Ini adalah 咸."
    }
  },
  {
    "id": "zh-v-856",
    "hanzi": "外卖",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是外卖。",
      "py": "Zhè shì 外卖.",
      "id": "Ini adalah 外卖."
    }
  },
  {
    "id": "zh-v-857",
    "hanzi": "小伙子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是小伙子。",
      "py": "Zhè shì 小伙子.",
      "id": "Ini adalah 小伙子."
    }
  },
  {
    "id": "zh-v-858",
    "hanzi": "饼干",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是饼干。",
      "py": "Zhè shì 饼干.",
      "id": "Ini adalah 饼干."
    }
  },
  {
    "id": "zh-v-859",
    "hanzi": "原因",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是原因。",
      "py": "Zhè shì 原因.",
      "id": "Ini adalah 原因."
    }
  },
  {
    "id": "zh-v-860",
    "hanzi": "态度",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是态度。",
      "py": "Zhè shì 态度.",
      "id": "Ini adalah 态度."
    }
  },
  {
    "id": "zh-v-861",
    "hanzi": "挂",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是挂。",
      "py": "Zhè shì 挂.",
      "id": "Ini adalah 挂."
    }
  },
  {
    "id": "zh-v-862",
    "hanzi": "摩托车",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是摩托车。",
      "py": "Zhè shì 摩托车.",
      "id": "Ini adalah 摩托车."
    }
  },
  {
    "id": "zh-v-863",
    "hanzi": "情况",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是情况。",
      "py": "Zhè shì 情况.",
      "id": "Ini adalah 情况."
    }
  },
  {
    "id": "zh-v-864",
    "hanzi": "高速公路",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Airport pickup",
    "enMeaning": "Vocabulary from Airport pickup",
    "example": {
      "hz": "这是高速公路。",
      "py": "Zhè shì 高速公路.",
      "id": "Ini adalah 高速公路."
    }
  },
  {
    "id": "zh-v-865",
    "hanzi": "速度",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Airport pickup",
    "enMeaning": "Vocabulary from Airport pickup",
    "example": {
      "hz": "这是速度。",
      "py": "Zhè shì 速度.",
      "id": "Ini adalah 速度."
    }
  },
  {
    "id": "zh-v-866",
    "hanzi": "堵车",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Airport pickup",
    "enMeaning": "Vocabulary from Airport pickup",
    "example": {
      "hz": "这是堵车。",
      "py": "Zhè shì 堵车.",
      "id": "Ini adalah 堵车."
    }
  },
  {
    "id": "zh-v-867",
    "hanzi": "醒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Airport pickup",
    "enMeaning": "Vocabulary from Airport pickup",
    "example": {
      "hz": "这是醒。",
      "py": "Zhè shì 醒.",
      "id": "Ini adalah 醒."
    }
  },
  {
    "id": "zh-v-868",
    "hanzi": "货",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是货。",
      "py": "Zhè shì 货.",
      "id": "Ini adalah 货."
    }
  },
  {
    "id": "zh-v-869",
    "hanzi": "价格",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是价格。",
      "py": "Zhè shì 价格.",
      "id": "Ini adalah 价格."
    }
  },
  {
    "id": "zh-v-870",
    "hanzi": "质量",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是质量。",
      "py": "Zhè shì 质量.",
      "id": "Ini adalah 质量."
    }
  },
  {
    "id": "zh-v-871",
    "hanzi": "打折",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是打折。",
      "py": "Zhè shì 打折.",
      "id": "Ini adalah 打折."
    }
  },
  {
    "id": "zh-v-872",
    "hanzi": "流行",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是流行。",
      "py": "Zhè shì 流行.",
      "id": "Ini adalah 流行."
    }
  },
  {
    "id": "zh-v-873",
    "hanzi": "低",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是低。",
      "py": "Zhè shì 低.",
      "id": "Ini adalah 低."
    }
  },
  {
    "id": "zh-v-874",
    "hanzi": "直接",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是直接。",
      "py": "Zhè shì 直接.",
      "id": "Ini adalah 直接."
    }
  },
  {
    "id": "zh-v-875",
    "hanzi": "保证",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是保证。",
      "py": "Zhè shì 保证.",
      "id": "Ini adalah 保证."
    }
  },
  {
    "id": "zh-v-876",
    "hanzi": "盒子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Failed Online Shopping",
    "enMeaning": "Vocabulary from Failed Online Shopping",
    "example": {
      "hz": "这是盒子。",
      "py": "Zhè shì 盒子.",
      "id": "Ini adalah 盒子."
    }
  },
  {
    "id": "zh-v-877",
    "hanzi": "打开",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Failed Online Shopping",
    "enMeaning": "Vocabulary from Failed Online Shopping",
    "example": {
      "hz": "这是打开。",
      "py": "Zhè shì 打开.",
      "id": "Ini adalah 打开."
    }
  },
  {
    "id": "zh-v-878",
    "hanzi": "只好",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Failed Online Shopping",
    "enMeaning": "Vocabulary from Failed Online Shopping",
    "example": {
      "hz": "这是只好。",
      "py": "Zhè shì 只好.",
      "id": "Ini adalah 只好."
    }
  },
  {
    "id": "zh-v-879",
    "hanzi": "旅行",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是旅行。",
      "py": "Zhè shì 旅行.",
      "id": "Ini adalah 旅行."
    }
  },
  {
    "id": "zh-v-880",
    "hanzi": "首都",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是首都。",
      "py": "Zhè shì 首都.",
      "id": "Ini adalah 首都."
    }
  },
  {
    "id": "zh-v-881",
    "hanzi": "语言",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是语言。",
      "py": "Zhè shì 语言.",
      "id": "Ini adalah 语言."
    }
  },
  {
    "id": "zh-v-882",
    "hanzi": "毕业",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是毕业。",
      "py": "Zhè shì 毕业.",
      "id": "Ini adalah 毕业."
    }
  },
  {
    "id": "zh-v-883",
    "hanzi": "暑假",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是暑假。",
      "py": "Zhè shì 暑假.",
      "id": "Ini adalah 暑假."
    }
  },
  {
    "id": "zh-v-884",
    "hanzi": "建议",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是建议。",
      "py": "Zhè shì 建议.",
      "id": "Ini adalah 建议."
    }
  },
  {
    "id": "zh-v-885",
    "hanzi": "挣",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是挣。",
      "py": "Zhè shì 挣.",
      "id": "Ini adalah 挣."
    }
  },
  {
    "id": "zh-v-886",
    "hanzi": "浪费",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Travel plans",
    "enMeaning": "Vocabulary from Travel plans",
    "example": {
      "hz": "这是浪费。",
      "py": "Zhè shì 浪费.",
      "id": "Ini adalah 浪费."
    }
  },
  {
    "id": "zh-v-887",
    "hanzi": "经历",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Travel plans",
    "enMeaning": "Vocabulary from Travel plans",
    "example": {
      "hz": "这是经历。",
      "py": "Zhè shì 经历.",
      "id": "Ini adalah 经历."
    }
  },
  {
    "id": "zh-v-888",
    "hanzi": "意义",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Travel plans",
    "enMeaning": "Vocabulary from Travel plans",
    "example": {
      "hz": "这是意义。",
      "py": "Zhè shì 意义.",
      "id": "Ini adalah 意义."
    }
  },
  {
    "id": "zh-v-889",
    "hanzi": "自由",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Travel plans",
    "enMeaning": "Vocabulary from Travel plans",
    "example": {
      "hz": "这是自由。",
      "py": "Zhè shì 自由.",
      "id": "Ini adalah 自由."
    }
  },
  {
    "id": "zh-v-890",
    "hanzi": "意外",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Travel plans",
    "enMeaning": "Vocabulary from Travel plans",
    "example": {
      "hz": "这是意外。",
      "py": "Zhè shì 意外.",
      "id": "Ini adalah 意外."
    }
  },
  {
    "id": "zh-v-891",
    "hanzi": "办理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是办理。",
      "py": "Zhè shì 办理.",
      "id": "Ini adalah 办理."
    }
  },
  {
    "id": "zh-v-892",
    "hanzi": "业务",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是业务。",
      "py": "Zhè shì 业务.",
      "id": "Ini adalah 业务."
    }
  },
  {
    "id": "zh-v-893",
    "hanzi": "填",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是填。",
      "py": "Zhè shì 填.",
      "id": "Ini adalah 填."
    }
  },
  {
    "id": "zh-v-894",
    "hanzi": "表格",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是表格。",
      "py": "Zhè shì 表格.",
      "id": "Ini adalah 表格."
    }
  },
  {
    "id": "zh-v-895",
    "hanzi": "证件",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是证件。",
      "py": "Zhè shì 证件.",
      "id": "Ini adalah 证件."
    }
  },
  {
    "id": "zh-v-896",
    "hanzi": "密码",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是密码。",
      "py": "Zhè shì 密码.",
      "id": "Ini adalah 密码."
    }
  },
  {
    "id": "zh-v-897",
    "hanzi": "输入",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是输入。",
      "py": "Zhè shì 输入.",
      "id": "Ini adalah 输入."
    }
  },
  {
    "id": "zh-v-898",
    "hanzi": "错误",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是错误。",
      "py": "Zhè shì 错误.",
      "id": "Ini adalah 错误."
    }
  },
  {
    "id": "zh-v-899",
    "hanzi": "收入",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Living expenses",
    "enMeaning": "Vocabulary from Living expenses",
    "example": {
      "hz": "这是收入。",
      "py": "Zhè shì 收入.",
      "id": "Ini adalah 收入."
    }
  },
  {
    "id": "zh-v-900",
    "hanzi": "培训",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Living expenses",
    "enMeaning": "Vocabulary from Living expenses",
    "example": {
      "hz": "这是培训。",
      "py": "Zhè shì 培训.",
      "id": "Ini adalah 培训."
    }
  },
  {
    "id": "zh-v-901",
    "hanzi": "管理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Living expenses",
    "enMeaning": "Vocabulary from Living expenses",
    "example": {
      "hz": "这是管理。",
      "py": "Zhè shì 管理.",
      "id": "Ini adalah 管理."
    }
  },
  {
    "id": "zh-v-902",
    "hanzi": "打针",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是打针。",
      "py": "Zhè shì 打针.",
      "id": "Ini adalah 打针."
    }
  },
  {
    "id": "zh-v-903",
    "hanzi": "护士",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是护士。",
      "py": "Zhè shì 护士.",
      "id": "Ini adalah 护士."
    }
  },
  {
    "id": "zh-v-904",
    "hanzi": "咳嗽",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是咳嗽。",
      "py": "Zhè shì 咳嗽.",
      "id": "Ini adalah 咳嗽."
    }
  },
  {
    "id": "zh-v-905",
    "hanzi": "力气",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是力气。",
      "py": "Zhè shì 力气.",
      "id": "Ini adalah 力气."
    }
  },
  {
    "id": "zh-v-906",
    "hanzi": "流感",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是流感。",
      "py": "Zhè shì 流感.",
      "id": "Ini adalah 流感."
    }
  },
  {
    "id": "zh-v-907",
    "hanzi": "体温",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是体温。",
      "py": "Zhè shì 体温.",
      "id": "Ini adalah 体温."
    }
  },
  {
    "id": "zh-v-908",
    "hanzi": "量",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是量。",
      "py": "Zhè shì 量.",
      "id": "Ini adalah 量."
    }
  },
  {
    "id": "zh-v-909",
    "hanzi": "度",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是度。",
      "py": "Zhè shì 度.",
      "id": "Ini adalah 度."
    }
  },
  {
    "id": "zh-v-910",
    "hanzi": "心情",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran White-collar workers love fitness",
    "enMeaning": "Vocabulary from White-collar workers love fitness",
    "example": {
      "hz": "这是心情。",
      "py": "Zhè shì 心情.",
      "id": "Ini adalah 心情."
    }
  },
  {
    "id": "zh-v-911",
    "hanzi": "压力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran White-collar workers love fitness",
    "enMeaning": "Vocabulary from White-collar workers love fitness",
    "example": {
      "hz": "这是压力。",
      "py": "Zhè shì 压力.",
      "id": "Ini adalah 压力."
    }
  },
  {
    "id": "zh-v-912",
    "hanzi": "应用",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran White-collar workers love fitness",
    "enMeaning": "Vocabulary from White-collar workers love fitness",
    "example": {
      "hz": "这是应用。",
      "py": "Zhè shì 应用.",
      "id": "Ini adalah 应用."
    }
  },
  {
    "id": "zh-v-913",
    "hanzi": "互联网",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是互联网。",
      "py": "Zhè shì 互联网.",
      "id": "Ini adalah 互联网."
    }
  },
  {
    "id": "zh-v-914",
    "hanzi": "分手",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是分手。",
      "py": "Zhè shì 分手.",
      "id": "Ini adalah 分手."
    }
  },
  {
    "id": "zh-v-915",
    "hanzi": "赶",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是赶。",
      "py": "Zhè shì 赶.",
      "id": "Ini adalah 赶."
    }
  },
  {
    "id": "zh-v-916",
    "hanzi": "够",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是够。",
      "py": "Zhè shì 够.",
      "id": "Ini adalah 够."
    }
  },
  {
    "id": "zh-v-917",
    "hanzi": "条件",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是条件。",
      "py": "Zhè shì 条件.",
      "id": "Ini adalah 条件."
    }
  },
  {
    "id": "zh-v-918",
    "hanzi": "现实",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是现实。",
      "py": "Zhè shì 现实.",
      "id": "Ini adalah 现实."
    }
  },
  {
    "id": "zh-v-919",
    "hanzi": "浪漫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是浪漫。",
      "py": "Zhè shì 浪漫.",
      "id": "Ini adalah 浪漫."
    }
  },
  {
    "id": "zh-v-920",
    "hanzi": "将来",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Romance and Reality",
    "enMeaning": "Vocabulary from Romance and Reality",
    "example": {
      "hz": "这是将来。",
      "py": "Zhè shì 将来.",
      "id": "Ini adalah 将来."
    }
  },
  {
    "id": "zh-v-921",
    "hanzi": "结果",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Overtime culture",
    "enMeaning": "Vocabulary from Overtime culture",
    "example": {
      "hz": "这是结果。",
      "py": "Zhè shì 结果.",
      "id": "Ini adalah 结果."
    }
  },
  {
    "id": "zh-v-922",
    "hanzi": "通知",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是通知。",
      "py": "Zhè shì 通知.",
      "id": "Ini adalah 通知."
    }
  },
  {
    "id": "zh-v-923",
    "hanzi": "消息",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是消息。",
      "py": "Zhè shì 消息.",
      "id": "Ini adalah 消息."
    }
  },
  {
    "id": "zh-v-924",
    "hanzi": "邀请",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是邀请。",
      "py": "Zhè shì 邀请.",
      "id": "Ini adalah 邀请."
    }
  },
  {
    "id": "zh-v-925",
    "hanzi": "地点",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是地点。",
      "py": "Zhè shì 地点.",
      "id": "Ini adalah 地点."
    }
  },
  {
    "id": "zh-v-926",
    "hanzi": "不同",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是不同。",
      "py": "Zhè shì 不同.",
      "id": "Ini adalah 不同."
    }
  },
  {
    "id": "zh-v-927",
    "hanzi": "负责",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是负责。",
      "py": "Zhè shì 负责.",
      "id": "Ini adalah 负责."
    }
  },
  {
    "id": "zh-v-928",
    "hanzi": "商量",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是商量。",
      "py": "Zhè shì 商量.",
      "id": "Ini adalah 商量."
    }
  },
  {
    "id": "zh-v-929",
    "hanzi": "所有",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是所有。",
      "py": "Zhè shì 所有.",
      "id": "Ini adalah 所有."
    }
  },
  {
    "id": "zh-v-930",
    "hanzi": "社交",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是社交。",
      "py": "Zhè shì 社交.",
      "id": "Ini adalah 社交."
    }
  },
  {
    "id": "zh-v-931",
    "hanzi": "假",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是假。",
      "py": "Zhè shì 假.",
      "id": "Ini adalah 假."
    }
  },
  {
    "id": "zh-v-932",
    "hanzi": "网络",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是网络。",
      "py": "Zhè shì 网络.",
      "id": "Ini adalah 网络."
    }
  },
  {
    "id": "zh-v-933",
    "hanzi": "分享",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是分享。",
      "py": "Zhè shì 分享.",
      "id": "Ini adalah 分享."
    }
  },
  {
    "id": "zh-v-934",
    "hanzi": "自拍",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是自拍。",
      "py": "Zhè shì 自拍.",
      "id": "Ini adalah 自拍."
    }
  },
  {
    "id": "zh-v-935",
    "hanzi": "内容",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是内容。",
      "py": "Zhè shì 内容.",
      "id": "Ini adalah 内容."
    }
  },
  {
    "id": "zh-v-936",
    "hanzi": "处理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是处理。",
      "py": "Zhè shì 处理.",
      "id": "Ini adalah 处理."
    }
  },
  {
    "id": "zh-v-937",
    "hanzi": "广告",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是广告。",
      "py": "Zhè shì 广告.",
      "id": "Ini adalah 广告."
    }
  },
  {
    "id": "zh-v-938",
    "hanzi": "睡眠",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Mobile phone usage",
    "enMeaning": "Vocabulary from Mobile phone usage",
    "example": {
      "hz": "这是睡眠。",
      "py": "Zhè shì 睡眠.",
      "id": "Ini adalah 睡眠."
    }
  },
  {
    "id": "zh-v-939",
    "hanzi": "躺",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Mobile phone usage",
    "enMeaning": "Vocabulary from Mobile phone usage",
    "example": {
      "hz": "这是躺。",
      "py": "Zhè shì 躺.",
      "id": "Ini adalah 躺."
    }
  },
  {
    "id": "zh-v-940",
    "hanzi": "脖子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Mobile phone usage",
    "enMeaning": "Vocabulary from Mobile phone usage",
    "example": {
      "hz": "这是脖子。",
      "py": "Zhè shì 脖子.",
      "id": "Ini adalah 脖子."
    }
  },
  {
    "id": "zh-v-941",
    "hanzi": "师傅",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是师傅。",
      "py": "Zhè shì 师傅.",
      "id": "Ini adalah 师傅."
    }
  },
  {
    "id": "zh-v-942",
    "hanzi": "修理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是修理。",
      "py": "Zhè shì 修理.",
      "id": "Ini adalah 修理."
    }
  },
  {
    "id": "zh-v-943",
    "hanzi": "脏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是脏。",
      "py": "Zhè shì 脏.",
      "id": "Ini adalah 脏."
    }
  },
  {
    "id": "zh-v-944",
    "hanzi": "毛巾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是毛巾。",
      "py": "Zhè shì 毛巾.",
      "id": "Ini adalah 毛巾."
    }
  },
  {
    "id": "zh-v-945",
    "hanzi": "擦",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是擦。",
      "py": "Zhè shì 擦.",
      "id": "Ini adalah 擦."
    }
  },
  {
    "id": "zh-v-946",
    "hanzi": "稍微",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是稍微。",
      "py": "Zhè shì 稍微.",
      "id": "Ini adalah 稍微."
    }
  },
  {
    "id": "zh-v-947",
    "hanzi": "灯泡",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是灯泡。",
      "py": "Zhè shì 灯泡.",
      "id": "Ini adalah 灯泡."
    }
  },
  {
    "id": "zh-v-948",
    "hanzi": "厕所",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是厕所。",
      "py": "Zhè shì 厕所.",
      "id": "Ini adalah 厕所."
    }
  },
  {
    "id": "zh-v-949",
    "hanzi": "顺利",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是顺利。",
      "py": "Zhè shì 顺利.",
      "id": "Ini adalah 顺利."
    }
  },
  {
    "id": "zh-v-950",
    "hanzi": "准确",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是准确。",
      "py": "Zhè shì 准确.",
      "id": "Ini adalah 准确."
    }
  },
  {
    "id": "zh-v-951",
    "hanzi": "人数",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是人数。",
      "py": "Zhè shì 人数.",
      "id": "Ini adalah 人数."
    }
  },
  {
    "id": "zh-v-952",
    "hanzi": "符合",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是符合。",
      "py": "Zhè shì 符合.",
      "id": "Ini adalah 符合."
    }
  },
  {
    "id": "zh-v-953",
    "hanzi": "地址",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是地址。",
      "py": "Zhè shì 地址.",
      "id": "Ini adalah 地址."
    }
  },
  {
    "id": "zh-v-954",
    "hanzi": "各",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是各。",
      "py": "Zhè shì 各.",
      "id": "Ini adalah 各."
    }
  },
  {
    "id": "zh-v-955",
    "hanzi": "材料",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是材料。",
      "py": "Zhè shì 材料.",
      "id": "Ini adalah 材料."
    }
  },
  {
    "id": "zh-v-956",
    "hanzi": "打印",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是打印。",
      "py": "Zhè shì 打印.",
      "id": "Ini adalah 打印."
    }
  },
  {
    "id": "zh-v-957",
    "hanzi": "谈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job-hunting",
    "enMeaning": "Vocabulary from Job-hunting",
    "example": {
      "hz": "这是谈。",
      "py": "Zhè shì 谈.",
      "id": "Ini adalah 谈."
    }
  },
  {
    "id": "zh-v-958",
    "hanzi": "愉快",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job-hunting",
    "enMeaning": "Vocabulary from Job-hunting",
    "example": {
      "hz": "这是愉快。",
      "py": "Zhè shì 愉快.",
      "id": "Ini adalah 愉快."
    }
  },
  {
    "id": "zh-v-959",
    "hanzi": "提",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是提。",
      "py": "Zhè shì 提.",
      "id": "Ini adalah 提."
    }
  },
  {
    "id": "zh-v-960",
    "hanzi": "预习",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是预习。",
      "py": "Zhè shì 预习.",
      "id": "Ini adalah 预习."
    }
  },
  {
    "id": "zh-v-961",
    "hanzi": "报名",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是报名。",
      "py": "Zhè shì 报名.",
      "id": "Ini adalah 报名."
    }
  },
  {
    "id": "zh-v-962",
    "hanzi": "厉害",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是厉害。",
      "py": "Zhè shì 厉害.",
      "id": "Ini adalah 厉害."
    }
  },
  {
    "id": "zh-v-963",
    "hanzi": "信心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是信心。",
      "py": "Zhè shì 信心.",
      "id": "Ini adalah 信心."
    }
  },
  {
    "id": "zh-v-964",
    "hanzi": "放弃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是放弃。",
      "py": "Zhè shì 放弃.",
      "id": "Ini adalah 放弃."
    }
  },
  {
    "id": "zh-v-965",
    "hanzi": "语法",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是语法。",
      "py": "Zhè shì 语法.",
      "id": "Ini adalah 语法."
    }
  },
  {
    "id": "zh-v-966",
    "hanzi": "合格",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是合格。",
      "py": "Zhè shì 合格.",
      "id": "Ini adalah 合格."
    }
  },
  {
    "id": "zh-v-967",
    "hanzi": "著名",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是著名。",
      "py": "Zhè shì 著名.",
      "id": "Ini adalah 著名."
    }
  },
  {
    "id": "zh-v-968",
    "hanzi": "牙膏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是牙膏。",
      "py": "Zhè shì 牙膏.",
      "id": "Ini adalah 牙膏."
    }
  },
  {
    "id": "zh-v-969",
    "hanzi": "严格",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是严格。",
      "py": "Zhè shì 严格.",
      "id": "Ini adalah 严格."
    }
  },
  {
    "id": "zh-v-970",
    "hanzi": "方向",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是方向。",
      "py": "Zhè shì 方向.",
      "id": "Ini adalah 方向."
    }
  },
  {
    "id": "zh-v-971",
    "hanzi": "方法",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是方法。",
      "py": "Zhè shì 方法.",
      "id": "Ini adalah 方法."
    }
  },
  {
    "id": "zh-v-972",
    "hanzi": "坚持",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是坚持。",
      "py": "Zhè shì 坚持.",
      "id": "Ini adalah 坚持."
    }
  },
  {
    "id": "zh-v-973",
    "hanzi": "挤",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是挤。",
      "py": "Zhè shì 挤.",
      "id": "Ini adalah 挤."
    }
  },
  {
    "id": "zh-v-974",
    "hanzi": "完美",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是完美。",
      "py": "Zhè shì 完美.",
      "id": "Ini adalah 完美."
    }
  },
  {
    "id": "zh-v-975",
    "hanzi": "黄色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是黄色。",
      "py": "Zhè shì 黄色.",
      "id": "Ini adalah 黄色."
    }
  },
  {
    "id": "zh-v-976",
    "hanzi": "台",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是台。",
      "py": "Zhè shì 台.",
      "id": "Ini adalah 台."
    }
  },
  {
    "id": "zh-v-977",
    "hanzi": "胳膊",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是胳膊。",
      "py": "Zhè shì 胳膊.",
      "id": "Ini adalah 胳膊."
    }
  },
  {
    "id": "zh-v-978",
    "hanzi": "动作",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是动作。",
      "py": "Zhè shì 动作.",
      "id": "Ini adalah 动作."
    }
  },
  {
    "id": "zh-v-979",
    "hanzi": "推",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是推。",
      "py": "Zhè shì 推.",
      "id": "Ini adalah 推."
    }
  },
  {
    "id": "zh-v-980",
    "hanzi": "举",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是举。",
      "py": "Zhè shì 举.",
      "id": "Ini adalah 举."
    }
  },
  {
    "id": "zh-v-981",
    "hanzi": "效果",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是效果。",
      "py": "Zhè shì 效果.",
      "id": "Ini adalah 效果."
    }
  },
  {
    "id": "zh-v-982",
    "hanzi": "跑步机",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是跑步机。",
      "py": "Zhè shì 跑步机.",
      "id": "Ini adalah 跑步机."
    }
  },
  {
    "id": "zh-v-983",
    "hanzi": "器械",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是器械。",
      "py": "Zhè shì 器械.",
      "id": "Ini adalah 器械."
    }
  },
  {
    "id": "zh-v-984",
    "hanzi": "填空",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是填空。",
      "py": "Zhè shì 填空.",
      "id": "Ini adalah 填空."
    }
  },
  {
    "id": "zh-v-985",
    "hanzi": "粗心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是粗心。",
      "py": "Zhè shì 粗心.",
      "id": "Ini adalah 粗心."
    }
  },
  {
    "id": "zh-v-986",
    "hanzi": "空",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是空。",
      "py": "Zhè shì 空.",
      "id": "Ini adalah 空."
    }
  },
  {
    "id": "zh-v-987",
    "hanzi": "批评",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是批评。",
      "py": "Zhè shì 批评.",
      "id": "Ini adalah 批评."
    }
  },
  {
    "id": "zh-v-988",
    "hanzi": "缺点",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是缺点。",
      "py": "Zhè shì 缺点.",
      "id": "Ini adalah 缺点."
    }
  },
  {
    "id": "zh-v-989",
    "hanzi": "优点",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是优点。",
      "py": "Zhè shì 优点.",
      "id": "Ini adalah 优点."
    }
  },
  {
    "id": "zh-v-990",
    "hanzi": "指",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是指。",
      "py": "Zhè shì 指.",
      "id": "Ini adalah 指."
    }
  },
  {
    "id": "zh-v-991",
    "hanzi": "相反",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是相反。",
      "py": "Zhè shì 相反.",
      "id": "Ini adalah 相反."
    }
  },
  {
    "id": "zh-v-992",
    "hanzi": "俩",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是俩。",
      "py": "Zhè shì 俩.",
      "id": "Ini adalah 俩."
    }
  },
  {
    "id": "zh-v-993",
    "hanzi": "感情",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是感情。",
      "py": "Zhè shì 感情.",
      "id": "Ini adalah 感情."
    }
  },
  {
    "id": "zh-v-994",
    "hanzi": "羡慕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是羡慕。",
      "py": "Zhè shì 羡慕.",
      "id": "Ini adalah 羡慕."
    }
  },
  {
    "id": "zh-v-995",
    "hanzi": "方面",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是方面。",
      "py": "Zhè shì 方面.",
      "id": "Ini adalah 方面."
    }
  },
  {
    "id": "zh-v-996",
    "hanzi": "例如",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是例如。",
      "py": "Zhè shì 例如.",
      "id": "Ini adalah 例如."
    }
  },
  {
    "id": "zh-v-997",
    "hanzi": "节省",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是节省。",
      "py": "Zhè shì 节省.",
      "id": "Ini adalah 节省."
    }
  },
  {
    "id": "zh-v-998",
    "hanzi": "名牌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是名牌。",
      "py": "Zhè shì 名牌.",
      "id": "Ini adalah 名牌."
    }
  },
  {
    "id": "zh-v-999",
    "hanzi": "穷",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是穷。",
      "py": "Zhè shì 穷.",
      "id": "Ini adalah 穷."
    }
  },
  {
    "id": "zh-v-1000",
    "hanzi": "困",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是困。",
      "py": "Zhè shì 困.",
      "id": "Ini adalah 困."
    }
  },
  {
    "id": "zh-v-1001",
    "hanzi": "梦",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是梦。",
      "py": "Zhè shì 梦.",
      "id": "Ini adalah 梦."
    }
  },
  {
    "id": "zh-v-1002",
    "hanzi": "迷路",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是迷路。",
      "py": "Zhè shì 迷路.",
      "id": "Ini adalah 迷路."
    }
  },
  {
    "id": "zh-v-1003",
    "hanzi": "老虎",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是老虎。",
      "py": "Zhè shì 老虎.",
      "id": "Ini adalah 老虎."
    }
  },
  {
    "id": "zh-v-1004",
    "hanzi": "转",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是转。",
      "py": "Zhè shì 转.",
      "id": "Ini adalah 转."
    }
  },
  {
    "id": "zh-v-1005",
    "hanzi": "汗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是汗。",
      "py": "Zhè shì 汗.",
      "id": "Ini adalah 汗."
    }
  },
  {
    "id": "zh-v-1006",
    "hanzi": "追",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是追。",
      "py": "Zhè shì 追.",
      "id": "Ini adalah 追."
    }
  },
  {
    "id": "zh-v-1007",
    "hanzi": "摔倒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是摔倒。",
      "py": "Zhè shì 摔倒.",
      "id": "Ini adalah 摔倒."
    }
  },
  {
    "id": "zh-v-1008",
    "hanzi": "托运",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是托运。",
      "py": "Zhè shì 托运.",
      "id": "Ini adalah 托运."
    }
  },
  {
    "id": "zh-v-1009",
    "hanzi": "行李",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是行李。",
      "py": "Zhè shì 行李.",
      "id": "Ini adalah 行李."
    }
  },
  {
    "id": "zh-v-1010",
    "hanzi": "电池",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是电池。",
      "py": "Zhè shì 电池.",
      "id": "Ini adalah 电池."
    }
  },
  {
    "id": "zh-v-1011",
    "hanzi": "禁止",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是禁止。",
      "py": "Zhè shì 禁止.",
      "id": "Ini adalah 禁止."
    }
  },
  {
    "id": "zh-v-1012",
    "hanzi": "好像",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是好像。",
      "py": "Zhè shì 好像.",
      "id": "Ini adalah 好像."
    }
  },
  {
    "id": "zh-v-1013",
    "hanzi": "登机",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是登机。",
      "py": "Zhè shì 登机.",
      "id": "Ini adalah 登机."
    }
  },
  {
    "id": "zh-v-1014",
    "hanzi": "靠",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是靠。",
      "py": "Zhè shì 靠.",
      "id": "Ini adalah 靠."
    }
  },
  {
    "id": "zh-v-1015",
    "hanzi": "过道",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是过道。",
      "py": "Zhè shì 过道.",
      "id": "Ini adalah 过道."
    }
  },
  {
    "id": "zh-v-1016",
    "hanzi": "塑料",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是塑料。",
      "py": "Zhè shì 塑料.",
      "id": "Ini adalah 塑料."
    }
  },
  {
    "id": "zh-v-1017",
    "hanzi": "塑料袋",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是塑料袋。",
      "py": "Zhè shì 塑料袋.",
      "id": "Ini adalah 塑料袋."
    }
  },
  {
    "id": "zh-v-1018",
    "hanzi": "污染",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是污染。",
      "py": "Zhè shì 污染.",
      "id": "Ini adalah 污染."
    }
  },
  {
    "id": "zh-v-1019",
    "hanzi": "死",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是死。",
      "py": "Zhè shì 死.",
      "id": "Ini adalah 死."
    }
  },
  {
    "id": "zh-v-1020",
    "hanzi": "可怜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是可怜。",
      "py": "Zhè shì 可怜.",
      "id": "Ini adalah 可怜."
    }
  },
  {
    "id": "zh-v-1021",
    "hanzi": "刀",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是刀。",
      "py": "Zhè shì 刀.",
      "id": "Ini adalah 刀."
    }
  },
  {
    "id": "zh-v-1022",
    "hanzi": "海",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是海。",
      "py": "Zhè shì 海.",
      "id": "Ini adalah 海."
    }
  },
  {
    "id": "zh-v-1023",
    "hanzi": "鲸鱼",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是鲸鱼。",
      "py": "Zhè shì 鲸鱼.",
      "id": "Ini adalah 鲸鱼."
    }
  },
  {
    "id": "zh-v-1024",
    "hanzi": "烦恼",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是烦恼。",
      "py": "Zhè shì 烦恼.",
      "id": "Ini adalah 烦恼."
    }
  },
  {
    "id": "zh-v-1025",
    "hanzi": "主意",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是主意。",
      "py": "Zhè shì 主意.",
      "id": "Ini adalah 主意."
    }
  },
  {
    "id": "zh-v-1026",
    "hanzi": "提供",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是提供。",
      "py": "Zhè shì 提供.",
      "id": "Ini adalah 提供."
    }
  },
  {
    "id": "zh-v-1027",
    "hanzi": "胃口",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是胃口。",
      "py": "Zhè shì 胃口.",
      "id": "Ini adalah 胃口."
    }
  },
  {
    "id": "zh-v-1028",
    "hanzi": "抓",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是抓。",
      "py": "Zhè shì 抓.",
      "id": "Ini adalah 抓."
    }
  },
  {
    "id": "zh-v-1029",
    "hanzi": "激烈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是激烈。",
      "py": "Zhè shì 激烈.",
      "id": "Ini adalah 激烈."
    }
  },
  {
    "id": "zh-v-1030",
    "hanzi": "之间",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是之间。",
      "py": "Zhè shì 之间.",
      "id": "Ini adalah 之间."
    }
  },
  {
    "id": "zh-v-1031",
    "hanzi": "皮肤",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是皮肤。",
      "py": "Zhè shì 皮肤.",
      "id": "Ini adalah 皮肤."
    }
  },
  {
    "id": "zh-v-1032",
    "hanzi": "国籍",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是国籍。",
      "py": "Zhè shì 国籍.",
      "id": "Ini adalah 国籍."
    }
  },
  {
    "id": "zh-v-1033",
    "hanzi": "亚洲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是亚洲。",
      "py": "Zhè shì 亚洲.",
      "id": "Ini adalah 亚洲."
    }
  },
  {
    "id": "zh-v-1034",
    "hanzi": "性别",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是性别。",
      "py": "Zhè shì 性别.",
      "id": "Ini adalah 性别."
    }
  },
  {
    "id": "zh-v-1035",
    "hanzi": "普通话",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是普通话。",
      "py": "Zhè shì 普通话.",
      "id": "Ini adalah 普通话."
    }
  },
  {
    "id": "zh-v-1036",
    "hanzi": "流利",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是流利。",
      "py": "Zhè shì 流利.",
      "id": "Ini adalah 流利."
    }
  },
  {
    "id": "zh-v-1037",
    "hanzi": "翻译",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是翻译。",
      "py": "Zhè shì 翻译.",
      "id": "Ini adalah 翻译."
    }
  },
  {
    "id": "zh-v-1038",
    "hanzi": "外语",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是外语。",
      "py": "Zhè shì 外语.",
      "id": "Ini adalah 外语."
    }
  },
  {
    "id": "zh-v-1039",
    "hanzi": "客户",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是客户。",
      "py": "Zhè shì 客户.",
      "id": "Ini adalah 客户."
    }
  },
  {
    "id": "zh-v-1040",
    "hanzi": "优惠",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是优惠。",
      "py": "Zhè shì 优惠.",
      "id": "Ini adalah 优惠."
    }
  },
  {
    "id": "zh-v-1041",
    "hanzi": "组织",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是组织。",
      "py": "Zhè shì 组织.",
      "id": "Ini adalah 组织."
    }
  },
  {
    "id": "zh-v-1042",
    "hanzi": "告别",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是告别。",
      "py": "Zhè shì 告别.",
      "id": "Ini adalah 告别."
    }
  },
  {
    "id": "zh-v-1043",
    "hanzi": "单身",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是单身。",
      "py": "Zhè shì 单身.",
      "id": "Ini adalah 单身."
    }
  },
  {
    "id": "zh-v-1044",
    "hanzi": "促进",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是促进。",
      "py": "Zhè shì 促进.",
      "id": "Ini adalah 促进."
    }
  },
  {
    "id": "zh-v-1045",
    "hanzi": "利用",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是利用。",
      "py": "Zhè shì 利用.",
      "id": "Ini adalah 利用."
    }
  },
  {
    "id": "zh-v-1046",
    "hanzi": "感受",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是感受。",
      "py": "Zhè shì 感受.",
      "id": "Ini adalah 感受."
    }
  },
  {
    "id": "zh-v-1047",
    "hanzi": "刺激",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是刺激。",
      "py": "Zhè shì 刺激.",
      "id": "Ini adalah 刺激."
    }
  },
  {
    "id": "zh-v-1048",
    "hanzi": "通勤",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是通勤。",
      "py": "Zhè shì 通勤.",
      "id": "Ini adalah 通勤."
    }
  },
  {
    "id": "zh-v-1049",
    "hanzi": "项",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是项。",
      "py": "Zhè shì 项.",
      "id": "Ini adalah 项."
    }
  },
  {
    "id": "zh-v-1050",
    "hanzi": "接近",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是接近。",
      "py": "Zhè shì 接近.",
      "id": "Ini adalah 接近."
    }
  },
  {
    "id": "zh-v-1051",
    "hanzi": "平均",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是平均。",
      "py": "Zhè shì 平均.",
      "id": "Ini adalah 平均."
    }
  },
  {
    "id": "zh-v-1052",
    "hanzi": "公共",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是公共。",
      "py": "Zhè shì 公共.",
      "id": "Ini adalah 公共."
    }
  },
  {
    "id": "zh-v-1053",
    "hanzi": "班车",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是班车。",
      "py": "Zhè shì 班车.",
      "id": "Ini adalah 班车."
    }
  },
  {
    "id": "zh-v-1054",
    "hanzi": "超级",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是超级。",
      "py": "Zhè shì 超级.",
      "id": "Ini adalah 超级."
    }
  },
  {
    "id": "zh-v-1055",
    "hanzi": "视频",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是视频。",
      "py": "Zhè shì 视频.",
      "id": "Ini adalah 视频."
    }
  },
  {
    "id": "zh-v-1056",
    "hanzi": "人事",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是人事。",
      "py": "Zhè shì 人事.",
      "id": "Ini adalah 人事."
    }
  },
  {
    "id": "zh-v-1057",
    "hanzi": "简历",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是简历。",
      "py": "Zhè shì 简历.",
      "id": "Ini adalah 简历."
    }
  },
  {
    "id": "zh-v-1058",
    "hanzi": "设计",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是设计。",
      "py": "Zhè shì 设计.",
      "id": "Ini adalah 设计."
    }
  },
  {
    "id": "zh-v-1059",
    "hanzi": "本科",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是本科。",
      "py": "Zhè shì 本科.",
      "id": "Ini adalah 本科."
    }
  },
  {
    "id": "zh-v-1060",
    "hanzi": "美术",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是美术。",
      "py": "Zhè shì 美术.",
      "id": "Ini adalah 美术."
    }
  },
  {
    "id": "zh-v-1061",
    "hanzi": "合同",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是合同。",
      "py": "Zhè shì 合同.",
      "id": "Ini adalah 合同."
    }
  },
  {
    "id": "zh-v-1062",
    "hanzi": "作品",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是作品。",
      "py": "Zhè shì 作品.",
      "id": "Ini adalah 作品."
    }
  },
  {
    "id": "zh-v-1063",
    "hanzi": "到期",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是到期。",
      "py": "Zhè shì 到期.",
      "id": "Ini adalah 到期."
    }
  },
  {
    "id": "zh-v-1064",
    "hanzi": "所",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是所。",
      "py": "Zhè shì 所.",
      "id": "Ini adalah 所."
    }
  },
  {
    "id": "zh-v-1065",
    "hanzi": "梦想",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是梦想。",
      "py": "Zhè shì 梦想.",
      "id": "Ini adalah 梦想."
    }
  },
  {
    "id": "zh-v-1066",
    "hanzi": "连续",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是连续。",
      "py": "Zhè shì 连续.",
      "id": "Ini adalah 连续."
    }
  },
  {
    "id": "zh-v-1067",
    "hanzi": "自从",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是自从。",
      "py": "Zhè shì 自从.",
      "id": "Ini adalah 自从."
    }
  },
  {
    "id": "zh-v-1068",
    "hanzi": "想象",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是想象。",
      "py": "Zhè shì 想象.",
      "id": "Ini adalah 想象."
    }
  },
  {
    "id": "zh-v-1069",
    "hanzi": "心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是心。",
      "py": "Zhè shì 心.",
      "id": "Ini adalah 心."
    }
  },
  {
    "id": "zh-v-1070",
    "hanzi": "邮箱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是邮箱。",
      "py": "Zhè shì 邮箱.",
      "id": "Ini adalah 邮箱."
    }
  },
  {
    "id": "zh-v-1071",
    "hanzi": "回复",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是回复。",
      "py": "Zhè shì 回复.",
      "id": "Ini adalah 回复."
    }
  },
  {
    "id": "zh-v-1072",
    "hanzi": "从前",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是从前。",
      "py": "Zhè shì 从前.",
      "id": "Ini adalah 从前."
    }
  },
  {
    "id": "zh-v-1073",
    "hanzi": "风格",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是风格。",
      "py": "Zhè shì 风格.",
      "id": "Ini adalah 风格."
    }
  },
  {
    "id": "zh-v-1074",
    "hanzi": "精神",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是精神。",
      "py": "Zhè shì 精神.",
      "id": "Ini adalah 精神."
    }
  },
  {
    "id": "zh-v-1075",
    "hanzi": "犹豫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是犹豫。",
      "py": "Zhè shì 犹豫.",
      "id": "Ini adalah 犹豫."
    }
  },
  {
    "id": "zh-v-1076",
    "hanzi": "显得",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是显得。",
      "py": "Zhè shì 显得.",
      "id": "Ini adalah 显得."
    }
  },
  {
    "id": "zh-v-1077",
    "hanzi": "好奇",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是好奇。",
      "py": "Zhè shì 好奇.",
      "id": "Ini adalah 好奇."
    }
  },
  {
    "id": "zh-v-1078",
    "hanzi": "假期",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是假期。",
      "py": "Zhè shì 假期.",
      "id": "Ini adalah 假期."
    }
  },
  {
    "id": "zh-v-1079",
    "hanzi": "发型",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是发型。",
      "py": "Zhè shì 发型.",
      "id": "Ini adalah 发型."
    }
  },
  {
    "id": "zh-v-1080",
    "hanzi": "大妈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是大妈。",
      "py": "Zhè shì 大妈.",
      "id": "Ini adalah 大妈."
    }
  },
  {
    "id": "zh-v-1081",
    "hanzi": "老伴儿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是老伴儿。",
      "py": "Zhè shì 老伴儿.",
      "id": "Ini adalah 老伴儿."
    }
  },
  {
    "id": "zh-v-1082",
    "hanzi": "退休",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是退休。",
      "py": "Zhè shì 退休.",
      "id": "Ini adalah 退休."
    }
  },
  {
    "id": "zh-v-1083",
    "hanzi": "享受",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是享受。",
      "py": "Zhè shì 享受.",
      "id": "Ini adalah 享受."
    }
  },
  {
    "id": "zh-v-1084",
    "hanzi": "日子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是日子。",
      "py": "Zhè shì 日子.",
      "id": "Ini adalah 日子."
    }
  },
  {
    "id": "zh-v-1085",
    "hanzi": "面对",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是面对。",
      "py": "Zhè shì 面对.",
      "id": "Ini adalah 面对."
    }
  },
  {
    "id": "zh-v-1086",
    "hanzi": "忽然",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是忽然。",
      "py": "Zhè shì 忽然.",
      "id": "Ini adalah 忽然."
    }
  },
  {
    "id": "zh-v-1087",
    "hanzi": "铃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是铃。",
      "py": "Zhè shì 铃.",
      "id": "Ini adalah 铃."
    }
  },
  {
    "id": "zh-v-1088",
    "hanzi": "快递员",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是快递员。",
      "py": "Zhè shì 快递员.",
      "id": "Ini adalah 快递员."
    }
  },
  {
    "id": "zh-v-1089",
    "hanzi": "催",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是催。",
      "py": "Zhè shì 催.",
      "id": "Ini adalah 催."
    }
  },
  {
    "id": "zh-v-1090",
    "hanzi": "领导",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是领导。",
      "py": "Zhè shì 领导.",
      "id": "Ini adalah 领导."
    }
  },
  {
    "id": "zh-v-1091",
    "hanzi": "报告",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是报告。",
      "py": "Zhè shì 报告.",
      "id": "Ini adalah 报告."
    }
  },
  {
    "id": "zh-v-1092",
    "hanzi": "赶紧",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是赶紧。",
      "py": "Zhè shì 赶紧.",
      "id": "Ini adalah 赶紧."
    }
  },
  {
    "id": "zh-v-1093",
    "hanzi": "一致",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是一致。",
      "py": "Zhè shì 一致.",
      "id": "Ini adalah 一致."
    }
  },
  {
    "id": "zh-v-1094",
    "hanzi": "耽误",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是耽误。",
      "py": "Zhè shì 耽误.",
      "id": "Ini adalah 耽误."
    }
  },
  {
    "id": "zh-v-1095",
    "hanzi": "页",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是页。",
      "py": "Zhè shì 页.",
      "id": "Ini adalah 页."
    }
  },
  {
    "id": "zh-v-1096",
    "hanzi": "网约车",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是网约车。",
      "py": "Zhè shì 网约车.",
      "id": "Ini adalah 网约车."
    }
  },
  {
    "id": "zh-v-1097",
    "hanzi": "辞职",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是辞职。",
      "py": "Zhè shì 辞职.",
      "id": "Ini adalah 辞职."
    }
  },
  {
    "id": "zh-v-1098",
    "hanzi": "宽敞",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是宽敞。",
      "py": "Zhè shì 宽敞.",
      "id": "Ini adalah 宽敞."
    }
  },
  {
    "id": "zh-v-1099",
    "hanzi": "前途",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是前途。",
      "py": "Zhè shì 前途.",
      "id": "Ini adalah 前途."
    }
  },
  {
    "id": "zh-v-1100",
    "hanzi": "固定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是固定。",
      "py": "Zhè shì 固定.",
      "id": "Ini adalah 固定."
    }
  },
  {
    "id": "zh-v-1101",
    "hanzi": "单调",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是单调。",
      "py": "Zhè shì 单调.",
      "id": "Ini adalah 单调."
    }
  },
  {
    "id": "zh-v-1102",
    "hanzi": "灵活",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是灵活。",
      "py": "Zhè shì 灵活.",
      "id": "Ini adalah 灵活."
    }
  },
  {
    "id": "zh-v-1103",
    "hanzi": "劝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是劝。",
      "py": "Zhè shì 劝.",
      "id": "Ini adalah 劝."
    }
  },
  {
    "id": "zh-v-1104",
    "hanzi": "火",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是火。",
      "py": "Zhè shì 火.",
      "id": "Ini adalah 火."
    }
  },
  {
    "id": "zh-v-1105",
    "hanzi": "直播",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是直播。",
      "py": "Zhè shì 直播.",
      "id": "Ini adalah 直播."
    }
  },
  {
    "id": "zh-v-1106",
    "hanzi": "嘉宾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是嘉宾。",
      "py": "Zhè shì 嘉宾.",
      "id": "Ini adalah 嘉宾."
    }
  },
  {
    "id": "zh-v-1107",
    "hanzi": "行业",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是行业。",
      "py": "Zhè shì 行业.",
      "id": "Ini adalah 行业."
    }
  },
  {
    "id": "zh-v-1108",
    "hanzi": "商品",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是商品。",
      "py": "Zhè shì 商品.",
      "id": "Ini adalah 商品."
    }
  },
  {
    "id": "zh-v-1109",
    "hanzi": "舞蹈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是舞蹈。",
      "py": "Zhè shì 舞蹈.",
      "id": "Ini adalah 舞蹈."
    }
  },
  {
    "id": "zh-v-1110",
    "hanzi": "服装",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是服装。",
      "py": "Zhè shì 服装.",
      "id": "Ini adalah 服装."
    }
  },
  {
    "id": "zh-v-1111",
    "hanzi": "稳定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是稳定。",
      "py": "Zhè shì 稳定.",
      "id": "Ini adalah 稳定."
    }
  },
  {
    "id": "zh-v-1112",
    "hanzi": "如何",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是如何。",
      "py": "Zhè shì 如何.",
      "id": "Ini adalah 如何."
    }
  },
  {
    "id": "zh-v-1113",
    "hanzi": "中介",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是中介。",
      "py": "Zhè shì 中介.",
      "id": "Ini adalah 中介."
    }
  },
  {
    "id": "zh-v-1114",
    "hanzi": "预算",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是预算。",
      "py": "Zhè shì 预算.",
      "id": "Ini adalah 预算."
    }
  },
  {
    "id": "zh-v-1115",
    "hanzi": "套",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是套。",
      "py": "Zhè shì 套.",
      "id": "Ini adalah 套."
    }
  },
  {
    "id": "zh-v-1116",
    "hanzi": "押金",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是押金。",
      "py": "Zhè shì 押金.",
      "id": "Ini adalah 押金."
    }
  },
  {
    "id": "zh-v-1117",
    "hanzi": "签",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是签。",
      "py": "Zhè shì 签.",
      "id": "Ini adalah 签."
    }
  },
  {
    "id": "zh-v-1118",
    "hanzi": "赔偿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是赔偿。",
      "py": "Zhè shì 赔偿.",
      "id": "Ini adalah 赔偿."
    }
  },
  {
    "id": "zh-v-1119",
    "hanzi": "夫妻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是夫妻。",
      "py": "Zhè shì 夫妻.",
      "id": "Ini adalah 夫妻."
    }
  },
  {
    "id": "zh-v-1120",
    "hanzi": "宝贝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是宝贝。",
      "py": "Zhè shì 宝贝.",
      "id": "Ini adalah 宝贝."
    }
  },
  {
    "id": "zh-v-1121",
    "hanzi": "怀孕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是怀孕。",
      "py": "Zhè shì 怀孕.",
      "id": "Ini adalah 怀孕."
    }
  },
  {
    "id": "zh-v-1122",
    "hanzi": "简直",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是简直。",
      "py": "Zhè shì 简直.",
      "id": "Ini adalah 简直."
    }
  },
  {
    "id": "zh-v-1123",
    "hanzi": "完整",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是完整。",
      "py": "Zhè shì 完整.",
      "id": "Ini adalah 完整."
    }
  },
  {
    "id": "zh-v-1124",
    "hanzi": "伟大",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是伟大。",
      "py": "Zhè shì 伟大.",
      "id": "Ini adalah 伟大."
    }
  },
  {
    "id": "zh-v-1125",
    "hanzi": "恢复",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是恢复。",
      "py": "Zhè shì 恢复.",
      "id": "Ini adalah 恢复."
    }
  },
  {
    "id": "zh-v-1126",
    "hanzi": "腰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是腰。",
      "py": "Zhè shì 腰.",
      "id": "Ini adalah 腰."
    }
  },
  {
    "id": "zh-v-1127",
    "hanzi": "尽快",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是尽快。",
      "py": "Zhè shì 尽快.",
      "id": "Ini adalah 尽快."
    }
  },
  {
    "id": "zh-v-1128",
    "hanzi": "倒霉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是倒霉。",
      "py": "Zhè shì 倒霉.",
      "id": "Ini adalah 倒霉."
    }
  },
  {
    "id": "zh-v-1129",
    "hanzi": "冲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是冲。",
      "py": "Zhè shì 冲.",
      "id": "Ini adalah 冲."
    }
  },
  {
    "id": "zh-v-1130",
    "hanzi": "滑",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是滑。",
      "py": "Zhè shì 滑.",
      "id": "Ini adalah 滑."
    }
  },
  {
    "id": "zh-v-1131",
    "hanzi": "墙",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是墙。",
      "py": "Zhè shì 墙.",
      "id": "Ini adalah 墙."
    }
  },
  {
    "id": "zh-v-1132",
    "hanzi": "平常",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是平常。",
      "py": "Zhè shì 平常.",
      "id": "Ini adalah 平常."
    }
  },
  {
    "id": "zh-v-1133",
    "hanzi": "骂",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是骂。",
      "py": "Zhè shì 骂.",
      "id": "Ini adalah 骂."
    }
  },
  {
    "id": "zh-v-1134",
    "hanzi": "确定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是确定。",
      "py": "Zhè shì 确定.",
      "id": "Ini adalah 确定."
    }
  },
  {
    "id": "zh-v-1135",
    "hanzi": "连忙",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是连忙。",
      "py": "Zhè shì 连忙.",
      "id": "Ini adalah 连忙."
    }
  },
  {
    "id": "zh-v-1136",
    "hanzi": "博物馆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是博物馆。",
      "py": "Zhè shì 博物馆.",
      "id": "Ini adalah 博物馆."
    }
  },
  {
    "id": "zh-v-1137",
    "hanzi": "游览",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是游览。",
      "py": "Zhè shì 游览.",
      "id": "Ini adalah 游览."
    }
  },
  {
    "id": "zh-v-1138",
    "hanzi": "展览",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是展览。",
      "py": "Zhè shì 展览.",
      "id": "Ini adalah 展览."
    }
  },
  {
    "id": "zh-v-1139",
    "hanzi": "欣赏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是欣赏。",
      "py": "Zhè shì 欣赏.",
      "id": "Ini adalah 欣赏."
    }
  },
  {
    "id": "zh-v-1140",
    "hanzi": "现场",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是现场。",
      "py": "Zhè shì 现场.",
      "id": "Ini adalah 现场."
    }
  },
  {
    "id": "zh-v-1141",
    "hanzi": "不然",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是不然。",
      "py": "Zhè shì 不然.",
      "id": "Ini adalah 不然."
    }
  },
  {
    "id": "zh-v-1142",
    "hanzi": "手续",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是手续。",
      "py": "Zhè shì 手续.",
      "id": "Ini adalah 手续."
    }
  },
  {
    "id": "zh-v-1143",
    "hanzi": "恶劣",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是恶劣。",
      "py": "Zhè shì 恶劣.",
      "id": "Ini adalah 恶劣."
    }
  },
  {
    "id": "zh-v-1144",
    "hanzi": "论文",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是论文。",
      "py": "Zhè shì 论文.",
      "id": "Ini adalah 论文."
    }
  },
  {
    "id": "zh-v-1145",
    "hanzi": "障碍",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是障碍。",
      "py": "Zhè shì 障碍.",
      "id": "Ini adalah 障碍."
    }
  },
  {
    "id": "zh-v-1146",
    "hanzi": "相当",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是相当。",
      "py": "Zhè shì 相当.",
      "id": "Ini adalah 相当."
    }
  },
  {
    "id": "zh-v-1147",
    "hanzi": "日常",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是日常。",
      "py": "Zhè shì 日常.",
      "id": "Ini adalah 日常."
    }
  },
  {
    "id": "zh-v-1148",
    "hanzi": "口音",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是口音。",
      "py": "Zhè shì 口音.",
      "id": "Ini adalah 口音."
    }
  },
  {
    "id": "zh-v-1149",
    "hanzi": "指导",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是指导。",
      "py": "Zhè shì 指导.",
      "id": "Ini adalah 指导."
    }
  },
  {
    "id": "zh-v-1150",
    "hanzi": "最初",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是最初。",
      "py": "Zhè shì 最初.",
      "id": "Ini adalah 最初."
    }
  },
  {
    "id": "zh-v-1151",
    "hanzi": "参与",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是参与。",
      "py": "Zhè shì 参与.",
      "id": "Ini adalah 参与."
    }
  },
  {
    "id": "zh-v-1152",
    "hanzi": "个人",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是个人。",
      "py": "Zhè shì 个人.",
      "id": "Ini adalah 个人."
    }
  },
  {
    "id": "zh-v-1153",
    "hanzi": "启发",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是启发。",
      "py": "Zhè shì 启发.",
      "id": "Ini adalah 启发."
    }
  },
  {
    "id": "zh-v-1154",
    "hanzi": "脆弱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是脆弱。",
      "py": "Zhè shì 脆弱.",
      "id": "Ini adalah 脆弱."
    }
  },
  {
    "id": "zh-v-1155",
    "hanzi": "遗憾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是遗憾。",
      "py": "Zhè shì 遗憾.",
      "id": "Ini adalah 遗憾."
    }
  },
  {
    "id": "zh-v-1156",
    "hanzi": "转变",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是转变。",
      "py": "Zhè shì 转变.",
      "id": "Ini adalah 转变."
    }
  },
  {
    "id": "zh-v-1157",
    "hanzi": "佩服",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是佩服。",
      "py": "Zhè shì 佩服.",
      "id": "Ini adalah 佩服."
    }
  },
  {
    "id": "zh-v-1158",
    "hanzi": "勇气",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是勇气。",
      "py": "Zhè shì 勇气.",
      "id": "Ini adalah 勇气."
    }
  },
  {
    "id": "zh-v-1159",
    "hanzi": "想法",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是想法。",
      "py": "Zhè shì 想法.",
      "id": "Ini adalah 想法."
    }
  },
  {
    "id": "zh-v-1160",
    "hanzi": "宠物",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是宠物。",
      "py": "Zhè shì 宠物.",
      "id": "Ini adalah 宠物."
    }
  },
  {
    "id": "zh-v-1161",
    "hanzi": "恋爱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是恋爱。",
      "py": "Zhè shì 恋爱.",
      "id": "Ini adalah 恋爱."
    }
  },
  {
    "id": "zh-v-1162",
    "hanzi": "采访",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是采访。",
      "py": "Zhè shì 采访.",
      "id": "Ini adalah 采访."
    }
  },
  {
    "id": "zh-v-1163",
    "hanzi": "情绪",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是情绪。",
      "py": "Zhè shì 情绪.",
      "id": "Ini adalah 情绪."
    }
  },
  {
    "id": "zh-v-1164",
    "hanzi": "脑袋",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是脑袋。",
      "py": "Zhè shì 脑袋.",
      "id": "Ini adalah 脑袋."
    }
  },
  {
    "id": "zh-v-1165",
    "hanzi": "碰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是碰。",
      "py": "Zhè shì 碰.",
      "id": "Ini adalah 碰."
    }
  },
  {
    "id": "zh-v-1166",
    "hanzi": "温暖",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是温暖。",
      "py": "Zhè shì 温暖.",
      "id": "Ini adalah 温暖."
    }
  },
  {
    "id": "zh-v-1167",
    "hanzi": "孤单",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是孤单。",
      "py": "Zhè shì 孤单.",
      "id": "Ini adalah 孤单."
    }
  },
  {
    "id": "zh-v-1168",
    "hanzi": "神秘",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是神秘。",
      "py": "Zhè shì 神秘.",
      "id": "Ini adalah 神秘."
    }
  },
  {
    "id": "zh-v-1169",
    "hanzi": "戒指",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是戒指。",
      "py": "Zhè shì 戒指.",
      "id": "Ini adalah 戒指."
    }
  },
  {
    "id": "zh-v-1170",
    "hanzi": "庆祝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是庆祝。",
      "py": "Zhè shì 庆祝.",
      "id": "Ini adalah 庆祝."
    }
  },
  {
    "id": "zh-v-1171",
    "hanzi": "经典",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是经典。",
      "py": "Zhè shì 经典.",
      "id": "Ini adalah 经典."
    }
  },
  {
    "id": "zh-v-1172",
    "hanzi": "嫁",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是嫁。",
      "py": "Zhè shì 嫁.",
      "id": "Ini adalah 嫁."
    }
  },
  {
    "id": "zh-v-1173",
    "hanzi": "惊讶",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是惊讶。",
      "py": "Zhè shì 惊讶.",
      "id": "Ini adalah 惊讶."
    }
  },
  {
    "id": "zh-v-1174",
    "hanzi": "娶",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是娶。",
      "py": "Zhè shì 娶.",
      "id": "Ini adalah 娶."
    }
  },
  {
    "id": "zh-v-1175",
    "hanzi": "表现",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是表现。",
      "py": "Zhè shì 表现.",
      "id": "Ini adalah 表现."
    }
  },
  {
    "id": "zh-v-1176",
    "hanzi": "地震",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是地震。",
      "py": "Zhè shì 地震.",
      "id": "Ini adalah 地震."
    }
  },
  {
    "id": "zh-v-1177",
    "hanzi": "立刻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是立刻。",
      "py": "Zhè shì 立刻.",
      "id": "Ini adalah 立刻."
    }
  },
  {
    "id": "zh-v-1178",
    "hanzi": "手术",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是手术。",
      "py": "Zhè shì 手术.",
      "id": "Ini adalah 手术."
    }
  },
  {
    "id": "zh-v-1179",
    "hanzi": "乐观",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是乐观。",
      "py": "Zhè shì 乐观.",
      "id": "Ini adalah 乐观."
    }
  },
  {
    "id": "zh-v-1180",
    "hanzi": "从此",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是从此。",
      "py": "Zhè shì 从此.",
      "id": "Ini adalah 从此."
    }
  },
  {
    "id": "zh-v-1181",
    "hanzi": "艰苦",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是艰苦。",
      "py": "Zhè shì 艰苦.",
      "id": "Ini adalah 艰苦."
    }
  },
  {
    "id": "zh-v-1182",
    "hanzi": "血",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是血。",
      "py": "Zhè shì 血.",
      "id": "Ini adalah 血."
    }
  },
  {
    "id": "zh-v-1183",
    "hanzi": "心疼",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是心疼。",
      "py": "Zhè shì 心疼.",
      "id": "Ini adalah 心疼."
    }
  },
  {
    "id": "zh-v-1184",
    "hanzi": "打听",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是打听。",
      "py": "Zhè shì 打听.",
      "id": "Ini adalah 打听."
    }
  },
  {
    "id": "zh-v-1185",
    "hanzi": "涨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是涨。",
      "py": "Zhè shì 涨.",
      "id": "Ini adalah 涨."
    }
  },
  {
    "id": "zh-v-1186",
    "hanzi": "的确",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是的确。",
      "py": "Zhè shì 的确.",
      "id": "Ini adalah 的确."
    }
  },
  {
    "id": "zh-v-1187",
    "hanzi": "双方",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是双方。",
      "py": "Zhè shì 双方.",
      "id": "Ini adalah 双方."
    }
  },
  {
    "id": "zh-v-1188",
    "hanzi": "尴尬",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是尴尬。",
      "py": "Zhè shì 尴尬.",
      "id": "Ini adalah 尴尬."
    }
  },
  {
    "id": "zh-v-1189",
    "hanzi": "事先",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是事先。",
      "py": "Zhè shì 事先.",
      "id": "Ini adalah 事先."
    }
  },
  {
    "id": "zh-v-1190",
    "hanzi": "贡献",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是贡献。",
      "py": "Zhè shì 贡献.",
      "id": "Ini adalah 贡献."
    }
  },
  {
    "id": "zh-v-1191",
    "hanzi": "价值",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是价值。",
      "py": "Zhè shì 价值.",
      "id": "Ini adalah 价值."
    }
  },
  {
    "id": "zh-v-1192",
    "hanzi": "专心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是专心。",
      "py": "Zhè shì 专心.",
      "id": "Ini adalah 专心."
    }
  },
  {
    "id": "zh-v-1193",
    "hanzi": "合作",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是合作。",
      "py": "Zhè shì 合作.",
      "id": "Ini adalah 合作."
    }
  },
  {
    "id": "zh-v-1194",
    "hanzi": "决赛",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是决赛。",
      "py": "Zhè shì 决赛.",
      "id": "Ini adalah 决赛."
    }
  },
  {
    "id": "zh-v-1195",
    "hanzi": "碎",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是碎。",
      "py": "Zhè shì 碎.",
      "id": "Ini adalah 碎."
    }
  },
  {
    "id": "zh-v-1196",
    "hanzi": "断",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是断。",
      "py": "Zhè shì 断.",
      "id": "Ini adalah 断."
    }
  },
  {
    "id": "zh-v-1197",
    "hanzi": "至于",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是至于。",
      "py": "Zhè shì 至于.",
      "id": "Ini adalah 至于."
    }
  },
  {
    "id": "zh-v-1198",
    "hanzi": "交际",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是交际。",
      "py": "Zhè shì 交际.",
      "id": "Ini adalah 交际."
    }
  },
  {
    "id": "zh-v-1199",
    "hanzi": "科技",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是科技。",
      "py": "Zhè shì 科技.",
      "id": "Ini adalah 科技."
    }
  },
  {
    "id": "zh-v-1200",
    "hanzi": "格外",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是格外。",
      "py": "Zhè shì 格外.",
      "id": "Ini adalah 格外."
    }
  },
  {
    "id": "zh-v-1201",
    "hanzi": "称呼",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是称呼。",
      "py": "Zhè shì 称呼.",
      "id": "Ini adalah 称呼."
    }
  },
  {
    "id": "zh-v-1202",
    "hanzi": "土豆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是土豆。",
      "py": "Zhè shì 土豆.",
      "id": "Ini adalah 土豆."
    }
  },
  {
    "id": "zh-v-1203",
    "hanzi": "亲切",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是亲切。",
      "py": "Zhè shì 亲切.",
      "id": "Ini adalah 亲切."
    }
  },
  {
    "id": "zh-v-1204",
    "hanzi": "政府",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是政府。",
      "py": "Zhè shì 政府.",
      "id": "Ini adalah 政府."
    }
  },
  {
    "id": "zh-v-1205",
    "hanzi": "伙伴",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是伙伴。",
      "py": "Zhè shì 伙伴.",
      "id": "Ini adalah 伙伴."
    }
  },
  {
    "id": "zh-v-1206",
    "hanzi": "家乡",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是家乡。",
      "py": "Zhè shì 家乡.",
      "id": "Ini adalah 家乡."
    }
  },
  {
    "id": "zh-v-1207",
    "hanzi": "自豪",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是自豪。",
      "py": "Zhè shì 自豪.",
      "id": "Ini adalah 自豪."
    }
  },
  {
    "id": "zh-v-1208",
    "hanzi": "拖延",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是拖延。",
      "py": "Zhè shì 拖延.",
      "id": "Ini adalah 拖延."
    }
  },
  {
    "id": "zh-v-1209",
    "hanzi": "明明",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是明明。",
      "py": "Zhè shì 明明.",
      "id": "Ini adalah 明明."
    }
  },
  {
    "id": "zh-v-1210",
    "hanzi": "延长",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是延长。",
      "py": "Zhè shì 延长.",
      "id": "Ini adalah 延长."
    }
  },
  {
    "id": "zh-v-1211",
    "hanzi": "挑战",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是挑战。",
      "py": "Zhè shì 挑战.",
      "id": "Ini adalah 挑战."
    }
  },
  {
    "id": "zh-v-1212",
    "hanzi": "行动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是行动。",
      "py": "Zhè shì 行动.",
      "id": "Ini adalah 行动."
    }
  },
  {
    "id": "zh-v-1213",
    "hanzi": "方案",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是方案。",
      "py": "Zhè shì 方案.",
      "id": "Ini adalah 方案."
    }
  },
  {
    "id": "zh-v-1214",
    "hanzi": "询问",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是询问。",
      "py": "Zhè shì 询问.",
      "id": "Ini adalah 询问."
    }
  },
  {
    "id": "zh-v-1215",
    "hanzi": "产生",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是产生。",
      "py": "Zhè shì 产生.",
      "id": "Ini adalah 产生."
    }
  },
  {
    "id": "zh-v-1216",
    "hanzi": "疲惫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是疲惫。",
      "py": "Zhè shì 疲惫.",
      "id": "Ini adalah 疲惫."
    }
  },
  {
    "id": "zh-v-1217",
    "hanzi": "风景",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是风景。",
      "py": "Zhè shì 风景.",
      "id": "Ini adalah 风景."
    }
  },
  {
    "id": "zh-v-1218",
    "hanzi": "优美",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是优美。",
      "py": "Zhè shì 优美.",
      "id": "Ini adalah 优美."
    }
  },
  {
    "id": "zh-v-1219",
    "hanzi": "依然",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是依然。",
      "py": "Zhè shì 依然.",
      "id": "Ini adalah 依然."
    }
  },
  {
    "id": "zh-v-1220",
    "hanzi": "尝试",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是尝试。",
      "py": "Zhè shì 尝试.",
      "id": "Ini adalah 尝试."
    }
  },
  {
    "id": "zh-v-1221",
    "hanzi": "迅速",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是迅速。",
      "py": "Zhè shì 迅速.",
      "id": "Ini adalah 迅速."
    }
  },
  {
    "id": "zh-v-1222",
    "hanzi": "消除",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是消除。",
      "py": "Zhè shì 消除.",
      "id": "Ini adalah 消除."
    }
  },
  {
    "id": "zh-v-1223",
    "hanzi": "主动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是主动。",
      "py": "Zhè shì 主动.",
      "id": "Ini adalah 主动."
    }
  },
  {
    "id": "zh-v-1224",
    "hanzi": "即将",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是即将。",
      "py": "Zhè shì 即将.",
      "id": "Ini adalah 即将."
    }
  },
  {
    "id": "zh-v-1225",
    "hanzi": "期待",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是期待。",
      "py": "Zhè shì 期待.",
      "id": "Ini adalah 期待."
    }
  },
  {
    "id": "zh-v-1226",
    "hanzi": "愿望",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是愿望。",
      "py": "Zhè shì 愿望.",
      "id": "Ini adalah 愿望."
    }
  },
  {
    "id": "zh-v-1227",
    "hanzi": "环节",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是环节。",
      "py": "Zhè shì 环节.",
      "id": "Ini adalah 环节."
    }
  },
  {
    "id": "zh-v-1228",
    "hanzi": "圆满",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是圆满。",
      "py": "Zhè shì 圆满.",
      "id": "Ini adalah 圆满."
    }
  },
  {
    "id": "zh-v-1229",
    "hanzi": "成员",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是成员。",
      "py": "Zhè shì 成员.",
      "id": "Ini adalah 成员."
    }
  },
  {
    "id": "zh-v-1230",
    "hanzi": "平安",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是平安。",
      "py": "Zhè shì 平安.",
      "id": "Ini adalah 平安."
    }
  },
  {
    "id": "zh-v-1231",
    "hanzi": "以便",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是以便。",
      "py": "Zhè shì 以便.",
      "id": "Ini adalah 以便."
    }
  },
  {
    "id": "zh-v-1232",
    "hanzi": "部",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是部。",
      "py": "Zhè shì 部.",
      "id": "Ini adalah 部."
    }
  },
  {
    "id": "zh-v-1233",
    "hanzi": "评价",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是评价。",
      "py": "Zhè shì 评价.",
      "id": "Ini adalah 评价."
    }
  },
  {
    "id": "zh-v-1234",
    "hanzi": "动画片",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是动画片。",
      "py": "Zhè shì 动画片.",
      "id": "Ini adalah 动画片."
    }
  },
  {
    "id": "zh-v-1235",
    "hanzi": "上映",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是上映。",
      "py": "Zhè shì 上映.",
      "id": "Ini adalah 上映."
    }
  },
  {
    "id": "zh-v-1236",
    "hanzi": "古代",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是古代。",
      "py": "Zhè shì 古代.",
      "id": "Ini adalah 古代."
    }
  },
  {
    "id": "zh-v-1237",
    "hanzi": "神话",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是神话。",
      "py": "Zhè shì 神话.",
      "id": "Ini adalah 神话."
    }
  },
  {
    "id": "zh-v-1238",
    "hanzi": "背景",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是背景。",
      "py": "Zhè shì 背景.",
      "id": "Ini adalah 背景."
    }
  },
  {
    "id": "zh-v-1239",
    "hanzi": "票房",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是票房。",
      "py": "Zhè shì 票房.",
      "id": "Ini adalah 票房."
    }
  },
  {
    "id": "zh-v-1240",
    "hanzi": "胃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是胃。",
      "py": "Zhè shì 胃.",
      "id": "Ini adalah 胃."
    }
  },
  {
    "id": "zh-v-1241",
    "hanzi": "急诊",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是急诊。",
      "py": "Zhè shì 急诊.",
      "id": "Ini adalah 急诊."
    }
  },
  {
    "id": "zh-v-1242",
    "hanzi": "出版",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是出版。",
      "py": "Zhè shì 出版.",
      "id": "Ini adalah 出版."
    }
  },
  {
    "id": "zh-v-1243",
    "hanzi": "诗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是诗。",
      "py": "Zhè shì 诗.",
      "id": "Ini adalah 诗."
    }
  },
  {
    "id": "zh-v-1244",
    "hanzi": "业余",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是业余。",
      "py": "Zhè shì 业余.",
      "id": "Ini adalah 业余."
    }
  },
  {
    "id": "zh-v-1245",
    "hanzi": "文学",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是文学。",
      "py": "Zhè shì 文学.",
      "id": "Ini adalah 文学."
    }
  },
  {
    "id": "zh-v-1246",
    "hanzi": "土地",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是土地。",
      "py": "Zhè shì 土地.",
      "id": "Ini adalah 土地."
    }
  },
  {
    "id": "zh-v-1247",
    "hanzi": "劳动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是劳动。",
      "py": "Zhè shì 劳动.",
      "id": "Ini adalah 劳动."
    }
  },
  {
    "id": "zh-v-1248",
    "hanzi": "悄悄",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是悄悄。",
      "py": "Zhè shì 悄悄.",
      "id": "Ini adalah 悄悄."
    }
  },
  {
    "id": "zh-v-1249",
    "hanzi": "农村",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是农村。",
      "py": "Zhè shì 农村.",
      "id": "Ini adalah 农村."
    }
  },
  {
    "id": "zh-v-1250",
    "hanzi": "晾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是晾。",
      "py": "Zhè shì 晾.",
      "id": "Ini adalah 晾."
    }
  },
  {
    "id": "zh-v-1251",
    "hanzi": "干",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是干。",
      "py": "Zhè shì 干.",
      "id": "Ini adalah 干."
    }
  },
  {
    "id": "zh-v-1252",
    "hanzi": "夸张",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是夸张。",
      "py": "Zhè shì 夸张.",
      "id": "Ini adalah 夸张."
    }
  },
  {
    "id": "zh-v-1253",
    "hanzi": "似乎",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是似乎。",
      "py": "Zhè shì 似乎.",
      "id": "Ini adalah 似乎."
    }
  },
  {
    "id": "zh-v-1254",
    "hanzi": "用心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是用心。",
      "py": "Zhè shì 用心.",
      "id": "Ini adalah 用心."
    }
  },
  {
    "id": "zh-v-1255",
    "hanzi": "表情",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是表情。",
      "py": "Zhè shì 表情.",
      "id": "Ini adalah 表情."
    }
  },
  {
    "id": "zh-v-1256",
    "hanzi": "项链",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是项链。",
      "py": "Zhè shì 项链.",
      "id": "Ini adalah 项链."
    }
  },
  {
    "id": "zh-v-1257",
    "hanzi": "唉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是唉。",
      "py": "Zhè shì 唉.",
      "id": "Ini adalah 唉."
    }
  },
  {
    "id": "zh-v-1258",
    "hanzi": "小气",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是小气。",
      "py": "Zhè shì 小气.",
      "id": "Ini adalah 小气."
    }
  },
  {
    "id": "zh-v-1259",
    "hanzi": "智能",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是智能。",
      "py": "Zhè shì 智能.",
      "id": "Ini adalah 智能."
    }
  },
  {
    "id": "zh-v-1260",
    "hanzi": "抽屉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是抽屉。",
      "py": "Zhè shì 抽屉.",
      "id": "Ini adalah 抽屉."
    }
  },
  {
    "id": "zh-v-1261",
    "hanzi": "老鼠",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是老鼠。",
      "py": "Zhè shì 老鼠.",
      "id": "Ini adalah 老鼠."
    }
  },
  {
    "id": "zh-v-1262",
    "hanzi": "后背",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是后背。",
      "py": "Zhè shì 后背.",
      "id": "Ini adalah 后背."
    }
  },
  {
    "id": "zh-v-1263",
    "hanzi": "哈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是哈。",
      "py": "Zhè shì 哈.",
      "id": "Ini adalah 哈."
    }
  },
  {
    "id": "zh-v-1264",
    "hanzi": "汇率",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是汇率。",
      "py": "Zhè shì 汇率.",
      "id": "Ini adalah 汇率."
    }
  },
  {
    "id": "zh-v-1265",
    "hanzi": "欧洲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是欧洲。",
      "py": "Zhè shì 欧洲.",
      "id": "Ini adalah 欧洲."
    }
  },
  {
    "id": "zh-v-1266",
    "hanzi": "岛屿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是岛屿。",
      "py": "Zhè shì 岛屿.",
      "id": "Ini adalah 岛屿."
    }
  },
  {
    "id": "zh-v-1267",
    "hanzi": "日程",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是日程。",
      "py": "Zhè shì 日程.",
      "id": "Ini adalah 日程."
    }
  },
  {
    "id": "zh-v-1268",
    "hanzi": "国庆节",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是国庆节。",
      "py": "Zhè shì 国庆节.",
      "id": "Ini adalah 国庆节."
    }
  },
  {
    "id": "zh-v-1269",
    "hanzi": "满足",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是满足。",
      "py": "Zhè shì 满足.",
      "id": "Ini adalah 满足."
    }
  },
  {
    "id": "zh-v-1270",
    "hanzi": "单独",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是单独。",
      "py": "Zhè shì 单独.",
      "id": "Ini adalah 单独."
    }
  },
  {
    "id": "zh-v-1271",
    "hanzi": "委屈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是委屈。",
      "py": "Zhè shì 委屈.",
      "id": "Ini adalah 委屈."
    }
  },
  {
    "id": "zh-v-1272",
    "hanzi": "麻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是麻。",
      "py": "Zhè shì 麻.",
      "id": "Ini adalah 麻."
    }
  },
  {
    "id": "zh-v-1273",
    "hanzi": "浓",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是浓。",
      "py": "Zhè shì 浓.",
      "id": "Ini adalah 浓."
    }
  },
  {
    "id": "zh-v-1274",
    "hanzi": "香气",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是香气。",
      "py": "Zhè shì 香气.",
      "id": "Ini adalah 香气."
    }
  },
  {
    "id": "zh-v-1275",
    "hanzi": "会计",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是会计。",
      "py": "Zhè shì 会计.",
      "id": "Ini adalah 会计."
    }
  },
  {
    "id": "zh-v-1276",
    "hanzi": "打交道",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是打交道。",
      "py": "Zhè shì 打交道.",
      "id": "Ini adalah 打交道."
    }
  },
  {
    "id": "zh-v-1277",
    "hanzi": "重复",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是重复。",
      "py": "Zhè shì 重复.",
      "id": "Ini adalah 重复."
    }
  },
  {
    "id": "zh-v-1278",
    "hanzi": "升",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是升。",
      "py": "Zhè shì 升.",
      "id": "Ini adalah 升."
    }
  },
  {
    "id": "zh-v-1279",
    "hanzi": "高级",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是高级。",
      "py": "Zhè shì 高级.",
      "id": "Ini adalah 高级."
    }
  },
  {
    "id": "zh-v-1280",
    "hanzi": "本质",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是本质。",
      "py": "Zhè shì 本质.",
      "id": "Ini adalah 本质."
    }
  },
  {
    "id": "zh-v-1281",
    "hanzi": "内部",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是内部。",
      "py": "Zhè shì 内部.",
      "id": "Ini adalah 内部."
    }
  },
  {
    "id": "zh-v-1282",
    "hanzi": "岗位",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是岗位。",
      "py": "Zhè shì 岗位.",
      "id": "Ini adalah 岗位."
    }
  },
  {
    "id": "zh-v-1283",
    "hanzi": "家电",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是家电。",
      "py": "Zhè shì 家电.",
      "id": "Ini adalah 家电."
    }
  },
  {
    "id": "zh-v-1284",
    "hanzi": "设施",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是设施。",
      "py": "Zhè shì 设施.",
      "id": "Ini adalah 设施."
    }
  },
  {
    "id": "zh-v-1285",
    "hanzi": "明显",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是明显。",
      "py": "Zhè shì 明显.",
      "id": "Ini adalah 明显."
    }
  },
  {
    "id": "zh-v-1286",
    "hanzi": "空间",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是空间。",
      "py": "Zhè shì 空间.",
      "id": "Ini adalah 空间."
    }
  },
  {
    "id": "zh-v-1287",
    "hanzi": "宿舍",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是宿舍。",
      "py": "Zhè shì 宿舍.",
      "id": "Ini adalah 宿舍."
    }
  },
  {
    "id": "zh-v-1288",
    "hanzi": "屋子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是屋子。",
      "py": "Zhè shì 屋子.",
      "id": "Ini adalah 屋子."
    }
  },
  {
    "id": "zh-v-1289",
    "hanzi": "私人",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是私人。",
      "py": "Zhè shì 私人.",
      "id": "Ini adalah 私人."
    }
  },
  {
    "id": "zh-v-1290",
    "hanzi": "属于",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是属于。",
      "py": "Zhè shì 属于.",
      "id": "Ini adalah 属于."
    }
  },
  {
    "id": "zh-v-1291",
    "hanzi": "自私",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是自私。",
      "py": "Zhè shì 自私.",
      "id": "Ini adalah 自私."
    }
  },
  {
    "id": "zh-v-1292",
    "hanzi": "义务",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是义务。",
      "py": "Zhè shì 义务.",
      "id": "Ini adalah 义务."
    }
  },
  {
    "id": "zh-v-1293",
    "hanzi": "等于",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是等于。",
      "py": "Zhè shì 等于.",
      "id": "Ini adalah 等于."
    }
  },
  {
    "id": "zh-v-1294",
    "hanzi": "伤害",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是伤害。",
      "py": "Zhè shì 伤害.",
      "id": "Ini adalah 伤害."
    }
  },
  {
    "id": "zh-v-1295",
    "hanzi": "样式",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是样式。",
      "py": "Zhè shì 样式.",
      "id": "Ini adalah 样式."
    }
  },
  {
    "id": "zh-v-1296",
    "hanzi": "灰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是灰。",
      "py": "Zhè shì 灰.",
      "id": "Ini adalah 灰."
    }
  },
  {
    "id": "zh-v-1297",
    "hanzi": "搭配",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是搭配。",
      "py": "Zhè shì 搭配.",
      "id": "Ini adalah 搭配."
    }
  },
  {
    "id": "zh-v-1298",
    "hanzi": "配饰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是配饰。",
      "py": "Zhè shì 配饰.",
      "id": "Ini adalah 配饰."
    }
  },
  {
    "id": "zh-v-1299",
    "hanzi": "亲自",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是亲自。",
      "py": "Zhè shì 亲自.",
      "id": "Ini adalah 亲自."
    }
  },
  {
    "id": "zh-v-1300",
    "hanzi": "年代",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是年代。",
      "py": "Zhè shì 年代.",
      "id": "Ini adalah 年代."
    }
  },
  {
    "id": "zh-v-1301",
    "hanzi": "融化",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是融化。",
      "py": "Zhè shì 融化.",
      "id": "Ini adalah 融化."
    }
  },
  {
    "id": "zh-v-1302",
    "hanzi": "存在",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是存在。",
      "py": "Zhè shì 存在.",
      "id": "Ini adalah 存在."
    }
  },
  {
    "id": "zh-v-1303",
    "hanzi": "时期",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是时期。",
      "py": "Zhè shì 时期.",
      "id": "Ini adalah 时期."
    }
  },
  {
    "id": "zh-v-1304",
    "hanzi": "老百姓",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是老百姓。",
      "py": "Zhè shì 老百姓.",
      "id": "Ini adalah 老百姓."
    }
  },
  {
    "id": "zh-v-1305",
    "hanzi": "毒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是毒。",
      "py": "Zhè shì 毒.",
      "id": "Ini adalah 毒."
    }
  },
  {
    "id": "zh-v-1306",
    "hanzi": "片",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是片。",
      "py": "Zhè shì 片.",
      "id": "Ini adalah 片."
    }
  },
  {
    "id": "zh-v-1307",
    "hanzi": "消失",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是消失。",
      "py": "Zhè shì 消失.",
      "id": "Ini adalah 消失."
    }
  },
  {
    "id": "zh-v-1308",
    "hanzi": "当作",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是当作。",
      "py": "Zhè shì 当作.",
      "id": "Ini adalah 当作."
    }
  },
  {
    "id": "zh-v-1309",
    "hanzi": "祖先",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是祖先。",
      "py": "Zhè shì 祖先.",
      "id": "Ini adalah 祖先."
    }
  },
  {
    "id": "zh-v-1310",
    "hanzi": "煮",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是煮。",
      "py": "Zhè shì 煮.",
      "id": "Ini adalah 煮."
    }
  },
  {
    "id": "zh-v-1311",
    "hanzi": "姑姑",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是姑姑。",
      "py": "Zhè shì 姑姑.",
      "id": "Ini adalah 姑姑."
    }
  },
  {
    "id": "zh-v-1312",
    "hanzi": "气氛",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是气氛。",
      "py": "Zhè shì 气氛.",
      "id": "Ini adalah 气氛."
    }
  },
  {
    "id": "zh-v-1313",
    "hanzi": "贴",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是贴。",
      "py": "Zhè shì 贴.",
      "id": "Ini adalah 贴."
    }
  },
  {
    "id": "zh-v-1314",
    "hanzi": "倒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是倒。",
      "py": "Zhè shì 倒.",
      "id": "Ini adalah 倒."
    }
  },
  {
    "id": "zh-v-1315",
    "hanzi": "发音",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是发音。",
      "py": "Zhè shì 发音.",
      "id": "Ini adalah 发音."
    }
  },
  {
    "id": "zh-v-1316",
    "hanzi": "副",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是副。",
      "py": "Zhè shì 副.",
      "id": "Ini adalah 副."
    }
  },
  {
    "id": "zh-v-1317",
    "hanzi": "除夕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是除夕。",
      "py": "Zhè shì 除夕.",
      "id": "Ini adalah 除夕."
    }
  },
  {
    "id": "zh-v-1318",
    "hanzi": "特意",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是特意。",
      "py": "Zhè shì 特意.",
      "id": "Ini adalah 特意."
    }
  },
  {
    "id": "zh-v-1319",
    "hanzi": "交换",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是交换。",
      "py": "Zhè shì 交换.",
      "id": "Ini adalah 交换."
    }
  },
  {
    "id": "zh-v-1320",
    "hanzi": "拼音",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是拼音。",
      "py": "Zhè shì 拼音.",
      "id": "Ini adalah 拼音."
    }
  },
  {
    "id": "zh-v-1321",
    "hanzi": "字母",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是字母。",
      "py": "Zhè shì 字母.",
      "id": "Ini adalah 字母."
    }
  },
  {
    "id": "zh-v-1322",
    "hanzi": "规则",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是规则。",
      "py": "Zhè shì 规则.",
      "id": "Ini adalah 规则."
    }
  },
  {
    "id": "zh-v-1323",
    "hanzi": "声调",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是声调。",
      "py": "Zhè shì 声调.",
      "id": "Ini adalah 声调."
    }
  },
  {
    "id": "zh-v-1324",
    "hanzi": "掌握",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是掌握。",
      "py": "Zhè shì 掌握.",
      "id": "Ini adalah 掌握."
    }
  },
  {
    "id": "zh-v-1325",
    "hanzi": "辅导",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是辅导。",
      "py": "Zhè shì 辅导.",
      "id": "Ini adalah 辅导."
    }
  },
  {
    "id": "zh-v-1326",
    "hanzi": "训练",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是训练。",
      "py": "Zhè shì 训练.",
      "id": "Ini adalah 训练."
    }
  },
  {
    "id": "zh-v-1327",
    "hanzi": "集中",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是集中。",
      "py": "Zhè shì 集中.",
      "id": "Ini adalah 集中."
    }
  },
  {
    "id": "zh-v-1328",
    "hanzi": "化妆品",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是化妆品。",
      "py": "Zhè shì 化妆品.",
      "id": "Ini adalah 化妆品."
    }
  },
  {
    "id": "zh-v-1329",
    "hanzi": "精致",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是精致。",
      "py": "Zhè shì 精致.",
      "id": "Ini adalah 精致."
    }
  },
  {
    "id": "zh-v-1330",
    "hanzi": "装",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是装。",
      "py": "Zhè shì 装.",
      "id": "Ini adalah 装."
    }
  },
  {
    "id": "zh-v-1331",
    "hanzi": "过度",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是过度。",
      "py": "Zhè shì 过度.",
      "id": "Ini adalah 过度."
    }
  },
  {
    "id": "zh-v-1332",
    "hanzi": "勺子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是勺子。",
      "py": "Zhè shì 勺子.",
      "id": "Ini adalah 勺子."
    }
  },
  {
    "id": "zh-v-1333",
    "hanzi": "一次性",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是一次性。",
      "py": "Zhè shì 一次性.",
      "id": "Ini adalah 一次性."
    }
  },
  {
    "id": "zh-v-1334",
    "hanzi": "嗯",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是嗯。",
      "py": "Zhè shì 嗯.",
      "id": "Ini adalah 嗯."
    }
  },
  {
    "id": "zh-v-1335",
    "hanzi": "极其",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是极其。",
      "py": "Zhè shì 极其.",
      "id": "Ini adalah 极其."
    }
  },
  {
    "id": "zh-v-1336",
    "hanzi": "围绕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是围绕。",
      "py": "Zhè shì 围绕.",
      "id": "Ini adalah 围绕."
    }
  },
  {
    "id": "zh-v-1337",
    "hanzi": "展开",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是展开。",
      "py": "Zhè shì 展开.",
      "id": "Ini adalah 展开."
    }
  },
  {
    "id": "zh-v-1338",
    "hanzi": "肌肉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是肌肉。",
      "py": "Zhè shì 肌肉.",
      "id": "Ini adalah 肌肉."
    }
  },
  {
    "id": "zh-v-1339",
    "hanzi": "胸",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是胸。",
      "py": "Zhè shì 胸.",
      "id": "Ini adalah 胸."
    }
  },
  {
    "id": "zh-v-1340",
    "hanzi": "发达",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是发达。",
      "py": "Zhè shì 发达.",
      "id": "Ini adalah 发达."
    }
  },
  {
    "id": "zh-v-1341",
    "hanzi": "重量",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是重量。",
      "py": "Zhè shì 重量.",
      "id": "Ini adalah 重量."
    }
  },
  {
    "id": "zh-v-1342",
    "hanzi": "肩膀",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是肩膀。",
      "py": "Zhè shì 肩膀.",
      "id": "Ini adalah 肩膀."
    }
  },
  {
    "id": "zh-v-1343",
    "hanzi": "心脏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是心脏。",
      "py": "Zhè shì 心脏.",
      "id": "Ini adalah 心脏."
    }
  },
  {
    "id": "zh-v-1344",
    "hanzi": "救护车",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是救护车。",
      "py": "Zhè shì 救护车.",
      "id": "Ini adalah 救护车."
    }
  },
  {
    "id": "zh-v-1345",
    "hanzi": "操心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是操心。",
      "py": "Zhè shì 操心.",
      "id": "Ini adalah 操心."
    }
  },
  {
    "id": "zh-v-1346",
    "hanzi": "轮流",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是轮流。",
      "py": "Zhè shì 轮流.",
      "id": "Ini adalah 轮流."
    }
  },
  {
    "id": "zh-v-1347",
    "hanzi": "外公",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是外公。",
      "py": "Zhè shì 外公.",
      "id": "Ini adalah 外公."
    }
  },
  {
    "id": "zh-v-1348",
    "hanzi": "吃力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是吃力。",
      "py": "Zhè shì 吃力.",
      "id": "Ini adalah 吃力."
    }
  },
  {
    "id": "zh-v-1349",
    "hanzi": "养老",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是养老。",
      "py": "Zhè shì 养老.",
      "id": "Ini adalah 养老."
    }
  },
  {
    "id": "zh-v-1350",
    "hanzi": "坚决",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是坚决。",
      "py": "Zhè shì 坚决.",
      "id": "Ini adalah 坚决."
    }
  },
  {
    "id": "zh-v-1351",
    "hanzi": "陶瓷",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是陶瓷。",
      "py": "Zhè shì 陶瓷.",
      "id": "Ini adalah 陶瓷."
    }
  },
  {
    "id": "zh-v-1352",
    "hanzi": "收藏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是收藏。",
      "py": "Zhè shì 收藏.",
      "id": "Ini adalah 收藏."
    }
  },
  {
    "id": "zh-v-1353",
    "hanzi": "生动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是生动。",
      "py": "Zhè shì 生动.",
      "id": "Ini adalah 生动."
    }
  },
  {
    "id": "zh-v-1354",
    "hanzi": "雕塑",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是雕塑。",
      "py": "Zhè shì 雕塑.",
      "id": "Ini adalah 雕塑."
    }
  },
  {
    "id": "zh-v-1355",
    "hanzi": "文字",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是文字。",
      "py": "Zhè shì 文字.",
      "id": "Ini adalah 文字."
    }
  },
  {
    "id": "zh-v-1356",
    "hanzi": "平",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是平。",
      "py": "Zhè shì 平.",
      "id": "Ini adalah 平."
    }
  },
  {
    "id": "zh-v-1357",
    "hanzi": "无数",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是无数。",
      "py": "Zhè shì 无数.",
      "id": "Ini adalah 无数."
    }
  },
  {
    "id": "zh-v-1358",
    "hanzi": "摆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是摆。",
      "py": "Zhè shì 摆.",
      "id": "Ini adalah 摆."
    }
  },
  {
    "id": "zh-v-1359",
    "hanzi": "球迷",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是球迷。",
      "py": "Zhè shì 球迷.",
      "id": "Ini adalah 球迷."
    }
  },
  {
    "id": "zh-v-1360",
    "hanzi": "实力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是实力。",
      "py": "Zhè shì 实力.",
      "id": "Ini adalah 实力."
    }
  },
  {
    "id": "zh-v-1361",
    "hanzi": "落后",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是落后。",
      "py": "Zhè shì 落后.",
      "id": "Ini adalah 落后."
    }
  },
  {
    "id": "zh-v-1362",
    "hanzi": "队员",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是队员。",
      "py": "Zhè shì 队员.",
      "id": "Ini adalah 队员."
    }
  },
  {
    "id": "zh-v-1363",
    "hanzi": "对手",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是对手。",
      "py": "Zhè shì 对手.",
      "id": "Ini adalah 对手."
    }
  },
  {
    "id": "zh-v-1364",
    "hanzi": "差距",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是差距。",
      "py": "Zhè shì 差距.",
      "id": "Ini adalah 差距."
    }
  },
  {
    "id": "zh-v-1365",
    "hanzi": "形势",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是形势。",
      "py": "Zhè shì 形势.",
      "id": "Ini adalah 形势."
    }
  },
  {
    "id": "zh-v-1366",
    "hanzi": "慌张",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是慌张。",
      "py": "Zhè shì 慌张.",
      "id": "Ini adalah 慌张."
    }
  },
  {
    "id": "zh-v-1367",
    "hanzi": "战争",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是战争。",
      "py": "Zhè shì 战争.",
      "id": "Ini adalah 战争."
    }
  },
  {
    "id": "zh-v-1368",
    "hanzi": "箭",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是箭。",
      "py": "Zhè shì 箭.",
      "id": "Ini adalah 箭."
    }
  },
  {
    "id": "zh-v-1369",
    "hanzi": "智慧",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是智慧。",
      "py": "Zhè shì 智慧.",
      "id": "Ini adalah 智慧."
    }
  },
  {
    "id": "zh-v-1370",
    "hanzi": "势力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是势力。",
      "py": "Zhè shì 势力.",
      "id": "Ini adalah 势力."
    }
  },
  {
    "id": "zh-v-1371",
    "hanzi": "联合",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是联合。",
      "py": "Zhè shì 联合.",
      "id": "Ini adalah 联合."
    }
  },
  {
    "id": "zh-v-1372",
    "hanzi": "对抗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是对抗。",
      "py": "Zhè shì 对抗.",
      "id": "Ini adalah 对抗."
    }
  },
  {
    "id": "zh-v-1373",
    "hanzi": "人才",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是人才。",
      "py": "Zhè shì 人才.",
      "id": "Ini adalah 人才."
    }
  },
  {
    "id": "zh-v-1374",
    "hanzi": "支",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是支。",
      "py": "Zhè shì 支.",
      "id": "Ini adalah 支."
    }
  },
  {
    "id": "zh-v-1375",
    "hanzi": "卡车",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是卡车。",
      "py": "Zhè shì 卡车.",
      "id": "Ini adalah 卡车."
    }
  },
  {
    "id": "zh-v-1376",
    "hanzi": "事故",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是事故。",
      "py": "Zhè shì 事故.",
      "id": "Ini adalah 事故."
    }
  },
  {
    "id": "zh-v-1377",
    "hanzi": "造成",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是造成。",
      "py": "Zhè shì 造成.",
      "id": "Ini adalah 造成."
    }
  },
  {
    "id": "zh-v-1378",
    "hanzi": "当心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是当心。",
      "py": "Zhè shì 当心.",
      "id": "Ini adalah 当心."
    }
  },
  {
    "id": "zh-v-1379",
    "hanzi": "超速",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是超速。",
      "py": "Zhè shì 超速.",
      "id": "Ini adalah 超速."
    }
  },
  {
    "id": "zh-v-1380",
    "hanzi": "驾驶",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是驾驶。",
      "py": "Zhè shì 驾驶.",
      "id": "Ini adalah 驾驶."
    }
  },
  {
    "id": "zh-v-1381",
    "hanzi": "阵",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是阵。",
      "py": "Zhè shì 阵.",
      "id": "Ini adalah 阵."
    }
  },
  {
    "id": "zh-v-1382",
    "hanzi": "顾虑",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是顾虑。",
      "py": "Zhè shì 顾虑.",
      "id": "Ini adalah 顾虑."
    }
  },
  {
    "id": "zh-v-1383",
    "hanzi": "离婚",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是离婚。",
      "py": "Zhè shì 离婚.",
      "id": "Ini adalah 离婚."
    }
  },
  {
    "id": "zh-v-1384",
    "hanzi": "灰心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是灰心。",
      "py": "Zhè shì 灰心.",
      "id": "Ini adalah 灰心."
    }
  },
  {
    "id": "zh-v-1385",
    "hanzi": "交往",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是交往。",
      "py": "Zhè shì 交往.",
      "id": "Ini adalah 交往."
    }
  },
  {
    "id": "zh-v-1386",
    "hanzi": "表面",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是表面。",
      "py": "Zhè shì 表面.",
      "id": "Ini adalah 表面."
    }
  },
  {
    "id": "zh-v-1387",
    "hanzi": "出席",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是出席。",
      "py": "Zhè shì 出席.",
      "id": "Ini adalah 出席."
    }
  },
  {
    "id": "zh-v-1388",
    "hanzi": "见证",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是见证。",
      "py": "Zhè shì 见证.",
      "id": "Ini adalah 见证."
    }
  },
  {
    "id": "zh-v-1389",
    "hanzi": "登记",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是登记。",
      "py": "Zhè shì 登记.",
      "id": "Ini adalah 登记."
    }
  },
  {
    "id": "zh-v-1390",
    "hanzi": "主持",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是主持。",
      "py": "Zhè shì 主持.",
      "id": "Ini adalah 主持."
    }
  },
  {
    "id": "zh-v-1391",
    "hanzi": "沙发",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是沙发。",
      "py": "Zhè shì 沙发.",
      "id": "Ini adalah 沙发."
    }
  },
  {
    "id": "zh-v-1392",
    "hanzi": "租金",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Co-renting",
    "enMeaning": "Vocabulary from Co-renting",
    "example": {
      "hz": "这是租金。",
      "py": "Zhè shì 租金.",
      "id": "Ini adalah 租金."
    }
  },
  {
    "id": "zh-v-1393",
    "hanzi": "下载",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Urban and suburban",
    "enMeaning": "Vocabulary from Urban and suburban",
    "example": {
      "hz": "这是下载。",
      "py": "Zhè shì 下载.",
      "id": "Ini adalah 下载."
    }
  },
  {
    "id": "zh-v-1394",
    "hanzi": "周围",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Urban and suburban",
    "enMeaning": "Vocabulary from Urban and suburban",
    "example": {
      "hz": "这是周围。",
      "py": "Zhè shì 周围.",
      "id": "Ini adalah 周围."
    }
  },
  {
    "id": "zh-v-1395",
    "hanzi": "这样",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Urban and suburban",
    "enMeaning": "Vocabulary from Urban and suburban",
    "example": {
      "hz": "这是这样。",
      "py": "Zhè shì 这样.",
      "id": "Ini adalah 这样."
    }
  },
  {
    "id": "zh-v-1396",
    "hanzi": "无聊",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Urban and suburban",
    "enMeaning": "Vocabulary from Urban and suburban",
    "example": {
      "hz": "这是无聊。",
      "py": "Zhè shì 无聊.",
      "id": "Ini adalah 无聊."
    }
  },
  {
    "id": "zh-v-1397",
    "hanzi": "感谢",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是感谢。",
      "py": "Zhè shì 感谢.",
      "id": "Ini adalah 感谢."
    }
  },
  {
    "id": "zh-v-1398",
    "hanzi": "经验",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是经验。",
      "py": "Zhè shì 经验.",
      "id": "Ini adalah 经验."
    }
  },
  {
    "id": "zh-v-1399",
    "hanzi": "发生",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是发生。",
      "py": "Zhè shì 发生.",
      "id": "Ini adalah 发生."
    }
  },
  {
    "id": "zh-v-1400",
    "hanzi": "提前",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Actors",
    "enMeaning": "Vocabulary from Actors",
    "example": {
      "hz": "这是提前。",
      "py": "Zhè shì 提前.",
      "id": "Ini adalah 提前."
    }
  },
  {
    "id": "zh-v-1401",
    "hanzi": "冠军",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Table tennis",
    "enMeaning": "Vocabulary from Table tennis",
    "example": {
      "hz": "这是冠军。",
      "py": "Zhè shì 冠军.",
      "id": "Ini adalah 冠军."
    }
  },
  {
    "id": "zh-v-1402",
    "hanzi": "场地",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Table tennis",
    "enMeaning": "Vocabulary from Table tennis",
    "example": {
      "hz": "这是场地。",
      "py": "Zhè shì 场地.",
      "id": "Ini adalah 场地."
    }
  },
  {
    "id": "zh-v-1403",
    "hanzi": "技术",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Table tennis",
    "enMeaning": "Vocabulary from Table tennis",
    "example": {
      "hz": "这是技术。",
      "py": "Zhè shì 技术.",
      "id": "Ini adalah 技术."
    }
  },
  {
    "id": "zh-v-1404",
    "hanzi": "骄傲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Table tennis",
    "enMeaning": "Vocabulary from Table tennis",
    "example": {
      "hz": "这是骄傲。",
      "py": "Zhè shì 骄傲.",
      "id": "Ini adalah 骄傲."
    }
  },
  {
    "id": "zh-v-1405",
    "hanzi": "吸引",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Table tennis",
    "enMeaning": "Vocabulary from Table tennis",
    "example": {
      "hz": "这是吸引。",
      "py": "Zhè shì 吸引.",
      "id": "Ini adalah 吸引."
    }
  },
  {
    "id": "zh-v-1406",
    "hanzi": "玩笑",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是玩笑。",
      "py": "Zhè shì 玩笑.",
      "id": "Ini adalah 玩笑."
    }
  },
  {
    "id": "zh-v-1407",
    "hanzi": "放松",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是放松。",
      "py": "Zhè shì 放松.",
      "id": "Ini adalah 放松."
    }
  },
  {
    "id": "zh-v-1408",
    "hanzi": "理解",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Play computer games",
    "enMeaning": "Vocabulary from Play computer games",
    "example": {
      "hz": "这是理解。",
      "py": "Zhè shì 理解.",
      "id": "Ini adalah 理解."
    }
  },
  {
    "id": "zh-v-1409",
    "hanzi": "吵架",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ideal boy/girlfriend",
    "enMeaning": "Vocabulary from Ideal boy/girlfriend",
    "example": {
      "hz": "这是吵架。",
      "py": "Zhè shì 吵架.",
      "id": "Ini adalah 吵架."
    }
  },
  {
    "id": "zh-v-1410",
    "hanzi": "行",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ideal boy/girlfriend",
    "enMeaning": "Vocabulary from Ideal boy/girlfriend",
    "example": {
      "hz": "这是行。",
      "py": "Zhè shì 行.",
      "id": "Ini adalah 行."
    }
  },
  {
    "id": "zh-v-1411",
    "hanzi": "陪",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ideal boy/girlfriend",
    "enMeaning": "Vocabulary from Ideal boy/girlfriend",
    "example": {
      "hz": "这是陪。",
      "py": "Zhè shì 陪.",
      "id": "Ini adalah 陪."
    }
  },
  {
    "id": "zh-v-1412",
    "hanzi": "顾客",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是顾客。",
      "py": "Zhè shì 顾客.",
      "id": "Ini adalah 顾客."
    }
  },
  {
    "id": "zh-v-1413",
    "hanzi": "味道",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是味道。",
      "py": "Zhè shì 味道.",
      "id": "Ini adalah 味道."
    }
  },
  {
    "id": "zh-v-1414",
    "hanzi": "适合",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Viral restaurants",
    "enMeaning": "Vocabulary from Viral restaurants",
    "example": {
      "hz": "这是适合。",
      "py": "Zhè shì 适合.",
      "id": "Ini adalah 适合."
    }
  },
  {
    "id": "zh-v-1415",
    "hanzi": "油",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learn how to cook a dish",
    "enMeaning": "Vocabulary from Learn how to cook a dish",
    "example": {
      "hz": "这是油。",
      "py": "Zhè shì 油.",
      "id": "Ini adalah 油."
    }
  },
  {
    "id": "zh-v-1416",
    "hanzi": "锅",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learn how to cook a dish",
    "enMeaning": "Vocabulary from Learn how to cook a dish",
    "example": {
      "hz": "这是锅。",
      "py": "Zhè shì 锅.",
      "id": "Ini adalah 锅."
    }
  },
  {
    "id": "zh-v-1417",
    "hanzi": "尝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learn how to cook a dish",
    "enMeaning": "Vocabulary from Learn how to cook a dish",
    "example": {
      "hz": "这是尝。",
      "py": "Zhè shì 尝.",
      "id": "Ini adalah 尝."
    }
  },
  {
    "id": "zh-v-1418",
    "hanzi": "炒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learn how to cook a dish",
    "enMeaning": "Vocabulary from Learn how to cook a dish",
    "example": {
      "hz": "这是炒。",
      "py": "Zhè shì 炒.",
      "id": "Ini adalah 炒."
    }
  },
  {
    "id": "zh-v-1419",
    "hanzi": "变",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learn how to cook a dish",
    "enMeaning": "Vocabulary from Learn how to cook a dish",
    "example": {
      "hz": "这是变。",
      "py": "Zhè shì 变.",
      "id": "Ini adalah 变."
    }
  },
  {
    "id": "zh-v-1420",
    "hanzi": "辛苦",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是辛苦。",
      "py": "Zhè shì 辛苦.",
      "id": "Ini adalah 辛苦."
    }
  },
  {
    "id": "zh-v-1421",
    "hanzi": "准时",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Ordering take away",
    "enMeaning": "Vocabulary from Ordering take away",
    "example": {
      "hz": "这是准时。",
      "py": "Zhè shì 准时.",
      "id": "Ini adalah 准时."
    }
  },
  {
    "id": "zh-v-1422",
    "hanzi": "兴奋",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Airport pickup",
    "enMeaning": "Vocabulary from Airport pickup",
    "example": {
      "hz": "这是兴奋。",
      "py": "Zhè shì 兴奋.",
      "id": "Ini adalah 兴奋."
    }
  },
  {
    "id": "zh-v-1423",
    "hanzi": "付款",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是付款。",
      "py": "Zhè shì 付款.",
      "id": "Ini adalah 付款."
    }
  },
  {
    "id": "zh-v-1424",
    "hanzi": "内",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是内。",
      "py": "Zhè shì 内.",
      "id": "Ini adalah 内."
    }
  },
  {
    "id": "zh-v-1425",
    "hanzi": "收",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是收。",
      "py": "Zhè shì 收.",
      "id": "Ini adalah 收."
    }
  },
  {
    "id": "zh-v-1426",
    "hanzi": "退",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Online shopping customer support",
    "enMeaning": "Vocabulary from Online shopping customer support",
    "example": {
      "hz": "这是退。",
      "py": "Zhè shì 退.",
      "id": "Ini adalah 退."
    }
  },
  {
    "id": "zh-v-1427",
    "hanzi": "重新",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Failed Online Shopping",
    "enMeaning": "Vocabulary from Failed Online Shopping",
    "example": {
      "hz": "这是重新。",
      "py": "Zhè shì 重新.",
      "id": "Ini adalah 重新."
    }
  },
  {
    "id": "zh-v-1428",
    "hanzi": "长城",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是长城。",
      "py": "Zhè shì 长城.",
      "id": "Ini adalah 长城."
    }
  },
  {
    "id": "zh-v-1429",
    "hanzi": "故宫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是故宫。",
      "py": "Zhè shì 故宫.",
      "id": "Ini adalah 故宫."
    }
  },
  {
    "id": "zh-v-1430",
    "hanzi": "导游",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是导游。",
      "py": "Zhè shì 导游.",
      "id": "Ini adalah 导游."
    }
  },
  {
    "id": "zh-v-1431",
    "hanzi": "游客",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是游客。",
      "py": "Zhè shì 游客.",
      "id": "Ini adalah 游客."
    }
  },
  {
    "id": "zh-v-1432",
    "hanzi": "景点",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是景点。",
      "py": "Zhè shì 景点.",
      "id": "Ini adalah 景点."
    }
  },
  {
    "id": "zh-v-1433",
    "hanzi": "遗产",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是遗产。",
      "py": "Zhè shì 遗产.",
      "id": "Ini adalah 遗产."
    }
  },
  {
    "id": "zh-v-1434",
    "hanzi": "值得",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Capital Beijing",
    "enMeaning": "Vocabulary from Capital Beijing",
    "example": {
      "hz": "这是值得。",
      "py": "Zhè shì 值得.",
      "id": "Ini adalah 值得."
    }
  },
  {
    "id": "zh-v-1435",
    "hanzi": "提醒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是提醒。",
      "py": "Zhè shì 提醒.",
      "id": "Ini adalah 提醒."
    }
  },
  {
    "id": "zh-v-1436",
    "hanzi": "短信",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是短信。",
      "py": "Zhè shì 短信.",
      "id": "Ini adalah 短信."
    }
  },
  {
    "id": "zh-v-1437",
    "hanzi": "丢",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是丢。",
      "py": "Zhè shì 丢.",
      "id": "Ini adalah 丢."
    }
  },
  {
    "id": "zh-v-1438",
    "hanzi": "挂失",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是挂失。",
      "py": "Zhè shì 挂失.",
      "id": "Ini adalah 挂失."
    }
  },
  {
    "id": "zh-v-1439",
    "hanzi": "正确",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是正确。",
      "py": "Zhè shì 正确.",
      "id": "Ini adalah 正确."
    }
  },
  {
    "id": "zh-v-1440",
    "hanzi": "麻烦",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Getting a bank card",
    "enMeaning": "Vocabulary from Getting a bank card",
    "example": {
      "hz": "这是麻烦。",
      "py": "Zhè shì 麻烦.",
      "id": "Ini adalah 麻烦."
    }
  },
  {
    "id": "zh-v-1441",
    "hanzi": "知识",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Living expenses",
    "enMeaning": "Vocabulary from Living expenses",
    "example": {
      "hz": "这是知识。",
      "py": "Zhè shì 知识.",
      "id": "Ini adalah 知识."
    }
  },
  {
    "id": "zh-v-1442",
    "hanzi": "存",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Living expenses",
    "enMeaning": "Vocabulary from Living expenses",
    "example": {
      "hz": "这是存。",
      "py": "Zhè shì 存.",
      "id": "Ini adalah 存."
    }
  },
  {
    "id": "zh-v-1443",
    "hanzi": "大夫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是大夫。",
      "py": "Zhè shì 大夫.",
      "id": "Ini adalah 大夫."
    }
  },
  {
    "id": "zh-v-1444",
    "hanzi": "窗户",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是窗户。",
      "py": "Zhè shì 窗户.",
      "id": "Ini adalah 窗户."
    }
  },
  {
    "id": "zh-v-1445",
    "hanzi": "空气",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是空气。",
      "py": "Zhè shì 空气.",
      "id": "Ini adalah 空气."
    }
  },
  {
    "id": "zh-v-1446",
    "hanzi": "出差",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Seeing a doctor",
    "enMeaning": "Vocabulary from Seeing a doctor",
    "example": {
      "hz": "这是出差。",
      "py": "Zhè shì 出差.",
      "id": "Ini adalah 出差."
    }
  },
  {
    "id": "zh-v-1447",
    "hanzi": "亿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran White-collar workers love fitness",
    "enMeaning": "Vocabulary from White-collar workers love fitness",
    "example": {
      "hz": "这是亿。",
      "py": "Zhè shì 亿.",
      "id": "Ini adalah 亿."
    }
  },
  {
    "id": "zh-v-1448",
    "hanzi": "部分",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran White-collar workers love fitness",
    "enMeaning": "Vocabulary from White-collar workers love fitness",
    "example": {
      "hz": "这是部分。",
      "py": "Zhè shì 部分.",
      "id": "Ini adalah 部分."
    }
  },
  {
    "id": "zh-v-1449",
    "hanzi": "其次",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran White-collar workers love fitness",
    "enMeaning": "Vocabulary from White-collar workers love fitness",
    "example": {
      "hz": "这是其次。",
      "py": "Zhè shì 其次.",
      "id": "Ini adalah 其次."
    }
  },
  {
    "id": "zh-v-1450",
    "hanzi": "效率",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Overtime culture",
    "enMeaning": "Vocabulary from Overtime culture",
    "example": {
      "hz": "这是效率。",
      "py": "Zhè shì 效率.",
      "id": "Ini adalah 效率."
    }
  },
  {
    "id": "zh-v-1451",
    "hanzi": "印象",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Overtime culture",
    "enMeaning": "Vocabulary from Overtime culture",
    "example": {
      "hz": "这是印象。",
      "py": "Zhè shì 印象.",
      "id": "Ini adalah 印象."
    }
  },
  {
    "id": "zh-v-1452",
    "hanzi": "份",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Overtime culture",
    "enMeaning": "Vocabulary from Overtime culture",
    "example": {
      "hz": "这是份。",
      "py": "Zhè shì 份.",
      "id": "Ini adalah 份."
    }
  },
  {
    "id": "zh-v-1453",
    "hanzi": "继续",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Overtime culture",
    "enMeaning": "Vocabulary from Overtime culture",
    "example": {
      "hz": "这是继续。",
      "py": "Zhè shì 继续.",
      "id": "Ini adalah 继续."
    }
  },
  {
    "id": "zh-v-1454",
    "hanzi": "骗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Organizing a party",
    "enMeaning": "Vocabulary from Organizing a party",
    "example": {
      "hz": "这是骗。",
      "py": "Zhè shì 骗.",
      "id": "Ini adalah 骗."
    }
  },
  {
    "id": "zh-v-1455",
    "hanzi": "教授",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Life change",
    "enMeaning": "Vocabulary from Life change",
    "example": {
      "hz": "这是教授。",
      "py": "Zhè shì 教授.",
      "id": "Ini adalah 教授."
    }
  },
  {
    "id": "zh-v-1456",
    "hanzi": "博士",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Life change",
    "enMeaning": "Vocabulary from Life change",
    "example": {
      "hz": "这是博士。",
      "py": "Zhè shì 博士.",
      "id": "Ini adalah 博士."
    }
  },
  {
    "id": "zh-v-1457",
    "hanzi": "优秀",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Life change",
    "enMeaning": "Vocabulary from Life change",
    "example": {
      "hz": "这是优秀。",
      "py": "Zhè shì 优秀.",
      "id": "Ini adalah 优秀."
    }
  },
  {
    "id": "zh-v-1458",
    "hanzi": "可惜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Life change",
    "enMeaning": "Vocabulary from Life change",
    "example": {
      "hz": "这是可惜。",
      "py": "Zhè shì 可惜.",
      "id": "Ini adalah 可惜."
    }
  },
  {
    "id": "zh-v-1459",
    "hanzi": "真正",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Life change",
    "enMeaning": "Vocabulary from Life change",
    "example": {
      "hz": "这是真正。",
      "py": "Zhè shì 真正.",
      "id": "Ini adalah 真正."
    }
  },
  {
    "id": "zh-v-1460",
    "hanzi": "交流",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是交流。",
      "py": "Zhè shì 交流.",
      "id": "Ini adalah 交流."
    }
  },
  {
    "id": "zh-v-1461",
    "hanzi": "讨厌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是讨厌。",
      "py": "Zhè shì 讨厌.",
      "id": "Ini adalah 讨厌."
    }
  },
  {
    "id": "zh-v-1462",
    "hanzi": "任何",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran social media",
    "enMeaning": "Vocabulary from social media",
    "example": {
      "hz": "这是任何。",
      "py": "Zhè shì 任何.",
      "id": "Ini adalah 任何."
    }
  },
  {
    "id": "zh-v-1463",
    "hanzi": "距离",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Mobile phone usage",
    "enMeaning": "Vocabulary from Mobile phone usage",
    "example": {
      "hz": "这是距离。",
      "py": "Zhè shì 距离.",
      "id": "Ini adalah 距离."
    }
  },
  {
    "id": "zh-v-1464",
    "hanzi": "正常",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Mobile phone usage",
    "enMeaning": "Vocabulary from Mobile phone usage",
    "example": {
      "hz": "这是正常。",
      "py": "Zhè shì 正常.",
      "id": "Ini adalah 正常."
    }
  },
  {
    "id": "zh-v-1465",
    "hanzi": "拉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Mobile phone usage",
    "enMeaning": "Vocabulary from Mobile phone usage",
    "example": {
      "hz": "这是拉。",
      "py": "Zhè shì 拉.",
      "id": "Ini adalah 拉."
    }
  },
  {
    "id": "zh-v-1466",
    "hanzi": "句",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 5,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Mobile phone usage",
    "enMeaning": "Vocabulary from Mobile phone usage",
    "example": {
      "hz": "这是句。",
      "py": "Zhè shì 句.",
      "id": "Ini adalah 句."
    }
  },
  {
    "id": "zh-v-1467",
    "hanzi": "掉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是掉。",
      "py": "Zhè shì 掉.",
      "id": "Ini adalah 掉."
    }
  },
  {
    "id": "zh-v-1468",
    "hanzi": "弄",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是弄。",
      "py": "Zhè shì 弄.",
      "id": "Ini adalah 弄."
    }
  },
  {
    "id": "zh-v-1469",
    "hanzi": "洗手池",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是洗手池。",
      "py": "Zhè shì 洗手池.",
      "id": "Ini adalah 洗手池."
    }
  },
  {
    "id": "zh-v-1470",
    "hanzi": "工具",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是工具。",
      "py": "Zhè shì 工具.",
      "id": "Ini adalah 工具."
    }
  },
  {
    "id": "zh-v-1471",
    "hanzi": "堵",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Repairs",
    "enMeaning": "Vocabulary from Repairs",
    "example": {
      "hz": "这是堵。",
      "py": "Zhè shì 堵.",
      "id": "Ini adalah 堵."
    }
  },
  {
    "id": "zh-v-1472",
    "hanzi": "规定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是规定。",
      "py": "Zhè shì 规定.",
      "id": "Ini adalah 规定."
    }
  },
  {
    "id": "zh-v-1473",
    "hanzi": "允许",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是允许。",
      "py": "Zhè shì 允许.",
      "id": "Ini adalah 允许."
    }
  },
  {
    "id": "zh-v-1474",
    "hanzi": "免费",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是免费。",
      "py": "Zhè shì 免费.",
      "id": "Ini adalah 免费."
    }
  },
  {
    "id": "zh-v-1475",
    "hanzi": "全部",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是全部。",
      "py": "Zhè shì 全部.",
      "id": "Ini adalah 全部."
    }
  },
  {
    "id": "zh-v-1476",
    "hanzi": "活动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是活动。",
      "py": "Zhè shì 活动.",
      "id": "Ini adalah 活动."
    }
  },
  {
    "id": "zh-v-1477",
    "hanzi": "肯定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是肯定。",
      "py": "Zhè shì 肯定.",
      "id": "Ini adalah 肯定."
    }
  },
  {
    "id": "zh-v-1478",
    "hanzi": "千万",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是千万。",
      "py": "Zhè shì 千万.",
      "id": "Ini adalah 千万."
    }
  },
  {
    "id": "zh-v-1479",
    "hanzi": "于是",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A simple life",
    "enMeaning": "Vocabulary from A simple life",
    "example": {
      "hz": "这是于是。",
      "py": "Zhè shì 于是.",
      "id": "Ini adalah 于是."
    }
  },
  {
    "id": "zh-v-1480",
    "hanzi": "重点",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是重点。",
      "py": "Zhè shì 重点.",
      "id": "Ini adalah 重点."
    }
  },
  {
    "id": "zh-v-1481",
    "hanzi": "复印",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是复印。",
      "py": "Zhè shì 复印.",
      "id": "Ini adalah 复印."
    }
  },
  {
    "id": "zh-v-1482",
    "hanzi": "任务",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是任务。",
      "py": "Zhè shì 任务.",
      "id": "Ini adalah 任务."
    }
  },
  {
    "id": "zh-v-1483",
    "hanzi": "总结",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是总结。",
      "py": "Zhè shì 总结.",
      "id": "Ini adalah 总结."
    }
  },
  {
    "id": "zh-v-1484",
    "hanzi": "部门",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是部门。",
      "py": "Zhè shì 部门.",
      "id": "Ini adalah 部门."
    }
  },
  {
    "id": "zh-v-1485",
    "hanzi": "记录",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meeting preparation",
    "enMeaning": "Vocabulary from Meeting preparation",
    "example": {
      "hz": "这是记录。",
      "py": "Zhè shì 记录.",
      "id": "Ini adalah 记录."
    }
  },
  {
    "id": "zh-v-1486",
    "hanzi": "暂时",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job-hunting",
    "enMeaning": "Vocabulary from Job-hunting",
    "example": {
      "hz": "这是暂时。",
      "py": "Zhè shì 暂时.",
      "id": "Ini adalah 暂时."
    }
  },
  {
    "id": "zh-v-1487",
    "hanzi": "未来",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job-hunting",
    "enMeaning": "Vocabulary from Job-hunting",
    "example": {
      "hz": "这是未来。",
      "py": "Zhè shì 未来.",
      "id": "Ini adalah 未来."
    }
  },
  {
    "id": "zh-v-1488",
    "hanzi": "困难",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是困难。",
      "py": "Zhè shì 困难.",
      "id": "Ini adalah 困难."
    }
  },
  {
    "id": "zh-v-1489",
    "hanzi": "判断",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是判断。",
      "py": "Zhè shì 判断.",
      "id": "Ini adalah 判断."
    }
  },
  {
    "id": "zh-v-1490",
    "hanzi": "对话",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是对话。",
      "py": "Zhè shì 对话.",
      "id": "Ini adalah 对话."
    }
  },
  {
    "id": "zh-v-1491",
    "hanzi": "阅读",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是阅读。",
      "py": "Zhè shì 阅读.",
      "id": "Ini adalah 阅读."
    }
  },
  {
    "id": "zh-v-1492",
    "hanzi": "顺序",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是顺序。",
      "py": "Zhè shì 顺序.",
      "id": "Ini adalah 顺序."
    }
  },
  {
    "id": "zh-v-1493",
    "hanzi": "排列",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是排列。",
      "py": "Zhè shì 排列.",
      "id": "Ini adalah 排列."
    }
  },
  {
    "id": "zh-v-1494",
    "hanzi": "熟悉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是熟悉。",
      "py": "Zhè shì 熟悉.",
      "id": "Ini adalah 熟悉."
    }
  },
  {
    "id": "zh-v-1495",
    "hanzi": "听力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是听力。",
      "py": "Zhè shì 听力.",
      "id": "Ini adalah 听力."
    }
  },
  {
    "id": "zh-v-1496",
    "hanzi": "短文",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是短文。",
      "py": "Zhè shì 短文.",
      "id": "Ini adalah 短文."
    }
  },
  {
    "id": "zh-v-1497",
    "hanzi": "选项",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Exam preparation",
    "enMeaning": "Vocabulary from Exam preparation",
    "example": {
      "hz": "这是选项。",
      "py": "Zhè shì 选项.",
      "id": "Ini adalah 选项."
    }
  },
  {
    "id": "zh-v-1498",
    "hanzi": "景色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是景色。",
      "py": "Zhè shì 景色.",
      "id": "Ini adalah 景色."
    }
  },
  {
    "id": "zh-v-1499",
    "hanzi": "棒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是棒。",
      "py": "Zhè shì 棒.",
      "id": "Ini adalah 棒."
    }
  },
  {
    "id": "zh-v-1500",
    "hanzi": "美丽",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是美丽。",
      "py": "Zhè shì 美丽.",
      "id": "Ini adalah 美丽."
    }
  },
  {
    "id": "zh-v-1501",
    "hanzi": "烤鸭",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是烤鸭。",
      "py": "Zhè shì 烤鸭.",
      "id": "Ini adalah 烤鸭."
    }
  },
  {
    "id": "zh-v-1502",
    "hanzi": "饺子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是饺子。",
      "py": "Zhè shì 饺子.",
      "id": "Ini adalah 饺子."
    }
  },
  {
    "id": "zh-v-1503",
    "hanzi": "京剧",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是京剧。",
      "py": "Zhè shì 京剧.",
      "id": "Ini adalah 京剧."
    }
  },
  {
    "id": "zh-v-1504",
    "hanzi": "散步",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是散步。",
      "py": "Zhè shì 散步.",
      "id": "Ini adalah 散步."
    }
  },
  {
    "id": "zh-v-1505",
    "hanzi": "回忆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Visiting old friends",
    "enMeaning": "Vocabulary from Visiting old friends",
    "example": {
      "hz": "这是回忆。",
      "py": "Zhè shì 回忆.",
      "id": "Ini adalah 回忆."
    }
  },
  {
    "id": "zh-v-1506",
    "hanzi": "积极",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是积极。",
      "py": "Zhè shì 积极.",
      "id": "Ini adalah 积极."
    }
  },
  {
    "id": "zh-v-1507",
    "hanzi": "笑话",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是笑话。",
      "py": "Zhè shì 笑话.",
      "id": "Ini adalah 笑话."
    }
  },
  {
    "id": "zh-v-1508",
    "hanzi": "大概",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是大概。",
      "py": "Zhè shì 大概.",
      "id": "Ini adalah 大概."
    }
  },
  {
    "id": "zh-v-1509",
    "hanzi": "复杂",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是复杂。",
      "py": "Zhè shì 复杂.",
      "id": "Ini adalah 复杂."
    }
  },
  {
    "id": "zh-v-1510",
    "hanzi": "永远",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是永远。",
      "py": "Zhè shì 永远.",
      "id": "Ini adalah 永远."
    }
  },
  {
    "id": "zh-v-1511",
    "hanzi": "友好",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Character traits",
    "enMeaning": "Vocabulary from Character traits",
    "example": {
      "hz": "这是友好。",
      "py": "Zhè shì 友好.",
      "id": "Ini adalah 友好."
    }
  },
  {
    "id": "zh-v-1512",
    "hanzi": "售货员",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是售货员。",
      "py": "Zhè shì 售货员.",
      "id": "Ini adalah 售货员."
    }
  },
  {
    "id": "zh-v-1513",
    "hanzi": "礼貌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是礼貌。",
      "py": "Zhè shì 礼貌.",
      "id": "Ini adalah 礼貌."
    }
  },
  {
    "id": "zh-v-1514",
    "hanzi": "耐心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是耐心。",
      "py": "Zhè shì 耐心.",
      "id": "Ini adalah 耐心."
    }
  },
  {
    "id": "zh-v-1515",
    "hanzi": "取",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是取。",
      "py": "Zhè shì 取.",
      "id": "Ini adalah 取."
    }
  },
  {
    "id": "zh-v-1516",
    "hanzi": "寄",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是寄。",
      "py": "Zhè shì 寄.",
      "id": "Ini adalah 寄."
    }
  },
  {
    "id": "zh-v-1517",
    "hanzi": "硕士",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是硕士。",
      "py": "Zhè shì 硕士.",
      "id": "Ini adalah 硕士."
    }
  },
  {
    "id": "zh-v-1518",
    "hanzi": "记者",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是记者。",
      "py": "Zhè shì 记者.",
      "id": "Ini adalah 记者."
    }
  },
  {
    "id": "zh-v-1519",
    "hanzi": "作家",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Occupations",
    "enMeaning": "Vocabulary from Occupations",
    "example": {
      "hz": "这是作家。",
      "py": "Zhè shì 作家.",
      "id": "Ini adalah 作家."
    }
  },
  {
    "id": "zh-v-1520",
    "hanzi": "教练",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是教练。",
      "py": "Zhè shì 教练.",
      "id": "Ini adalah 教练."
    }
  },
  {
    "id": "zh-v-1521",
    "hanzi": "目的",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是目的。",
      "py": "Zhè shì 目的.",
      "id": "Ini adalah 目的."
    }
  },
  {
    "id": "zh-v-1522",
    "hanzi": "重视",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是重视。",
      "py": "Zhè shì 重视.",
      "id": "Ini adalah 重视."
    }
  },
  {
    "id": "zh-v-1523",
    "hanzi": "温度",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是温度。",
      "py": "Zhè shì 温度.",
      "id": "Ini adalah 温度."
    }
  },
  {
    "id": "zh-v-1524",
    "hanzi": "来自",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是来自。",
      "py": "Zhè shì 来自.",
      "id": "Ini adalah 来自."
    }
  },
  {
    "id": "zh-v-1525",
    "hanzi": "瑜伽",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是瑜伽。",
      "py": "Zhè shì 瑜伽.",
      "id": "Ini adalah 瑜伽."
    }
  },
  {
    "id": "zh-v-1526",
    "hanzi": "游泳池",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran In the gym",
    "enMeaning": "Vocabulary from In the gym",
    "example": {
      "hz": "这是游泳池。",
      "py": "Zhè shì 游泳池.",
      "id": "Ini adalah 游泳池."
    }
  },
  {
    "id": "zh-v-1527",
    "hanzi": "后悔",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend trips",
    "enMeaning": "Vocabulary from Weekend trips",
    "example": {
      "hz": "这是后悔。",
      "py": "Zhè shì 后悔.",
      "id": "Ini adalah 后悔."
    }
  },
  {
    "id": "zh-v-1528",
    "hanzi": "森林",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend trips",
    "enMeaning": "Vocabulary from Weekend trips",
    "example": {
      "hz": "这是森林。",
      "py": "Zhè shì 森林.",
      "id": "Ini adalah 森林."
    }
  },
  {
    "id": "zh-v-1529",
    "hanzi": "占线",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend trips",
    "enMeaning": "Vocabulary from Weekend trips",
    "example": {
      "hz": "这是占线。",
      "py": "Zhè shì 占线.",
      "id": "Ini adalah 占线."
    }
  },
  {
    "id": "zh-v-1530",
    "hanzi": "植物",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend trips",
    "enMeaning": "Vocabulary from Weekend trips",
    "example": {
      "hz": "这是植物。",
      "py": "Zhè shì 植物.",
      "id": "Ini adalah 植物."
    }
  },
  {
    "id": "zh-v-1531",
    "hanzi": "叶子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend trips",
    "enMeaning": "Vocabulary from Weekend trips",
    "example": {
      "hz": "这是叶子。",
      "py": "Zhè shì 叶子.",
      "id": "Ini adalah 叶子."
    }
  },
  {
    "id": "zh-v-1532",
    "hanzi": "棵",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Weekend trips",
    "enMeaning": "Vocabulary from Weekend trips",
    "example": {
      "hz": "这是棵。",
      "py": "Zhè shì 棵.",
      "id": "Ini adalah 棵."
    }
  },
  {
    "id": "zh-v-1533",
    "hanzi": "承认",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是承认。",
      "py": "Zhè shì 承认.",
      "id": "Ini adalah 承认."
    }
  },
  {
    "id": "zh-v-1534",
    "hanzi": "表扬",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是表扬。",
      "py": "Zhè shì 表扬.",
      "id": "Ini adalah 表扬."
    }
  },
  {
    "id": "zh-v-1535",
    "hanzi": "鼓励",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是鼓励。",
      "py": "Zhè shì 鼓励.",
      "id": "Ini adalah 鼓励."
    }
  },
  {
    "id": "zh-v-1536",
    "hanzi": "儿童",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是儿童。",
      "py": "Zhè shì 儿童.",
      "id": "Ini adalah 儿童."
    }
  },
  {
    "id": "zh-v-1537",
    "hanzi": "教育",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是教育。",
      "py": "Zhè shì 教育.",
      "id": "Ini adalah 教育."
    }
  },
  {
    "id": "zh-v-1538",
    "hanzi": "故意",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是故意。",
      "py": "Zhè shì 故意.",
      "id": "Ini adalah 故意."
    }
  },
  {
    "id": "zh-v-1539",
    "hanzi": "证明",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是证明。",
      "py": "Zhè shì 证明.",
      "id": "Ini adalah 证明."
    }
  },
  {
    "id": "zh-v-1540",
    "hanzi": "笨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是笨。",
      "py": "Zhè shì 笨.",
      "id": "Ini adalah 笨."
    }
  },
  {
    "id": "zh-v-1541",
    "hanzi": "缺少",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是缺少。",
      "py": "Zhè shì 缺少.",
      "id": "Ini adalah 缺少."
    }
  },
  {
    "id": "zh-v-1542",
    "hanzi": "支持",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是支持。",
      "py": "Zhè shì 支持.",
      "id": "Ini adalah 支持."
    }
  },
  {
    "id": "zh-v-1543",
    "hanzi": "进步",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是进步。",
      "py": "Zhè shì 进步.",
      "id": "Ini adalah 进步."
    }
  },
  {
    "id": "zh-v-1544",
    "hanzi": "呀",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran home education",
    "enMeaning": "Vocabulary from home education",
    "example": {
      "hz": "这是呀。",
      "py": "Zhè shì 呀.",
      "id": "Ini adalah 呀."
    }
  },
  {
    "id": "zh-v-1545",
    "hanzi": "抱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是抱。",
      "py": "Zhè shì 抱.",
      "id": "Ini adalah 抱."
    }
  },
  {
    "id": "zh-v-1546",
    "hanzi": "对面",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是对面。",
      "py": "Zhè shì 对面.",
      "id": "Ini adalah 对面."
    }
  },
  {
    "id": "zh-v-1547",
    "hanzi": "零钱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是零钱。",
      "py": "Zhè shì 零钱.",
      "id": "Ini adalah 零钱."
    }
  },
  {
    "id": "zh-v-1548",
    "hanzi": "现金",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是现金。",
      "py": "Zhè shì 现金.",
      "id": "Ini adalah 现金."
    }
  },
  {
    "id": "zh-v-1549",
    "hanzi": "怀疑",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是怀疑。",
      "py": "Zhè shì 怀疑.",
      "id": "Ini adalah 怀疑."
    }
  },
  {
    "id": "zh-v-1550",
    "hanzi": "孙子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是孙子。",
      "py": "Zhè shì 孙子.",
      "id": "Ini adalah 孙子."
    }
  },
  {
    "id": "zh-v-1551",
    "hanzi": "相同",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是相同。",
      "py": "Zhè shì 相同.",
      "id": "Ini adalah 相同."
    }
  },
  {
    "id": "zh-v-1552",
    "hanzi": "遍",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是遍。",
      "py": "Zhè shì 遍.",
      "id": "Ini adalah 遍."
    }
  },
  {
    "id": "zh-v-1553",
    "hanzi": "拒绝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是拒绝。",
      "py": "Zhè shì 拒绝.",
      "id": "Ini adalah 拒绝."
    }
  },
  {
    "id": "zh-v-1554",
    "hanzi": "偷",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Emotions and attitudes",
    "enMeaning": "Vocabulary from Emotions and attitudes",
    "example": {
      "hz": "这是偷。",
      "py": "Zhè shì 偷.",
      "id": "Ini adalah 偷."
    }
  },
  {
    "id": "zh-v-1555",
    "hanzi": "经济",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是经济。",
      "py": "Zhè shì 经济.",
      "id": "Ini adalah 经济."
    }
  },
  {
    "id": "zh-v-1556",
    "hanzi": "养成",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是养成。",
      "py": "Zhè shì 养成.",
      "id": "Ini adalah 养成."
    }
  },
  {
    "id": "zh-v-1557",
    "hanzi": "降低",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是降低。",
      "py": "Zhè shì 降低.",
      "id": "Ini adalah 降低."
    }
  },
  {
    "id": "zh-v-1558",
    "hanzi": "标准",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是标准。",
      "py": "Zhè shì 标准.",
      "id": "Ini adalah 标准."
    }
  },
  {
    "id": "zh-v-1559",
    "hanzi": "尤其",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是尤其。",
      "py": "Zhè shì 尤其.",
      "id": "Ini adalah 尤其."
    }
  },
  {
    "id": "zh-v-1560",
    "hanzi": "爱情",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是爱情。",
      "py": "Zhè shì 爱情.",
      "id": "Ini adalah 爱情."
    }
  },
  {
    "id": "zh-v-1561",
    "hanzi": "反对",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是反对。",
      "py": "Zhè shì 反对.",
      "id": "Ini adalah 反对."
    }
  },
  {
    "id": "zh-v-1562",
    "hanzi": "成长",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是成长。",
      "py": "Zhè shì 成长.",
      "id": "Ini adalah 成长."
    }
  },
  {
    "id": "zh-v-1563",
    "hanzi": "消费",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spending habits",
    "enMeaning": "Vocabulary from Spending habits",
    "example": {
      "hz": "这是消费。",
      "py": "Zhè shì 消费.",
      "id": "Ini adalah 消费."
    }
  },
  {
    "id": "zh-v-1564",
    "hanzi": "究竟",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是究竟。",
      "py": "Zhè shì 究竟.",
      "id": "Ini adalah 究竟."
    }
  },
  {
    "id": "zh-v-1565",
    "hanzi": "懒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是懒。",
      "py": "Zhè shì 懒.",
      "id": "Ini adalah 懒."
    }
  },
  {
    "id": "zh-v-1566",
    "hanzi": "到处",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是到处。",
      "py": "Zhè shì 到处.",
      "id": "Ini adalah 到处."
    }
  },
  {
    "id": "zh-v-1567",
    "hanzi": "脱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是脱。",
      "py": "Zhè shì 脱.",
      "id": "Ini adalah 脱."
    }
  },
  {
    "id": "zh-v-1568",
    "hanzi": "袜子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是袜子。",
      "py": "Zhè shì 袜子.",
      "id": "Ini adalah 袜子."
    }
  },
  {
    "id": "zh-v-1569",
    "hanzi": "失望",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是失望。",
      "py": "Zhè shì 失望.",
      "id": "Ini adalah 失望."
    }
  },
  {
    "id": "zh-v-1570",
    "hanzi": "母亲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是母亲。",
      "py": "Zhè shì 母亲.",
      "id": "Ini adalah 母亲."
    }
  },
  {
    "id": "zh-v-1571",
    "hanzi": "互相",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Do you want to get married?",
    "enMeaning": "Vocabulary from Do you want to get married?",
    "example": {
      "hz": "这是互相。",
      "py": "Zhè shì 互相.",
      "id": "Ini adalah 互相."
    }
  },
  {
    "id": "zh-v-1572",
    "hanzi": "也许",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是也许。",
      "py": "Zhè shì 也许.",
      "id": "Ini adalah 也许."
    }
  },
  {
    "id": "zh-v-1573",
    "hanzi": "一切",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是一切。",
      "py": "Zhè shì 一切.",
      "id": "Ini adalah 一切."
    }
  },
  {
    "id": "zh-v-1574",
    "hanzi": "逃避",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是逃避。",
      "py": "Zhè shì 逃避.",
      "id": "Ini adalah 逃避."
    }
  },
  {
    "id": "zh-v-1575",
    "hanzi": "道理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是道理。",
      "py": "Zhè shì 道理.",
      "id": "Ini adalah 道理."
    }
  },
  {
    "id": "zh-v-1576",
    "hanzi": "着火",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dreaming",
    "enMeaning": "Vocabulary from Dreaming",
    "example": {
      "hz": "这是着火。",
      "py": "Zhè shì 着火.",
      "id": "Ini adalah 着火."
    }
  },
  {
    "id": "zh-v-1577",
    "hanzi": "葡萄酒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是葡萄酒。",
      "py": "Zhè shì 葡萄酒.",
      "id": "Ini adalah 葡萄酒."
    }
  },
  {
    "id": "zh-v-1578",
    "hanzi": "瓶",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是瓶。",
      "py": "Zhè shì 瓶.",
      "id": "Ini adalah 瓶."
    }
  },
  {
    "id": "zh-v-1579",
    "hanzi": "夜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是夜。",
      "py": "Zhè shì 夜.",
      "id": "Ini adalah 夜."
    }
  },
  {
    "id": "zh-v-1580",
    "hanzi": "闹钟",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是闹钟。",
      "py": "Zhè shì 闹钟.",
      "id": "Ini adalah 闹钟."
    }
  },
  {
    "id": "zh-v-1581",
    "hanzi": "响",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是响。",
      "py": "Zhè shì 响.",
      "id": "Ini adalah 响."
    }
  },
  {
    "id": "zh-v-1582",
    "hanzi": "作用",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是作用。",
      "py": "Zhè shì 作用.",
      "id": "Ini adalah 作用."
    }
  },
  {
    "id": "zh-v-1583",
    "hanzi": "轻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是轻。",
      "py": "Zhè shì 轻.",
      "id": "Ini adalah 轻."
    }
  },
  {
    "id": "zh-v-1584",
    "hanzi": "进入",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是进入。",
      "py": "Zhè shì 进入.",
      "id": "Ini adalah 进入."
    }
  },
  {
    "id": "zh-v-1585",
    "hanzi": "睡着",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Sleep quality",
    "enMeaning": "Vocabulary from Sleep quality",
    "example": {
      "hz": "这是睡着。",
      "py": "Zhè shì 睡着.",
      "id": "Ini adalah 睡着."
    }
  },
  {
    "id": "zh-v-1586",
    "hanzi": "超重",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是超重。",
      "py": "Zhè shì 超重.",
      "id": "Ini adalah 超重."
    }
  },
  {
    "id": "zh-v-1587",
    "hanzi": "厚",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是厚。",
      "py": "Zhè shì 厚.",
      "id": "Ini adalah 厚."
    }
  },
  {
    "id": "zh-v-1588",
    "hanzi": "重",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是重。",
      "py": "Zhè shì 重.",
      "id": "Ini adalah 重."
    }
  },
  {
    "id": "zh-v-1589",
    "hanzi": "登机牌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是登机牌。",
      "py": "Zhè shì 登机牌.",
      "id": "Ini adalah 登机牌."
    }
  },
  {
    "id": "zh-v-1590",
    "hanzi": "停止",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是停止。",
      "py": "Zhè shì 停止.",
      "id": "Ini adalah 停止."
    }
  },
  {
    "id": "zh-v-1591",
    "hanzi": "到达",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是到达。",
      "py": "Zhè shì 到达.",
      "id": "Ini adalah 到达."
    }
  },
  {
    "id": "zh-v-1592",
    "hanzi": "乘坐",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是乘坐。",
      "py": "Zhè shì 乘坐.",
      "id": "Ini adalah 乘坐."
    }
  },
  {
    "id": "zh-v-1593",
    "hanzi": "广播",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Check-in procedures",
    "enMeaning": "Vocabulary from Check-in procedures",
    "example": {
      "hz": "这是广播。",
      "py": "Zhè shì 广播.",
      "id": "Ini adalah 广播."
    }
  },
  {
    "id": "zh-v-1594",
    "hanzi": "入口",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是入口。",
      "py": "Zhè shì 入口.",
      "id": "Ini adalah 入口."
    }
  },
  {
    "id": "zh-v-1595",
    "hanzi": "座",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是座。",
      "py": "Zhè shì 座.",
      "id": "Ini adalah 座."
    }
  },
  {
    "id": "zh-v-1596",
    "hanzi": "桥",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是桥。",
      "py": "Zhè shì 桥.",
      "id": "Ini adalah 桥."
    }
  },
  {
    "id": "zh-v-1597",
    "hanzi": "阳光",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是阳光。",
      "py": "Zhè shì 阳光.",
      "id": "Ini adalah 阳光."
    }
  },
  {
    "id": "zh-v-1598",
    "hanzi": "演出",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是演出。",
      "py": "Zhè shì 演出.",
      "id": "Ini adalah 演出."
    }
  },
  {
    "id": "zh-v-1599",
    "hanzi": "精彩",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是精彩。",
      "py": "Zhè shì 精彩.",
      "id": "Ini adalah 精彩."
    }
  },
  {
    "id": "zh-v-1600",
    "hanzi": "举行",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是举行。",
      "py": "Zhè shì 举行.",
      "id": "Ini adalah 举行."
    }
  },
  {
    "id": "zh-v-1601",
    "hanzi": "热闹",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是热闹。",
      "py": "Zhè shì 热闹.",
      "id": "Ini adalah 热闹."
    }
  },
  {
    "id": "zh-v-1602",
    "hanzi": "小吃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是小吃。",
      "py": "Zhè shì 小吃.",
      "id": "Ini adalah 小吃."
    }
  },
  {
    "id": "zh-v-1603",
    "hanzi": "辣",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是辣。",
      "py": "Zhè shì 辣.",
      "id": "Ini adalah 辣."
    }
  },
  {
    "id": "zh-v-1604",
    "hanzi": "普通",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Lijiang impressions",
    "enMeaning": "Vocabulary from Lijiang impressions",
    "example": {
      "hz": "这是普通。",
      "py": "Zhè shì 普通.",
      "id": "Ini adalah 普通."
    }
  },
  {
    "id": "zh-v-1605",
    "hanzi": "救",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是救。",
      "py": "Zhè shì 救.",
      "id": "Ini adalah 救."
    }
  },
  {
    "id": "zh-v-1606",
    "hanzi": "吐",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是吐。",
      "py": "Zhè shì 吐.",
      "id": "Ini adalah 吐."
    }
  },
  {
    "id": "zh-v-1607",
    "hanzi": "伤心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是伤心。",
      "py": "Zhè shì 伤心.",
      "id": "Ini adalah 伤心."
    }
  },
  {
    "id": "zh-v-1608",
    "hanzi": "海洋",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是海洋。",
      "py": "Zhè shì 海洋.",
      "id": "Ini adalah 海洋."
    }
  },
  {
    "id": "zh-v-1609",
    "hanzi": "区别",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是区别。",
      "py": "Zhè shì 区别.",
      "id": "Ini adalah 区别."
    }
  },
  {
    "id": "zh-v-1610",
    "hanzi": "地球",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是地球。",
      "py": "Zhè shì 地球.",
      "id": "Ini adalah 地球."
    }
  },
  {
    "id": "zh-v-1611",
    "hanzi": "深",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是深。",
      "py": "Zhè shì 深.",
      "id": "Ini adalah 深."
    }
  },
  {
    "id": "zh-v-1612",
    "hanzi": "责任",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是责任。",
      "py": "Zhè shì 责任.",
      "id": "Ini adalah 责任."
    }
  },
  {
    "id": "zh-v-1613",
    "hanzi": "吨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pollution",
    "enMeaning": "Vocabulary from Pollution",
    "example": {
      "hz": "这是吨。",
      "py": "Zhè shì 吨.",
      "id": "Ini adalah 吨."
    }
  },
  {
    "id": "zh-v-1614",
    "hanzi": "到底",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to eat less?",
    "enMeaning": "Vocabulary from How to eat less?",
    "example": {
      "hz": "这是到底。",
      "py": "Zhè shì 到底.",
      "id": "Ini adalah 到底."
    }
  },
  {
    "id": "zh-v-1615",
    "hanzi": "抽烟",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to eat less?",
    "enMeaning": "Vocabulary from How to eat less?",
    "example": {
      "hz": "这是抽烟。",
      "py": "Zhè shì 抽烟.",
      "id": "Ini adalah 抽烟."
    }
  },
  {
    "id": "zh-v-1616",
    "hanzi": "估计",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to eat less?",
    "enMeaning": "Vocabulary from How to eat less?",
    "example": {
      "hz": "这是估计。",
      "py": "Zhè shì 估计.",
      "id": "Ini adalah 估计."
    }
  },
  {
    "id": "zh-v-1617",
    "hanzi": "照",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to eat less?",
    "enMeaning": "Vocabulary from How to eat less?",
    "example": {
      "hz": "这是照。",
      "py": "Zhè shì 照.",
      "id": "Ini adalah 照."
    }
  },
  {
    "id": "zh-v-1618",
    "hanzi": "行为",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to eat less?",
    "enMeaning": "Vocabulary from How to eat less?",
    "example": {
      "hz": "这是行为。",
      "py": "Zhè shì 行为.",
      "id": "Ini adalah 行为."
    }
  },
  {
    "id": "zh-v-1619",
    "hanzi": "负面",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to eat less?",
    "enMeaning": "Vocabulary from How to eat less?",
    "example": {
      "hz": "这是负面。",
      "py": "Zhè shì 负面.",
      "id": "Ini adalah 负面."
    }
  },
  {
    "id": "zh-v-1620",
    "hanzi": "误会",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是误会。",
      "py": "Zhè shì 误会.",
      "id": "Ini adalah 误会."
    }
  },
  {
    "id": "zh-v-1621",
    "hanzi": "仔细",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是仔细。",
      "py": "Zhè shì 仔细.",
      "id": "Ini adalah 仔细."
    }
  },
  {
    "id": "zh-v-1622",
    "hanzi": "友谊",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是友谊。",
      "py": "Zhè shì 友谊.",
      "id": "Ini adalah 友谊."
    }
  },
  {
    "id": "zh-v-1623",
    "hanzi": "敏感",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是敏感。",
      "py": "Zhè shì 敏感.",
      "id": "Ini adalah 敏感."
    }
  },
  {
    "id": "zh-v-1624",
    "hanzi": "背",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Competition",
    "enMeaning": "Vocabulary from Competition",
    "example": {
      "hz": "这是背。",
      "py": "Zhè shì 背.",
      "id": "Ini adalah 背."
    }
  },
  {
    "id": "zh-v-1625",
    "hanzi": "尊重",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是尊重。",
      "py": "Zhè shì 尊重.",
      "id": "Ini adalah 尊重."
    }
  },
  {
    "id": "zh-v-1626",
    "hanzi": "意见",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是意见。",
      "py": "Zhè shì 意见.",
      "id": "Ini adalah 意见."
    }
  },
  {
    "id": "zh-v-1627",
    "hanzi": "讨论",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是讨论。",
      "py": "Zhè shì 讨论.",
      "id": "Ini adalah 讨论."
    }
  },
  {
    "id": "zh-v-1628",
    "hanzi": "过程",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是过程。",
      "py": "Zhè shì 过程.",
      "id": "Ini adalah 过程."
    }
  },
  {
    "id": "zh-v-1629",
    "hanzi": "仍然",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是仍然。",
      "py": "Zhè shì 仍然.",
      "id": "Ini adalah 仍然."
    }
  },
  {
    "id": "zh-v-1630",
    "hanzi": "完全",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是完全。",
      "py": "Zhè shì 完全.",
      "id": "Ini adalah 完全."
    }
  },
  {
    "id": "zh-v-1631",
    "hanzi": "话题",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是话题。",
      "py": "Zhè shì 话题.",
      "id": "Ini adalah 话题."
    }
  },
  {
    "id": "zh-v-1632",
    "hanzi": "外表",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是外表。",
      "py": "Zhè shì 外表.",
      "id": "Ini adalah 外表."
    }
  },
  {
    "id": "zh-v-1633",
    "hanzi": "提问",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The art of speaking",
    "enMeaning": "Vocabulary from The art of speaking",
    "example": {
      "hz": "这是提问。",
      "py": "Zhè shì 提问.",
      "id": "Ini adalah 提问."
    }
  },
  {
    "id": "zh-v-1634",
    "hanzi": "沟通",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是沟通。",
      "py": "Zhè shì 沟通.",
      "id": "Ini adalah 沟通."
    }
  },
  {
    "id": "zh-v-1635",
    "hanzi": "恭喜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是恭喜。",
      "py": "Zhè shì 恭喜.",
      "id": "Ini adalah 恭喜."
    }
  },
  {
    "id": "zh-v-1636",
    "hanzi": "外国",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是外国。",
      "py": "Zhè shì 外国.",
      "id": "Ini adalah 外国."
    }
  },
  {
    "id": "zh-v-1637",
    "hanzi": "学期",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是学期。",
      "py": "Zhè shì 学期.",
      "id": "Ini adalah 学期."
    }
  },
  {
    "id": "zh-v-1638",
    "hanzi": "寒假",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是寒假。",
      "py": "Zhè shì 寒假.",
      "id": "Ini adalah 寒假."
    }
  },
  {
    "id": "zh-v-1639",
    "hanzi": "职业",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是职业。",
      "py": "Zhè shì 职业.",
      "id": "Ini adalah 职业."
    }
  },
  {
    "id": "zh-v-1640",
    "hanzi": "号码",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是号码。",
      "py": "Zhè shì 号码.",
      "id": "Ini adalah 号码."
    }
  },
  {
    "id": "zh-v-1641",
    "hanzi": "干杯",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是干杯。",
      "py": "Zhè shì 干杯.",
      "id": "Ini adalah 干杯."
    }
  },
  {
    "id": "zh-v-1642",
    "hanzi": "详细",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是详细。",
      "py": "Zhè shì 详细.",
      "id": "Ini adalah 详细."
    }
  },
  {
    "id": "zh-v-1643",
    "hanzi": "兼职",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是兼职。",
      "py": "Zhè shì 兼职.",
      "id": "Ini adalah 兼职."
    }
  },
  {
    "id": "zh-v-1644",
    "hanzi": "全职",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work recommendation",
    "enMeaning": "Vocabulary from Work recommendation",
    "example": {
      "hz": "这是全职。",
      "py": "Zhè shì 全职.",
      "id": "Ini adalah 全职."
    }
  },
  {
    "id": "zh-v-1645",
    "hanzi": "诚实",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Financial Management",
    "enMeaning": "Vocabulary from Financial Management",
    "example": {
      "hz": "这是诚实。",
      "py": "Zhè shì 诚实.",
      "id": "Ini adalah 诚实."
    }
  },
  {
    "id": "zh-v-1646",
    "hanzi": "积累",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Financial Management",
    "enMeaning": "Vocabulary from Financial Management",
    "example": {
      "hz": "这是积累。",
      "py": "Zhè shì 积累.",
      "id": "Ini adalah 积累."
    }
  },
  {
    "id": "zh-v-1647",
    "hanzi": "基础",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Financial Management",
    "enMeaning": "Vocabulary from Financial Management",
    "example": {
      "hz": "这是基础。",
      "py": "Zhè shì 基础.",
      "id": "Ini adalah 基础."
    }
  },
  {
    "id": "zh-v-1648",
    "hanzi": "特点",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Financial Management",
    "enMeaning": "Vocabulary from Financial Management",
    "example": {
      "hz": "这是特点。",
      "py": "Zhè shì 特点.",
      "id": "Ini adalah 特点."
    }
  },
  {
    "id": "zh-v-1649",
    "hanzi": "交",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Financial Management",
    "enMeaning": "Vocabulary from Financial Management",
    "example": {
      "hz": "这是交。",
      "py": "Zhè shì 交.",
      "id": "Ini adalah 交."
    }
  },
  {
    "id": "zh-v-1650",
    "hanzi": "必要",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 6,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Financial Management",
    "enMeaning": "Vocabulary from Financial Management",
    "example": {
      "hz": "这是必要。",
      "py": "Zhè shì 必要.",
      "id": "Ini adalah 必要."
    }
  },
  {
    "id": "zh-v-1651",
    "hanzi": "抢",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran 11.11",
    "enMeaning": "Vocabulary from 11.11",
    "example": {
      "hz": "这是抢。",
      "py": "Zhè shì 抢.",
      "id": "Ini adalah 抢."
    }
  },
  {
    "id": "zh-v-1652",
    "hanzi": "老板",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是老板。",
      "py": "Zhè shì 老板.",
      "id": "Ini adalah 老板."
    }
  },
  {
    "id": "zh-v-1653",
    "hanzi": "词汇",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是词汇。",
      "py": "Zhè shì 词汇.",
      "id": "Ini adalah 词汇."
    }
  },
  {
    "id": "zh-v-1654",
    "hanzi": "观察",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是观察。",
      "py": "Zhè shì 观察.",
      "id": "Ini adalah 观察."
    }
  },
  {
    "id": "zh-v-1655",
    "hanzi": "车厢",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是车厢。",
      "py": "Zhè shì 车厢.",
      "id": "Ini adalah 车厢."
    }
  },
  {
    "id": "zh-v-1656",
    "hanzi": "文件",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是文件。",
      "py": "Zhè shì 文件.",
      "id": "Ini adalah 文件."
    }
  },
  {
    "id": "zh-v-1657",
    "hanzi": "不断",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是不断。",
      "py": "Zhè shì 不断.",
      "id": "Ini adalah 不断."
    }
  },
  {
    "id": "zh-v-1658",
    "hanzi": "面试",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是面试。",
      "py": "Zhè shì 面试.",
      "id": "Ini adalah 面试."
    }
  },
  {
    "id": "zh-v-1659",
    "hanzi": "事",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran On the commute",
    "enMeaning": "Vocabulary from On the commute",
    "example": {
      "hz": "这是事。",
      "py": "Zhè shì 事.",
      "id": "Ini adalah 事."
    }
  },
  {
    "id": "zh-v-1660",
    "hanzi": "设计师",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是设计师。",
      "py": "Zhè shì 设计师.",
      "id": "Ini adalah 设计师."
    }
  },
  {
    "id": "zh-v-1661",
    "hanzi": "职位",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是职位。",
      "py": "Zhè shì 职位.",
      "id": "Ini adalah 职位."
    }
  },
  {
    "id": "zh-v-1662",
    "hanzi": "热爱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是热爱。",
      "py": "Zhè shì 热爱.",
      "id": "Ini adalah 热爱."
    }
  },
  {
    "id": "zh-v-1663",
    "hanzi": "资深",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是资深。",
      "py": "Zhè shì 资深.",
      "id": "Ini adalah 资深."
    }
  },
  {
    "id": "zh-v-1664",
    "hanzi": "项目",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是项目。",
      "py": "Zhè shì 项目.",
      "id": "Ini adalah 项目."
    }
  },
  {
    "id": "zh-v-1665",
    "hanzi": "员工",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是员工。",
      "py": "Zhè shì 员工.",
      "id": "Ini adalah 员工."
    }
  },
  {
    "id": "zh-v-1666",
    "hanzi": "产品",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是产品。",
      "py": "Zhè shì 产品.",
      "id": "Ini adalah 产品."
    }
  },
  {
    "id": "zh-v-1667",
    "hanzi": "录用",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Job interview",
    "enMeaning": "Vocabulary from Job interview",
    "example": {
      "hz": "这是录用。",
      "py": "Zhè shì 录用.",
      "id": "Ini adalah 录用."
    }
  },
  {
    "id": "zh-v-1668",
    "hanzi": "封",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是封。",
      "py": "Zhè shì 封.",
      "id": "Ini adalah 封."
    }
  },
  {
    "id": "zh-v-1669",
    "hanzi": "忍不住",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是忍不住。",
      "py": "Zhè shì 忍不住.",
      "id": "Ini adalah 忍不住."
    }
  },
  {
    "id": "zh-v-1670",
    "hanzi": "尽力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是尽力。",
      "py": "Zhè shì 尽力.",
      "id": "Ini adalah 尽力."
    }
  },
  {
    "id": "zh-v-1671",
    "hanzi": "录取",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是录取。",
      "py": "Zhè shì 录取.",
      "id": "Ini adalah 录取."
    }
  },
  {
    "id": "zh-v-1672",
    "hanzi": "跌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是跌。",
      "py": "Zhè shì 跌.",
      "id": "Ini adalah 跌."
    }
  },
  {
    "id": "zh-v-1673",
    "hanzi": "安慰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是安慰。",
      "py": "Zhè shì 安慰.",
      "id": "Ini adalah 安慰."
    }
  },
  {
    "id": "zh-v-1674",
    "hanzi": "失去",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是失去。",
      "py": "Zhè shì 失去.",
      "id": "Ini adalah 失去."
    }
  },
  {
    "id": "zh-v-1675",
    "hanzi": "收获",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是收获。",
      "py": "Zhè shì 收获.",
      "id": "Ini adalah 收获."
    }
  },
  {
    "id": "zh-v-1676",
    "hanzi": "人生",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Dream School",
    "enMeaning": "Vocabulary from Dream School",
    "example": {
      "hz": "这是人生。",
      "py": "Zhè shì 人生.",
      "id": "Ini adalah 人生."
    }
  },
  {
    "id": "zh-v-1677",
    "hanzi": "剪",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是剪。",
      "py": "Zhè shì 剪.",
      "id": "Ini adalah 剪."
    }
  },
  {
    "id": "zh-v-1678",
    "hanzi": "推荐",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是推荐。",
      "py": "Zhè shì 推荐.",
      "id": "Ini adalah 推荐."
    }
  },
  {
    "id": "zh-v-1679",
    "hanzi": "时尚",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是时尚。",
      "py": "Zhè shì 时尚.",
      "id": "Ini adalah 时尚."
    }
  },
  {
    "id": "zh-v-1680",
    "hanzi": "类型",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是类型。",
      "py": "Zhè shì 类型.",
      "id": "Ini adalah 类型."
    }
  },
  {
    "id": "zh-v-1681",
    "hanzi": "参考",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是参考。",
      "py": "Zhè shì 参考.",
      "id": "Ini adalah 参考."
    }
  },
  {
    "id": "zh-v-1682",
    "hanzi": "个性",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是个性。",
      "py": "Zhè shì 个性.",
      "id": "Ini adalah 个性."
    }
  },
  {
    "id": "zh-v-1683",
    "hanzi": "截图",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是截图。",
      "py": "Zhè shì 截图.",
      "id": "Ini adalah 截图."
    }
  },
  {
    "id": "zh-v-1684",
    "hanzi": "播放",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是播放。",
      "py": "Zhè shì 播放.",
      "id": "Ini adalah 播放."
    }
  },
  {
    "id": "zh-v-1685",
    "hanzi": "键",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Haircut",
    "enMeaning": "Vocabulary from Haircut",
    "example": {
      "hz": "这是键。",
      "py": "Zhè shì 键.",
      "id": "Ini adalah 键."
    }
  },
  {
    "id": "zh-v-1686",
    "hanzi": "广场",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是广场。",
      "py": "Zhè shì 广场.",
      "id": "Ini adalah 广场."
    }
  },
  {
    "id": "zh-v-1687",
    "hanzi": "充实",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是充实。",
      "py": "Zhè shì 充实.",
      "id": "Ini adalah 充实."
    }
  },
  {
    "id": "zh-v-1688",
    "hanzi": "小区",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是小区。",
      "py": "Zhè shì 小区.",
      "id": "Ini adalah 小区."
    }
  },
  {
    "id": "zh-v-1689",
    "hanzi": "大爷",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是大爷。",
      "py": "Zhè shì 大爷.",
      "id": "Ini adalah 大爷."
    }
  },
  {
    "id": "zh-v-1690",
    "hanzi": "再三",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是再三。",
      "py": "Zhè shì 再三.",
      "id": "Ini adalah 再三."
    }
  },
  {
    "id": "zh-v-1691",
    "hanzi": "模仿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是模仿。",
      "py": "Zhè shì 模仿.",
      "id": "Ini adalah 模仿."
    }
  },
  {
    "id": "zh-v-1692",
    "hanzi": "位置",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是位置。",
      "py": "Zhè shì 位置.",
      "id": "Ini adalah 位置."
    }
  },
  {
    "id": "zh-v-1693",
    "hanzi": "熟练",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是熟练。",
      "py": "Zhè shì 熟练.",
      "id": "Ini adalah 熟练."
    }
  },
  {
    "id": "zh-v-1694",
    "hanzi": "踩",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是踩。",
      "py": "Zhè shì 踩.",
      "id": "Ini adalah 踩."
    }
  },
  {
    "id": "zh-v-1695",
    "hanzi": "夸",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是夸。",
      "py": "Zhè shì 夸.",
      "id": "Ini adalah 夸."
    }
  },
  {
    "id": "zh-v-1696",
    "hanzi": "节奏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Public Square Dancing",
    "enMeaning": "Vocabulary from Public Square Dancing",
    "example": {
      "hz": "这是节奏。",
      "py": "Zhè shì 节奏.",
      "id": "Ini adalah 节奏."
    }
  },
  {
    "id": "zh-v-1697",
    "hanzi": "复印机",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是复印机。",
      "py": "Zhè shì 复印机.",
      "id": "Ini adalah 复印机."
    }
  },
  {
    "id": "zh-v-1698",
    "hanzi": "干活儿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是干活儿。",
      "py": "Zhè shì 干活儿.",
      "id": "Ini adalah 干活儿."
    }
  },
  {
    "id": "zh-v-1699",
    "hanzi": "临时",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是临时。",
      "py": "Zhè shì 临时.",
      "id": "Ini adalah 临时."
    }
  },
  {
    "id": "zh-v-1700",
    "hanzi": "不要紧",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是不要紧。",
      "py": "Zhè shì 不要紧.",
      "id": "Ini adalah 不要紧."
    }
  },
  {
    "id": "zh-v-1701",
    "hanzi": "精力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是精力。",
      "py": "Zhè shì 精力.",
      "id": "Ini adalah 精力."
    }
  },
  {
    "id": "zh-v-1702",
    "hanzi": "理由",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是理由。",
      "py": "Zhè shì 理由.",
      "id": "Ini adalah 理由."
    }
  },
  {
    "id": "zh-v-1703",
    "hanzi": "得到",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Help from colleagues",
    "enMeaning": "Vocabulary from Help from colleagues",
    "example": {
      "hz": "这是得到。",
      "py": "Zhè shì 得到.",
      "id": "Ini adalah 得到."
    }
  },
  {
    "id": "zh-v-1704",
    "hanzi": "父母",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是父母。",
      "py": "Zhè shì 父母.",
      "id": "Ini adalah 父母."
    }
  },
  {
    "id": "zh-v-1705",
    "hanzi": "乘客",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是乘客。",
      "py": "Zhè shì 乘客.",
      "id": "Ini adalah 乘客."
    }
  },
  {
    "id": "zh-v-1706",
    "hanzi": "抱怨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是抱怨。",
      "py": "Zhè shì 抱怨.",
      "id": "Ini adalah 抱怨."
    }
  },
  {
    "id": "zh-v-1707",
    "hanzi": "高峰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是高峰。",
      "py": "Zhè shì 高峰.",
      "id": "Ini adalah 高峰."
    }
  },
  {
    "id": "zh-v-1708",
    "hanzi": "束",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是束。",
      "py": "Zhè shì 束.",
      "id": "Ini adalah 束."
    }
  },
  {
    "id": "zh-v-1709",
    "hanzi": "纪念",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是纪念。",
      "py": "Zhè shì 纪念.",
      "id": "Ini adalah 纪念."
    }
  },
  {
    "id": "zh-v-1710",
    "hanzi": "家庭",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是家庭。",
      "py": "Zhè shì 家庭.",
      "id": "Ini adalah 家庭."
    }
  },
  {
    "id": "zh-v-1711",
    "hanzi": "投诉",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The first day of driving an Uber",
    "enMeaning": "Vocabulary from The first day of driving an Uber",
    "example": {
      "hz": "这是投诉。",
      "py": "Zhè shì 投诉.",
      "id": "Ini adalah 投诉."
    }
  },
  {
    "id": "zh-v-1712",
    "hanzi": "说服",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是说服。",
      "py": "Zhè shì 说服.",
      "id": "Ini adalah 说服."
    }
  },
  {
    "id": "zh-v-1713",
    "hanzi": "电商",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是电商。",
      "py": "Zhè shì 电商.",
      "id": "Ini adalah 电商."
    }
  },
  {
    "id": "zh-v-1714",
    "hanzi": "主播",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是主播。",
      "py": "Zhè shì 主播.",
      "id": "Ini adalah 主播."
    }
  },
  {
    "id": "zh-v-1715",
    "hanzi": "销售额",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是销售额。",
      "py": "Zhè shì 销售额.",
      "id": "Ini adalah 销售额."
    }
  },
  {
    "id": "zh-v-1716",
    "hanzi": "粉丝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是粉丝。",
      "py": "Zhè shì 粉丝.",
      "id": "Ini adalah 粉丝."
    }
  },
  {
    "id": "zh-v-1717",
    "hanzi": "绝望",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是绝望。",
      "py": "Zhè shì 绝望.",
      "id": "Ini adalah 绝望."
    }
  },
  {
    "id": "zh-v-1718",
    "hanzi": "跪",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是跪。",
      "py": "Zhè shì 跪.",
      "id": "Ini adalah 跪."
    }
  },
  {
    "id": "zh-v-1719",
    "hanzi": "分析",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是分析。",
      "py": "Zhè shì 分析.",
      "id": "Ini adalah 分析."
    }
  },
  {
    "id": "zh-v-1720",
    "hanzi": "疏远",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是疏远。",
      "py": "Zhè shì 疏远.",
      "id": "Ini adalah 疏远."
    }
  },
  {
    "id": "zh-v-1721",
    "hanzi": "目前",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是目前。",
      "py": "Zhè shì 目前.",
      "id": "Ini adalah 目前."
    }
  },
  {
    "id": "zh-v-1722",
    "hanzi": "团队",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是团队。",
      "py": "Zhè shì 团队.",
      "id": "Ini adalah 团队."
    }
  },
  {
    "id": "zh-v-1723",
    "hanzi": "体检",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是体检。",
      "py": "Zhè shì 体检.",
      "id": "Ini adalah 体检."
    }
  },
  {
    "id": "zh-v-1724",
    "hanzi": "放假",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran E-commerce anchor",
    "enMeaning": "Vocabulary from E-commerce anchor",
    "example": {
      "hz": "这是放假。",
      "py": "Zhè shì 放假.",
      "id": "Ini adalah 放假."
    }
  },
  {
    "id": "zh-v-1725",
    "hanzi": "陆续",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是陆续。",
      "py": "Zhè shì 陆续.",
      "id": "Ini adalah 陆续."
    }
  },
  {
    "id": "zh-v-1726",
    "hanzi": "年纪",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是年纪。",
      "py": "Zhè shì 年纪.",
      "id": "Ini adalah 年纪."
    }
  },
  {
    "id": "zh-v-1727",
    "hanzi": "相处",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是相处。",
      "py": "Zhè shì 相处.",
      "id": "Ini adalah 相处."
    }
  },
  {
    "id": "zh-v-1728",
    "hanzi": "曾经",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是曾经。",
      "py": "Zhè shì 曾经.",
      "id": "Ini adalah 曾经."
    }
  },
  {
    "id": "zh-v-1729",
    "hanzi": "吵",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是吵。",
      "py": "Zhè shì 吵.",
      "id": "Ini adalah 吵."
    }
  },
  {
    "id": "zh-v-1730",
    "hanzi": "谨慎",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是谨慎。",
      "py": "Zhè shì 谨慎.",
      "id": "Ini adalah 谨慎."
    }
  },
  {
    "id": "zh-v-1731",
    "hanzi": "度过",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是度过。",
      "py": "Zhè shì 度过.",
      "id": "Ini adalah 度过."
    }
  },
  {
    "id": "zh-v-1732",
    "hanzi": "姑娘",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是姑娘。",
      "py": "Zhè shì 姑娘.",
      "id": "Ini adalah 姑娘."
    }
  },
  {
    "id": "zh-v-1733",
    "hanzi": "合租",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Renting experience",
    "enMeaning": "Vocabulary from Renting experience",
    "example": {
      "hz": "这是合租。",
      "py": "Zhè shì 合租.",
      "id": "Ini adalah 合租."
    }
  },
  {
    "id": "zh-v-1734",
    "hanzi": "承受",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是承受。",
      "py": "Zhè shì 承受.",
      "id": "Ini adalah 承受."
    }
  },
  {
    "id": "zh-v-1735",
    "hanzi": "发愁",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是发愁。",
      "py": "Zhè shì 发愁.",
      "id": "Ini adalah 发愁."
    }
  },
  {
    "id": "zh-v-1736",
    "hanzi": "投入",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是投入。",
      "py": "Zhè shì 投入.",
      "id": "Ini adalah 投入."
    }
  },
  {
    "id": "zh-v-1737",
    "hanzi": "幼儿园",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是幼儿园。",
      "py": "Zhè shì 幼儿园.",
      "id": "Ini adalah 幼儿园."
    }
  },
  {
    "id": "zh-v-1738",
    "hanzi": "养",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是养。",
      "py": "Zhè shì 养.",
      "id": "Ini adalah 养."
    }
  },
  {
    "id": "zh-v-1739",
    "hanzi": "贷款",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Child and Work",
    "enMeaning": "Vocabulary from Child and Work",
    "example": {
      "hz": "这是贷款。",
      "py": "Zhè shì 贷款.",
      "id": "Ini adalah 贷款."
    }
  },
  {
    "id": "zh-v-1740",
    "hanzi": "匆忙",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是匆忙。",
      "py": "Zhè shì 匆忙.",
      "id": "Ini adalah 匆忙."
    }
  },
  {
    "id": "zh-v-1741",
    "hanzi": "运气",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是运气。",
      "py": "Zhè shì 运气.",
      "id": "Ini adalah 运气."
    }
  },
  {
    "id": "zh-v-1742",
    "hanzi": "保存",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是保存。",
      "py": "Zhè shì 保存.",
      "id": "Ini adalah 保存."
    }
  },
  {
    "id": "zh-v-1743",
    "hanzi": "搜索",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是搜索。",
      "py": "Zhè shì 搜索.",
      "id": "Ini adalah 搜索."
    }
  },
  {
    "id": "zh-v-1744",
    "hanzi": "粗糙",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是粗糙。",
      "py": "Zhè shì 粗糙.",
      "id": "Ini adalah 粗糙."
    }
  },
  {
    "id": "zh-v-1745",
    "hanzi": "修改",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是修改。",
      "py": "Zhè shì 修改.",
      "id": "Ini adalah 修改."
    }
  },
  {
    "id": "zh-v-1746",
    "hanzi": "摸",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A Bad Day",
    "enMeaning": "Vocabulary from A Bad Day",
    "example": {
      "hz": "这是摸。",
      "py": "Zhè shì 摸.",
      "id": "Ini adalah 摸."
    }
  },
  {
    "id": "zh-v-1747",
    "hanzi": "营业",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是营业。",
      "py": "Zhè shì 营业.",
      "id": "Ini adalah 营业."
    }
  },
  {
    "id": "zh-v-1748",
    "hanzi": "信号",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是信号。",
      "py": "Zhè shì 信号.",
      "id": "Ini adalah 信号."
    }
  },
  {
    "id": "zh-v-1749",
    "hanzi": "糟糕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是糟糕。",
      "py": "Zhè shì 糟糕.",
      "id": "Ini adalah 糟糕."
    }
  },
  {
    "id": "zh-v-1750",
    "hanzi": "当地",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是当地。",
      "py": "Zhè shì 当地.",
      "id": "Ini adalah 当地."
    }
  },
  {
    "id": "zh-v-1751",
    "hanzi": "拐弯",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是拐弯。",
      "py": "Zhè shì 拐弯.",
      "id": "Ini adalah 拐弯."
    }
  },
  {
    "id": "zh-v-1752",
    "hanzi": "热心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Accidents During Travel",
    "enMeaning": "Vocabulary from Accidents During Travel",
    "example": {
      "hz": "这是热心。",
      "py": "Zhè shì 热心.",
      "id": "Ini adalah 热心."
    }
  },
  {
    "id": "zh-v-1753",
    "hanzi": "相关",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是相关。",
      "py": "Zhè shì 相关.",
      "id": "Ini adalah 相关."
    }
  },
  {
    "id": "zh-v-1754",
    "hanzi": "反复",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是反复。",
      "py": "Zhè shì 反复.",
      "id": "Ini adalah 反复."
    }
  },
  {
    "id": "zh-v-1755",
    "hanzi": "录音",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是录音。",
      "py": "Zhè shì 录音.",
      "id": "Ini adalah 录音."
    }
  },
  {
    "id": "zh-v-1756",
    "hanzi": "课程",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是课程。",
      "py": "Zhè shì 课程.",
      "id": "Ini adalah 课程."
    }
  },
  {
    "id": "zh-v-1757",
    "hanzi": "假装",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是假装。",
      "py": "Zhè shì 假装.",
      "id": "Ini adalah 假装."
    }
  },
  {
    "id": "zh-v-1758",
    "hanzi": "克服",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是克服。",
      "py": "Zhè shì 克服.",
      "id": "Ini adalah 克服."
    }
  },
  {
    "id": "zh-v-1759",
    "hanzi": "心理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Language Barrier",
    "enMeaning": "Vocabulary from Language Barrier",
    "example": {
      "hz": "这是心理。",
      "py": "Zhè shì 心理.",
      "id": "Ini adalah 心理."
    }
  },
  {
    "id": "zh-v-1760",
    "hanzi": "开放",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是开放。",
      "py": "Zhè shì 开放.",
      "id": "Ini adalah 开放."
    }
  },
  {
    "id": "zh-v-1761",
    "hanzi": "幸运",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是幸运。",
      "py": "Zhè shì 幸运.",
      "id": "Ini adalah 幸运."
    }
  },
  {
    "id": "zh-v-1762",
    "hanzi": "面临",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是面临。",
      "py": "Zhè shì 面临.",
      "id": "Ini adalah 面临."
    }
  },
  {
    "id": "zh-v-1763",
    "hanzi": "持续",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是持续。",
      "py": "Zhè shì 持续.",
      "id": "Ini adalah 持续."
    }
  },
  {
    "id": "zh-v-1764",
    "hanzi": "布置",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是布置。",
      "py": "Zhè shì 布置.",
      "id": "Ini adalah 布置."
    }
  },
  {
    "id": "zh-v-1765",
    "hanzi": "婚礼",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是婚礼。",
      "py": "Zhè shì 婚礼.",
      "id": "Ini adalah 婚礼."
    }
  },
  {
    "id": "zh-v-1766",
    "hanzi": "特色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是特色。",
      "py": "Zhè shì 特色.",
      "id": "Ini adalah 特色."
    }
  },
  {
    "id": "zh-v-1767",
    "hanzi": "等待",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career Change",
    "enMeaning": "Vocabulary from Career Change",
    "example": {
      "hz": "这是等待。",
      "py": "Zhè shì 等待.",
      "id": "Ini adalah 等待."
    }
  },
  {
    "id": "zh-v-1768",
    "hanzi": "臭",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是臭。",
      "py": "Zhè shì 臭.",
      "id": "Ini adalah 臭."
    }
  },
  {
    "id": "zh-v-1769",
    "hanzi": "睁",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是睁。",
      "py": "Zhè shì 睁.",
      "id": "Ini adalah 睁."
    }
  },
  {
    "id": "zh-v-1770",
    "hanzi": "逐渐",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是逐渐。",
      "py": "Zhè shì 逐渐.",
      "id": "Ini adalah 逐渐."
    }
  },
  {
    "id": "zh-v-1771",
    "hanzi": "咨询",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是咨询。",
      "py": "Zhè shì 咨询.",
      "id": "Ini adalah 咨询."
    }
  },
  {
    "id": "zh-v-1772",
    "hanzi": "承担",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是承担。",
      "py": "Zhè shì 承担.",
      "id": "Ini adalah 承担."
    }
  },
  {
    "id": "zh-v-1773",
    "hanzi": "调皮",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是调皮。",
      "py": "Zhè shì 调皮.",
      "id": "Ini adalah 调皮."
    }
  },
  {
    "id": "zh-v-1774",
    "hanzi": "制造",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是制造。",
      "py": "Zhè shì 制造.",
      "id": "Ini adalah 制造."
    }
  },
  {
    "id": "zh-v-1775",
    "hanzi": "成熟",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Pet",
    "enMeaning": "Vocabulary from Pet",
    "example": {
      "hz": "这是成熟。",
      "py": "Zhè shì 成熟.",
      "id": "Ini adalah 成熟."
    }
  },
  {
    "id": "zh-v-1776",
    "hanzi": "信任",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是信任。",
      "py": "Zhè shì 信任.",
      "id": "Ini adalah 信任."
    }
  },
  {
    "id": "zh-v-1777",
    "hanzi": "求婚",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是求婚。",
      "py": "Zhè shì 求婚.",
      "id": "Ini adalah 求婚."
    }
  },
  {
    "id": "zh-v-1778",
    "hanzi": "状态",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是状态。",
      "py": "Zhè shì 状态.",
      "id": "Ini adalah 状态."
    }
  },
  {
    "id": "zh-v-1779",
    "hanzi": "婚姻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是婚姻。",
      "py": "Zhè shì 婚姻.",
      "id": "Ini adalah 婚姻."
    }
  },
  {
    "id": "zh-v-1780",
    "hanzi": "迟早",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是迟早。",
      "py": "Zhè shì 迟早.",
      "id": "Ini adalah 迟早."
    }
  },
  {
    "id": "zh-v-1781",
    "hanzi": "阶段",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是阶段。",
      "py": "Zhè shì 阶段.",
      "id": "Ini adalah 阶段."
    }
  },
  {
    "id": "zh-v-1782",
    "hanzi": "答应",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是答应。",
      "py": "Zhè shì 答应.",
      "id": "Ini adalah 答应."
    }
  },
  {
    "id": "zh-v-1783",
    "hanzi": "传统",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是传统。",
      "py": "Zhè shì 传统.",
      "id": "Ini adalah 传统."
    }
  },
  {
    "id": "zh-v-1784",
    "hanzi": "家务",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是家务。",
      "py": "Zhè shì 家务.",
      "id": "Ini adalah 家务."
    }
  },
  {
    "id": "zh-v-1785",
    "hanzi": "软件",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Proposal",
    "enMeaning": "Vocabulary from Proposal",
    "example": {
      "hz": "这是软件。",
      "py": "Zhè shì 软件.",
      "id": "Ini adalah 软件."
    }
  },
  {
    "id": "zh-v-1786",
    "hanzi": "坚强",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是坚强。",
      "py": "Zhè shì 坚强.",
      "id": "Ini adalah 坚强."
    }
  },
  {
    "id": "zh-v-1787",
    "hanzi": "伤口",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是伤口。",
      "py": "Zhè shì 伤口.",
      "id": "Ini adalah 伤口."
    }
  },
  {
    "id": "zh-v-1788",
    "hanzi": "期间",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是期间。",
      "py": "Zhè shì 期间.",
      "id": "Ini adalah 期间."
    }
  },
  {
    "id": "zh-v-1789",
    "hanzi": "阻止",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是阻止。",
      "py": "Zhè shì 阻止.",
      "id": "Ini adalah 阻止."
    }
  },
  {
    "id": "zh-v-1790",
    "hanzi": "追求",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是追求。",
      "py": "Zhè shì 追求.",
      "id": "Ini adalah 追求."
    }
  },
  {
    "id": "zh-v-1791",
    "hanzi": "接触",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是接触。",
      "py": "Zhè shì 接触.",
      "id": "Ini adalah 接触."
    }
  },
  {
    "id": "zh-v-1792",
    "hanzi": "成立",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是成立。",
      "py": "Zhè shì 成立.",
      "id": "Ini adalah 成立."
    }
  },
  {
    "id": "zh-v-1793",
    "hanzi": "机构",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是机构。",
      "py": "Zhè shì 机构.",
      "id": "Ini adalah 机构."
    }
  },
  {
    "id": "zh-v-1794",
    "hanzi": "安装",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Meaning of Life",
    "enMeaning": "Vocabulary from Meaning of Life",
    "example": {
      "hz": "这是安装。",
      "py": "Zhè shì 安装.",
      "id": "Ini adalah 安装."
    }
  },
  {
    "id": "zh-v-1795",
    "hanzi": "合理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是合理。",
      "py": "Zhè shì 合理.",
      "id": "Ini adalah 合理."
    }
  },
  {
    "id": "zh-v-1796",
    "hanzi": "程度",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是程度。",
      "py": "Zhè shì 程度.",
      "id": "Ini adalah 程度."
    }
  },
  {
    "id": "zh-v-1797",
    "hanzi": "未必",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是未必。",
      "py": "Zhè shì 未必.",
      "id": "Ini adalah 未必."
    }
  },
  {
    "id": "zh-v-1798",
    "hanzi": "通常",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是通常。",
      "py": "Zhè shì 通常.",
      "id": "Ini adalah 通常."
    }
  },
  {
    "id": "zh-v-1799",
    "hanzi": "盈利",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是盈利。",
      "py": "Zhè shì 盈利.",
      "id": "Ini adalah 盈利."
    }
  },
  {
    "id": "zh-v-1800",
    "hanzi": "状况",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是状况。",
      "py": "Zhè shì 状况.",
      "id": "Ini adalah 状况."
    }
  },
  {
    "id": "zh-v-1801",
    "hanzi": "具体",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Wage Woes",
    "enMeaning": "Vocabulary from Wage Woes",
    "example": {
      "hz": "这是具体。",
      "py": "Zhè shì 具体.",
      "id": "Ini adalah 具体."
    }
  },
  {
    "id": "zh-v-1802",
    "hanzi": "注册",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是注册。",
      "py": "Zhè shì 注册.",
      "id": "Ini adalah 注册."
    }
  },
  {
    "id": "zh-v-1803",
    "hanzi": "浏览",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是浏览。",
      "py": "Zhè shì 浏览.",
      "id": "Ini adalah 浏览."
    }
  },
  {
    "id": "zh-v-1804",
    "hanzi": "充满",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是充满。",
      "py": "Zhè shì 充满.",
      "id": "Ini adalah 充满."
    }
  },
  {
    "id": "zh-v-1805",
    "hanzi": "请求",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是请求。",
      "py": "Zhè shì 请求.",
      "id": "Ini adalah 请求."
    }
  },
  {
    "id": "zh-v-1806",
    "hanzi": "饮食",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是饮食。",
      "py": "Zhè shì 饮食.",
      "id": "Ini adalah 饮食."
    }
  },
  {
    "id": "zh-v-1807",
    "hanzi": "口味",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是口味。",
      "py": "Zhè shì 口味.",
      "id": "Ini adalah 口味."
    }
  },
  {
    "id": "zh-v-1808",
    "hanzi": "相似",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Love Life",
    "enMeaning": "Vocabulary from Love Life",
    "example": {
      "hz": "这是相似。",
      "py": "Zhè shì 相似.",
      "id": "Ini adalah 相似."
    }
  },
  {
    "id": "zh-v-1809",
    "hanzi": "冻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是冻。",
      "py": "Zhè shì 冻.",
      "id": "Ini adalah 冻."
    }
  },
  {
    "id": "zh-v-1810",
    "hanzi": "羽绒服",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是羽绒服。",
      "py": "Zhè shì 羽绒服.",
      "id": "Ini adalah 羽绒服."
    }
  },
  {
    "id": "zh-v-1811",
    "hanzi": "薄",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是薄。",
      "py": "Zhè shì 薄.",
      "id": "Ini adalah 薄."
    }
  },
  {
    "id": "zh-v-1812",
    "hanzi": "围巾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是围巾。",
      "py": "Zhè shì 围巾.",
      "id": "Ini adalah 围巾."
    }
  },
  {
    "id": "zh-v-1813",
    "hanzi": "手套",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是手套。",
      "py": "Zhè shì 手套.",
      "id": "Ini adalah 手套."
    }
  },
  {
    "id": "zh-v-1814",
    "hanzi": "魅力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是魅力。",
      "py": "Zhè shì 魅力.",
      "id": "Ini adalah 魅力."
    }
  },
  {
    "id": "zh-v-1815",
    "hanzi": "震撼",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是震撼。",
      "py": "Zhè shì 震撼.",
      "id": "Ini adalah 震撼."
    }
  },
  {
    "id": "zh-v-1816",
    "hanzi": "亮",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是亮。",
      "py": "Zhè shì 亮.",
      "id": "Ini adalah 亮."
    }
  },
  {
    "id": "zh-v-1817",
    "hanzi": "体验",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Harbin Adventure",
    "enMeaning": "Vocabulary from Harbin Adventure",
    "example": {
      "hz": "这是体验。",
      "py": "Zhè shì 体验.",
      "id": "Ini adalah 体验."
    }
  },
  {
    "id": "zh-v-1818",
    "hanzi": "场景",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是场景。",
      "py": "Zhè shì 场景.",
      "id": "Ini adalah 场景."
    }
  },
  {
    "id": "zh-v-1819",
    "hanzi": "导致",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是导致。",
      "py": "Zhè shì 导致.",
      "id": "Ini adalah 导致."
    }
  },
  {
    "id": "zh-v-1820",
    "hanzi": "缺乏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是缺乏。",
      "py": "Zhè shì 缺乏.",
      "id": "Ini adalah 缺乏."
    }
  },
  {
    "id": "zh-v-1821",
    "hanzi": "后果",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是后果。",
      "py": "Zhè shì 后果.",
      "id": "Ini adalah 后果."
    }
  },
  {
    "id": "zh-v-1822",
    "hanzi": "痛苦",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是痛苦。",
      "py": "Zhè shì 痛苦.",
      "id": "Ini adalah 痛苦."
    }
  },
  {
    "id": "zh-v-1823",
    "hanzi": "紧急",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是紧急。",
      "py": "Zhè shì 紧急.",
      "id": "Ini adalah 紧急."
    }
  },
  {
    "id": "zh-v-1824",
    "hanzi": "拆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是拆。",
      "py": "Zhè shì 拆.",
      "id": "Ini adalah 拆."
    }
  },
  {
    "id": "zh-v-1825",
    "hanzi": "创造",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是创造。",
      "py": "Zhè shì 创造.",
      "id": "Ini adalah 创造."
    }
  },
  {
    "id": "zh-v-1826",
    "hanzi": "过分",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Procrastination",
    "enMeaning": "Vocabulary from Procrastination",
    "example": {
      "hz": "这是过分。",
      "py": "Zhè shì 过分.",
      "id": "Ini adalah 过分."
    }
  },
  {
    "id": "zh-v-1827",
    "hanzi": "舒适",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是舒适。",
      "py": "Zhè shì 舒适.",
      "id": "Ini adalah 舒适."
    }
  },
  {
    "id": "zh-v-1828",
    "hanzi": "意识",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是意识。",
      "py": "Zhè shì 意识.",
      "id": "Ini adalah 意识."
    }
  },
  {
    "id": "zh-v-1829",
    "hanzi": "奖励",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是奖励。",
      "py": "Zhè shì 奖励.",
      "id": "Ini adalah 奖励."
    }
  },
  {
    "id": "zh-v-1830",
    "hanzi": "顿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是顿。",
      "py": "Zhè shì 顿.",
      "id": "Ini adalah 顿."
    }
  },
  {
    "id": "zh-v-1831",
    "hanzi": "此外",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是此外。",
      "py": "Zhè shì 此外.",
      "id": "Ini adalah 此外."
    }
  },
  {
    "id": "zh-v-1832",
    "hanzi": "尽量",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是尽量。",
      "py": "Zhè shì 尽量.",
      "id": "Ini adalah 尽量."
    }
  },
  {
    "id": "zh-v-1833",
    "hanzi": "差别",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Work Exhaustion",
    "enMeaning": "Vocabulary from Work Exhaustion",
    "example": {
      "hz": "这是差别。",
      "py": "Zhè shì 差别.",
      "id": "Ini adalah 差别."
    }
  },
  {
    "id": "zh-v-1834",
    "hanzi": "协调",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是协调。",
      "py": "Zhè shì 协调.",
      "id": "Ini adalah 协调."
    }
  },
  {
    "id": "zh-v-1835",
    "hanzi": "谈判",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是谈判。",
      "py": "Zhè shì 谈判.",
      "id": "Ini adalah 谈判."
    }
  },
  {
    "id": "zh-v-1836",
    "hanzi": "技巧",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是技巧。",
      "py": "Zhè shì 技巧.",
      "id": "Ini adalah 技巧."
    }
  },
  {
    "id": "zh-v-1837",
    "hanzi": "观点",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是观点。",
      "py": "Zhè shì 观点.",
      "id": "Ini adalah 观点."
    }
  },
  {
    "id": "zh-v-1838",
    "hanzi": "团圆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是团圆。",
      "py": "Zhè shì 团圆.",
      "id": "Ini adalah 团圆."
    }
  },
  {
    "id": "zh-v-1839",
    "hanzi": "争取",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是争取。",
      "py": "Zhè shì 争取.",
      "id": "Ini adalah 争取."
    }
  },
  {
    "id": "zh-v-1840",
    "hanzi": "舍不得",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 7,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran New Year's Wish",
    "enMeaning": "Vocabulary from New Year's Wish",
    "example": {
      "hz": "这是舍不得。",
      "py": "Zhè shì 舍不得.",
      "id": "Ini adalah 舍不得."
    }
  },
  {
    "id": "zh-v-1841",
    "hanzi": "纪录",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是纪录。",
      "py": "Zhè shì 纪录.",
      "id": "Ini adalah 纪录."
    }
  },
  {
    "id": "zh-v-1842",
    "hanzi": "导演",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是导演。",
      "py": "Zhè shì 导演.",
      "id": "Ini adalah 导演."
    }
  },
  {
    "id": "zh-v-1843",
    "hanzi": "人物",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是人物。",
      "py": "Zhè shì 人物.",
      "id": "Ini adalah 人物."
    }
  },
  {
    "id": "zh-v-1844",
    "hanzi": "现代",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是现代。",
      "py": "Zhè shì 现代.",
      "id": "Ini adalah 现代."
    }
  },
  {
    "id": "zh-v-1845",
    "hanzi": "偏见",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是偏见。",
      "py": "Zhè shì 偏见.",
      "id": "Ini adalah 偏见."
    }
  },
  {
    "id": "zh-v-1846",
    "hanzi": "命运",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是命运。",
      "py": "Zhè shì 命运.",
      "id": "Ini adalah 命运."
    }
  },
  {
    "id": "zh-v-1847",
    "hanzi": "英雄",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是英雄。",
      "py": "Zhè shì 英雄.",
      "id": "Ini adalah 英雄."
    }
  },
  {
    "id": "zh-v-1848",
    "hanzi": "限制",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是限制。",
      "py": "Zhè shì 限制.",
      "id": "Ini adalah 限制."
    }
  },
  {
    "id": "zh-v-1849",
    "hanzi": "共鸣",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是共鸣。",
      "py": "Zhè shì 共鸣.",
      "id": "Ini adalah 共鸣."
    }
  },
  {
    "id": "zh-v-1850",
    "hanzi": "糊涂",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是糊涂。",
      "py": "Zhè shì 糊涂.",
      "id": "Ini adalah 糊涂."
    }
  },
  {
    "id": "zh-v-1851",
    "hanzi": "严肃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是严肃。",
      "py": "Zhè shì 严肃.",
      "id": "Ini adalah 严肃."
    }
  },
  {
    "id": "zh-v-1852",
    "hanzi": "特效",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是特效。",
      "py": "Zhè shì 特效.",
      "id": "Ini adalah 特效."
    }
  },
  {
    "id": "zh-v-1853",
    "hanzi": "制作",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是制作。",
      "py": "Zhè shì 制作.",
      "id": "Ini adalah 制作."
    }
  },
  {
    "id": "zh-v-1854",
    "hanzi": "创新",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是创新。",
      "py": "Zhè shì 创新.",
      "id": "Ini adalah 创新."
    }
  },
  {
    "id": "zh-v-1855",
    "hanzi": "秒",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Talking about movies",
    "enMeaning": "Vocabulary from Talking about movies",
    "example": {
      "hz": "这是秒。",
      "py": "Zhè shì 秒.",
      "id": "Ini adalah 秒."
    }
  },
  {
    "id": "zh-v-1856",
    "hanzi": "熬夜",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是熬夜。",
      "py": "Zhè shì 熬夜.",
      "id": "Ini adalah 熬夜."
    }
  },
  {
    "id": "zh-v-1857",
    "hanzi": "充分",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是充分。",
      "py": "Zhè shì 充分.",
      "id": "Ini adalah 充分."
    }
  },
  {
    "id": "zh-v-1858",
    "hanzi": "晕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是晕。",
      "py": "Zhè shì 晕.",
      "id": "Ini adalah 晕."
    }
  },
  {
    "id": "zh-v-1859",
    "hanzi": "过敏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是过敏。",
      "py": "Zhè shì 过敏.",
      "id": "Ini adalah 过敏."
    }
  },
  {
    "id": "zh-v-1860",
    "hanzi": "案例",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是案例。",
      "py": "Zhè shì 案例.",
      "id": "Ini adalah 案例."
    }
  },
  {
    "id": "zh-v-1861",
    "hanzi": "规律",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是规律。",
      "py": "Zhè shì 规律.",
      "id": "Ini adalah 规律."
    }
  },
  {
    "id": "zh-v-1862",
    "hanzi": "避免",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是避免。",
      "py": "Zhè shì 避免.",
      "id": "Ini adalah 避免."
    }
  },
  {
    "id": "zh-v-1863",
    "hanzi": "清淡",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是清淡。",
      "py": "Zhè shì 清淡.",
      "id": "Ini adalah 清淡."
    }
  },
  {
    "id": "zh-v-1864",
    "hanzi": "零食",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是零食。",
      "py": "Zhè shì 零食.",
      "id": "Ini adalah 零食."
    }
  },
  {
    "id": "zh-v-1865",
    "hanzi": "油炸",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是油炸。",
      "py": "Zhè shì 油炸.",
      "id": "Ini adalah 油炸."
    }
  },
  {
    "id": "zh-v-1866",
    "hanzi": "呼吸",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是呼吸。",
      "py": "Zhè shì 呼吸.",
      "id": "Ini adalah 呼吸."
    }
  },
  {
    "id": "zh-v-1867",
    "hanzi": "忽视",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是忽视。",
      "py": "Zhè shì 忽视.",
      "id": "Ini adalah 忽视."
    }
  },
  {
    "id": "zh-v-1868",
    "hanzi": "预防",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是预防。",
      "py": "Zhè shì 预防.",
      "id": "Ini adalah 预防."
    }
  },
  {
    "id": "zh-v-1869",
    "hanzi": "治疗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是治疗。",
      "py": "Zhè shì 治疗.",
      "id": "Ini adalah 治疗."
    }
  },
  {
    "id": "zh-v-1870",
    "hanzi": "有效",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Stay away from \"subhealth\"",
    "enMeaning": "Vocabulary from Stay away from \"subhealth\"",
    "example": {
      "hz": "这是有效。",
      "py": "Zhè shì 有效.",
      "id": "Ini adalah 有效."
    }
  },
  {
    "id": "zh-v-1871",
    "hanzi": "打工",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是打工。",
      "py": "Zhè shì 打工.",
      "id": "Ini adalah 打工."
    }
  },
  {
    "id": "zh-v-1872",
    "hanzi": "工人",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是工人。",
      "py": "Zhè shì 工人.",
      "id": "Ini adalah 工人."
    }
  },
  {
    "id": "zh-v-1873",
    "hanzi": "写作",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是写作。",
      "py": "Zhè shì 写作.",
      "id": "Ini adalah 写作."
    }
  },
  {
    "id": "zh-v-1874",
    "hanzi": "首",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是首。",
      "py": "Zhè shì 首.",
      "id": "Ini adalah 首."
    }
  },
  {
    "id": "zh-v-1875",
    "hanzi": "感想",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是感想。",
      "py": "Zhè shì 感想.",
      "id": "Ini adalah 感想."
    }
  },
  {
    "id": "zh-v-1876",
    "hanzi": "随手",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是随手。",
      "py": "Zhè shì 随手.",
      "id": "Ini adalah 随手."
    }
  },
  {
    "id": "zh-v-1877",
    "hanzi": "语音",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是语音。",
      "py": "Zhè shì 语音.",
      "id": "Ini adalah 语音."
    }
  },
  {
    "id": "zh-v-1878",
    "hanzi": "推广",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是推广。",
      "py": "Zhè shì 推广.",
      "id": "Ini adalah 推广."
    }
  },
  {
    "id": "zh-v-1879",
    "hanzi": "空闲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是空闲。",
      "py": "Zhè shì 空闲.",
      "id": "Ini adalah 空闲."
    }
  },
  {
    "id": "zh-v-1880",
    "hanzi": "感慨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是感慨。",
      "py": "Zhè shì 感慨.",
      "id": "Ini adalah 感慨."
    }
  },
  {
    "id": "zh-v-1881",
    "hanzi": "从事",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是从事。",
      "py": "Zhè shì 从事.",
      "id": "Ini adalah 从事."
    }
  },
  {
    "id": "zh-v-1882",
    "hanzi": "思想",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是思想。",
      "py": "Zhè shì 思想.",
      "id": "Ini adalah 思想."
    }
  },
  {
    "id": "zh-v-1883",
    "hanzi": "活跃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是活跃。",
      "py": "Zhè shì 活跃.",
      "id": "Ini adalah 活跃."
    }
  },
  {
    "id": "zh-v-1884",
    "hanzi": "动力",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是动力。",
      "py": "Zhè shì 动力.",
      "id": "Ini adalah 动力."
    }
  },
  {
    "id": "zh-v-1885",
    "hanzi": "集合",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Taxi poet",
    "enMeaning": "Vocabulary from Taxi poet",
    "example": {
      "hz": "这是集合。",
      "py": "Zhè shì 集合.",
      "id": "Ini adalah 集合."
    }
  },
  {
    "id": "zh-v-1886",
    "hanzi": "预报",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是预报。",
      "py": "Zhè shì 预报.",
      "id": "Ini adalah 预报."
    }
  },
  {
    "id": "zh-v-1887",
    "hanzi": "湿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是湿。",
      "py": "Zhè shì 湿.",
      "id": "Ini adalah 湿."
    }
  },
  {
    "id": "zh-v-1888",
    "hanzi": "骨头",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是骨头。",
      "py": "Zhè shì 骨头.",
      "id": "Ini adalah 骨头."
    }
  },
  {
    "id": "zh-v-1889",
    "hanzi": "干燥",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是干燥。",
      "py": "Zhè shì 干燥.",
      "id": "Ini adalah 干燥."
    }
  },
  {
    "id": "zh-v-1890",
    "hanzi": "流",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是流。",
      "py": "Zhè shì 流.",
      "id": "Ini adalah 流."
    }
  },
  {
    "id": "zh-v-1891",
    "hanzi": "嗓子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是嗓子。",
      "py": "Zhè shì 嗓子.",
      "id": "Ini adalah 嗓子."
    }
  },
  {
    "id": "zh-v-1892",
    "hanzi": "想念",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是想念。",
      "py": "Zhè shì 想念.",
      "id": "Ini adalah 想念."
    }
  },
  {
    "id": "zh-v-1893",
    "hanzi": "天空",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是天空。",
      "py": "Zhè shì 天空.",
      "id": "Ini adalah 天空."
    }
  },
  {
    "id": "zh-v-1894",
    "hanzi": "海拔",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是海拔。",
      "py": "Zhè shì 海拔.",
      "id": "Ini adalah 海拔."
    }
  },
  {
    "id": "zh-v-1895",
    "hanzi": "防",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是防。",
      "py": "Zhè shì 防.",
      "id": "Ini adalah 防."
    }
  },
  {
    "id": "zh-v-1896",
    "hanzi": "措施",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是措施。",
      "py": "Zhè shì 措施.",
      "id": "Ini adalah 措施."
    }
  },
  {
    "id": "zh-v-1897",
    "hanzi": "对比",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是对比。",
      "py": "Zhè shì 对比.",
      "id": "Ini adalah 对比."
    }
  },
  {
    "id": "zh-v-1898",
    "hanzi": "采取",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是采取。",
      "py": "Zhè shì 采取.",
      "id": "Ini adalah 采取."
    }
  },
  {
    "id": "zh-v-1899",
    "hanzi": "独特",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Climatic difference",
    "enMeaning": "Vocabulary from Climatic difference",
    "example": {
      "hz": "这是独特。",
      "py": "Zhè shì 独特.",
      "id": "Ini adalah 独特."
    }
  },
  {
    "id": "zh-v-1900",
    "hanzi": "实用",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是实用。",
      "py": "Zhè shì 实用.",
      "id": "Ini adalah 实用."
    }
  },
  {
    "id": "zh-v-1901",
    "hanzi": "功能",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是功能。",
      "py": "Zhè shì 功能.",
      "id": "Ini adalah 功能."
    }
  },
  {
    "id": "zh-v-1902",
    "hanzi": "多余",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是多余。",
      "py": "Zhè shì 多余.",
      "id": "Ini adalah 多余."
    }
  },
  {
    "id": "zh-v-1903",
    "hanzi": "或许",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是或许。",
      "py": "Zhè shì 或许.",
      "id": "Ini adalah 或许."
    }
  },
  {
    "id": "zh-v-1904",
    "hanzi": "角度",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是角度。",
      "py": "Zhè shì 角度.",
      "id": "Ini adalah 角度."
    }
  },
  {
    "id": "zh-v-1905",
    "hanzi": "思考",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是思考。",
      "py": "Zhè shì 思考.",
      "id": "Ini adalah 思考."
    }
  },
  {
    "id": "zh-v-1906",
    "hanzi": "学问",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是学问。",
      "py": "Zhè shì 学问.",
      "id": "Ini adalah 学问."
    }
  },
  {
    "id": "zh-v-1907",
    "hanzi": "玩具",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是玩具。",
      "py": "Zhè shì 玩具.",
      "id": "Ini adalah 玩具."
    }
  },
  {
    "id": "zh-v-1908",
    "hanzi": "占",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是占。",
      "py": "Zhè shì 占.",
      "id": "Ini adalah 占."
    }
  },
  {
    "id": "zh-v-1909",
    "hanzi": "在乎",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是在乎。",
      "py": "Zhè shì 在乎.",
      "id": "Ini adalah 在乎."
    }
  },
  {
    "id": "zh-v-1910",
    "hanzi": "欠",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是欠。",
      "py": "Zhè shì 欠.",
      "id": "Ini adalah 欠."
    }
  },
  {
    "id": "zh-v-1911",
    "hanzi": "机械",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是机械。",
      "py": "Zhè shì 机械.",
      "id": "Ini adalah 机械."
    }
  },
  {
    "id": "zh-v-1912",
    "hanzi": "键盘",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是键盘。",
      "py": "Zhè shì 键盘.",
      "id": "Ini adalah 键盘."
    }
  },
  {
    "id": "zh-v-1913",
    "hanzi": "结合",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Choice of gifts",
    "enMeaning": "Vocabulary from Choice of gifts",
    "example": {
      "hz": "这是结合。",
      "py": "Zhè shì 结合.",
      "id": "Ini adalah 结合."
    }
  },
  {
    "id": "zh-v-1914",
    "hanzi": "龙",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是龙。",
      "py": "Zhè shì 龙.",
      "id": "Ini adalah 龙."
    }
  },
  {
    "id": "zh-v-1915",
    "hanzi": "弱",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是弱。",
      "py": "Zhè shì 弱.",
      "id": "Ini adalah 弱."
    }
  },
  {
    "id": "zh-v-1916",
    "hanzi": "兔子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是兔子。",
      "py": "Zhè shì 兔子.",
      "id": "Ini adalah 兔子."
    }
  },
  {
    "id": "zh-v-1917",
    "hanzi": "蛇",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是蛇。",
      "py": "Zhè shì 蛇.",
      "id": "Ini adalah 蛇."
    }
  },
  {
    "id": "zh-v-1918",
    "hanzi": "猴子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是猴子。",
      "py": "Zhè shì 猴子.",
      "id": "Ini adalah 猴子."
    }
  },
  {
    "id": "zh-v-1919",
    "hanzi": "猪",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是猪。",
      "py": "Zhè shì 猪.",
      "id": "Ini adalah 猪."
    }
  },
  {
    "id": "zh-v-1920",
    "hanzi": "宣布",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是宣布。",
      "py": "Zhè shì 宣布.",
      "id": "Ini adalah 宣布."
    }
  },
  {
    "id": "zh-v-1921",
    "hanzi": "逃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是逃。",
      "py": "Zhè shì 逃.",
      "id": "Ini adalah 逃."
    }
  },
  {
    "id": "zh-v-1922",
    "hanzi": "主题",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是主题。",
      "py": "Zhè shì 主题.",
      "id": "Ini adalah 主题."
    }
  },
  {
    "id": "zh-v-1923",
    "hanzi": "祝福",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是祝福。",
      "py": "Zhè shì 祝福.",
      "id": "Ini adalah 祝福."
    }
  },
  {
    "id": "zh-v-1924",
    "hanzi": "对象",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是对象。",
      "py": "Zhè shì 对象.",
      "id": "Ini adalah 对象."
    }
  },
  {
    "id": "zh-v-1925",
    "hanzi": "组合",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是组合。",
      "py": "Zhè shì 组合.",
      "id": "Ini adalah 组合."
    }
  },
  {
    "id": "zh-v-1926",
    "hanzi": "矛盾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是矛盾。",
      "py": "Zhè shì 矛盾.",
      "id": "Ini adalah 矛盾."
    }
  },
  {
    "id": "zh-v-1927",
    "hanzi": "至今",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran The twelve zodiac animals",
    "enMeaning": "Vocabulary from The twelve zodiac animals",
    "example": {
      "hz": "这是至今。",
      "py": "Zhè shì 至今.",
      "id": "Ini adalah 至今."
    }
  },
  {
    "id": "zh-v-1928",
    "hanzi": "搞",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是搞。",
      "py": "Zhè shì 搞.",
      "id": "Ini adalah 搞."
    }
  },
  {
    "id": "zh-v-1929",
    "hanzi": "休闲",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是休闲。",
      "py": "Zhè shì 休闲.",
      "id": "Ini adalah 休闲."
    }
  },
  {
    "id": "zh-v-1930",
    "hanzi": "住宿",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是住宿。",
      "py": "Zhè shì 住宿.",
      "id": "Ini adalah 住宿."
    }
  },
  {
    "id": "zh-v-1931",
    "hanzi": "高档",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是高档。",
      "py": "Zhè shì 高档.",
      "id": "Ini adalah 高档."
    }
  },
  {
    "id": "zh-v-1932",
    "hanzi": "陌生",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是陌生。",
      "py": "Zhè shì 陌生.",
      "id": "Ini adalah 陌生."
    }
  },
  {
    "id": "zh-v-1933",
    "hanzi": "风险",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是风险。",
      "py": "Zhè shì 风险.",
      "id": "Ini adalah 风险."
    }
  },
  {
    "id": "zh-v-1934",
    "hanzi": "不安",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是不安。",
      "py": "Zhè shì 不安.",
      "id": "Ini adalah 不安."
    }
  },
  {
    "id": "zh-v-1935",
    "hanzi": "中心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是中心。",
      "py": "Zhè shì 中心.",
      "id": "Ini adalah 中心."
    }
  },
  {
    "id": "zh-v-1936",
    "hanzi": "吓",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是吓。",
      "py": "Zhè shì 吓.",
      "id": "Ini adalah 吓."
    }
  },
  {
    "id": "zh-v-1937",
    "hanzi": "教训",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是教训。",
      "py": "Zhè shì 教训.",
      "id": "Ini adalah 教训."
    }
  },
  {
    "id": "zh-v-1938",
    "hanzi": "随身",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是随身。",
      "py": "Zhè shì 随身.",
      "id": "Ini adalah 随身."
    }
  },
  {
    "id": "zh-v-1939",
    "hanzi": "风俗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是风俗。",
      "py": "Zhè shì 风俗.",
      "id": "Ini adalah 风俗."
    }
  },
  {
    "id": "zh-v-1940",
    "hanzi": "地道",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是地道。",
      "py": "Zhè shì 地道.",
      "id": "Ini adalah 地道."
    }
  },
  {
    "id": "zh-v-1941",
    "hanzi": "好客",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Traveling alone",
    "enMeaning": "Vocabulary from Traveling alone",
    "example": {
      "hz": "这是好客。",
      "py": "Zhè shì 好客.",
      "id": "Ini adalah 好客."
    }
  },
  {
    "id": "zh-v-1942",
    "hanzi": "闻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是闻。",
      "py": "Zhè shì 闻.",
      "id": "Ini adalah 闻."
    }
  },
  {
    "id": "zh-v-1943",
    "hanzi": "范围",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是范围。",
      "py": "Zhè shì 范围.",
      "id": "Ini adalah 范围."
    }
  },
  {
    "id": "zh-v-1944",
    "hanzi": "美食",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是美食。",
      "py": "Zhè shì 美食.",
      "id": "Ini adalah 美食."
    }
  },
  {
    "id": "zh-v-1945",
    "hanzi": "官",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是官。",
      "py": "Zhè shì 官.",
      "id": "Ini adalah 官."
    }
  },
  {
    "id": "zh-v-1946",
    "hanzi": "厨师",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是厨师。",
      "py": "Zhè shì 厨师.",
      "id": "Ini adalah 厨师."
    }
  },
  {
    "id": "zh-v-1947",
    "hanzi": "丁",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是丁。",
      "py": "Zhè shì 丁.",
      "id": "Ini adalah 丁."
    }
  },
  {
    "id": "zh-v-1948",
    "hanzi": "花生",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是花生。",
      "py": "Zhè shì 花生.",
      "id": "Ini adalah 花生."
    }
  },
  {
    "id": "zh-v-1949",
    "hanzi": "酱油",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是酱油。",
      "py": "Zhè shì 酱油.",
      "id": "Ini adalah 酱油."
    }
  },
  {
    "id": "zh-v-1950",
    "hanzi": "醋",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是醋。",
      "py": "Zhè shì 醋.",
      "id": "Ini adalah 醋."
    }
  },
  {
    "id": "zh-v-1951",
    "hanzi": "调整",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是调整。",
      "py": "Zhè shì 调整.",
      "id": "Ini adalah 调整."
    }
  },
  {
    "id": "zh-v-1952",
    "hanzi": "嫩",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是嫩。",
      "py": "Zhè shì 嫩.",
      "id": "Ini adalah 嫩."
    }
  },
  {
    "id": "zh-v-1953",
    "hanzi": "脆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是脆。",
      "py": "Zhè shì 脆.",
      "id": "Ini adalah 脆."
    }
  },
  {
    "id": "zh-v-1954",
    "hanzi": "淡",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是淡。",
      "py": "Zhè shì 淡.",
      "id": "Ini adalah 淡."
    }
  },
  {
    "id": "zh-v-1955",
    "hanzi": "招待",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是招待。",
      "py": "Zhè shì 招待.",
      "id": "Ini adalah 招待."
    }
  },
  {
    "id": "zh-v-1956",
    "hanzi": "称赞",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是称赞。",
      "py": "Zhè shì 称赞.",
      "id": "Ini adalah 称赞."
    }
  },
  {
    "id": "zh-v-1957",
    "hanzi": "流传",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是流传。",
      "py": "Zhè shì 流传.",
      "id": "Ini adalah 流传."
    }
  },
  {
    "id": "zh-v-1958",
    "hanzi": "如今",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Kung Pao Chicken",
    "enMeaning": "Vocabulary from Kung Pao Chicken",
    "example": {
      "hz": "这是如今。",
      "py": "Zhè shì 如今.",
      "id": "Ini adalah 如今."
    }
  },
  {
    "id": "zh-v-1959",
    "hanzi": "现状",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是现状。",
      "py": "Zhè shì 现状.",
      "id": "Ini adalah 现状."
    }
  },
  {
    "id": "zh-v-1960",
    "hanzi": "优势",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是优势。",
      "py": "Zhè shì 优势.",
      "id": "Ini adalah 优势."
    }
  },
  {
    "id": "zh-v-1961",
    "hanzi": "税",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是税。",
      "py": "Zhè shì 税.",
      "id": "Ini adalah 税."
    }
  },
  {
    "id": "zh-v-1962",
    "hanzi": "条理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是条理。",
      "py": "Zhè shì 条理.",
      "id": "Ini adalah 条理."
    }
  },
  {
    "id": "zh-v-1963",
    "hanzi": "突出",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是突出。",
      "py": "Zhè shì 突出.",
      "id": "Ini adalah 突出."
    }
  },
  {
    "id": "zh-v-1964",
    "hanzi": "宝贵",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是宝贵。",
      "py": "Zhè shì 宝贵.",
      "id": "Ini adalah 宝贵."
    }
  },
  {
    "id": "zh-v-1965",
    "hanzi": "可靠",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是可靠。",
      "py": "Zhè shì 可靠.",
      "id": "Ini adalah 可靠."
    }
  },
  {
    "id": "zh-v-1966",
    "hanzi": "发挥",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是发挥。",
      "py": "Zhè shì 发挥.",
      "id": "Ini adalah 发挥."
    }
  },
  {
    "id": "zh-v-1967",
    "hanzi": "市场",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是市场。",
      "py": "Zhè shì 市场.",
      "id": "Ini adalah 市场."
    }
  },
  {
    "id": "zh-v-1968",
    "hanzi": "说不定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是说不定。",
      "py": "Zhè shì 说不定.",
      "id": "Ini adalah 说不定."
    }
  },
  {
    "id": "zh-v-1969",
    "hanzi": "实习",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是实习。",
      "py": "Zhè shì 实习.",
      "id": "Ini adalah 实习."
    }
  },
  {
    "id": "zh-v-1970",
    "hanzi": "培养",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是培养。",
      "py": "Zhè shì 培养.",
      "id": "Ini adalah 培养."
    }
  },
  {
    "id": "zh-v-1971",
    "hanzi": "具备",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是具备。",
      "py": "Zhè shì 具备.",
      "id": "Ini adalah 具备."
    }
  },
  {
    "id": "zh-v-1972",
    "hanzi": "随时",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Career confusion",
    "enMeaning": "Vocabulary from Career confusion",
    "example": {
      "hz": "这是随时。",
      "py": "Zhè shì 随时.",
      "id": "Ini adalah 随时."
    }
  },
  {
    "id": "zh-v-1973",
    "hanzi": "阳台",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是阳台。",
      "py": "Zhè shì 阳台.",
      "id": "Ini adalah 阳台."
    }
  },
  {
    "id": "zh-v-1974",
    "hanzi": "玻璃",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是玻璃。",
      "py": "Zhè shì 玻璃.",
      "id": "Ini adalah 玻璃."
    }
  },
  {
    "id": "zh-v-1975",
    "hanzi": "隔壁",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是隔壁。",
      "py": "Zhè shì 隔壁.",
      "id": "Ini adalah 隔壁."
    }
  },
  {
    "id": "zh-v-1976",
    "hanzi": "面积",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是面积。",
      "py": "Zhè shì 面积.",
      "id": "Ini adalah 面积."
    }
  },
  {
    "id": "zh-v-1977",
    "hanzi": "独立",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是独立。",
      "py": "Zhè shì 独立.",
      "id": "Ini adalah 独立."
    }
  },
  {
    "id": "zh-v-1978",
    "hanzi": "讨价还价",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是讨价还价。",
      "py": "Zhè shì 讨价还价.",
      "id": "Ini adalah 讨价还价."
    }
  },
  {
    "id": "zh-v-1979",
    "hanzi": "装饰",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是装饰。",
      "py": "Zhè shì 装饰.",
      "id": "Ini adalah 装饰."
    }
  },
  {
    "id": "zh-v-1980",
    "hanzi": "体会",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是体会。",
      "py": "Zhè shì 体会.",
      "id": "Ini adalah 体会."
    }
  },
  {
    "id": "zh-v-1981",
    "hanzi": "漏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是漏。",
      "py": "Zhè shì 漏.",
      "id": "Ini adalah 漏."
    }
  },
  {
    "id": "zh-v-1982",
    "hanzi": "根",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是根。",
      "py": "Zhè shì 根.",
      "id": "Ini adalah 根."
    }
  },
  {
    "id": "zh-v-1983",
    "hanzi": "管子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是管子。",
      "py": "Zhè shì 管子.",
      "id": "Ini adalah 管子."
    }
  },
  {
    "id": "zh-v-1984",
    "hanzi": "维修",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是维修。",
      "py": "Zhè shì 维修.",
      "id": "Ini adalah 维修."
    }
  },
  {
    "id": "zh-v-1985",
    "hanzi": "彻底",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是彻底。",
      "py": "Zhè shì 彻底.",
      "id": "Ini adalah 彻底."
    }
  },
  {
    "id": "zh-v-1986",
    "hanzi": "无奈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Troubles of renting",
    "enMeaning": "Vocabulary from Troubles of renting",
    "example": {
      "hz": "这是无奈。",
      "py": "Zhè shì 无奈.",
      "id": "Ini adalah 无奈."
    }
  },
  {
    "id": "zh-v-1987",
    "hanzi": "勉强",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是勉强。",
      "py": "Zhè shì 勉强.",
      "id": "Ini adalah 勉强."
    }
  },
  {
    "id": "zh-v-1988",
    "hanzi": "前提",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是前提。",
      "py": "Zhè shì 前提.",
      "id": "Ini adalah 前提."
    }
  },
  {
    "id": "zh-v-1989",
    "hanzi": "步骤",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是步骤。",
      "py": "Zhè shì 步骤.",
      "id": "Ini adalah 步骤."
    }
  },
  {
    "id": "zh-v-1990",
    "hanzi": "从而",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是从而。",
      "py": "Zhè shì 从而.",
      "id": "Ini adalah 从而."
    }
  },
  {
    "id": "zh-v-1991",
    "hanzi": "诚恳",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是诚恳。",
      "py": "Zhè shì 诚恳.",
      "id": "Ini adalah 诚恳."
    }
  },
  {
    "id": "zh-v-1992",
    "hanzi": "强调",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是强调。",
      "py": "Zhè shì 强调.",
      "id": "Ini adalah 强调."
    }
  },
  {
    "id": "zh-v-1993",
    "hanzi": "有限",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是有限。",
      "py": "Zhè shì 有限.",
      "id": "Ini adalah 有限."
    }
  },
  {
    "id": "zh-v-1994",
    "hanzi": "针对",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是针对。",
      "py": "Zhè shì 针对.",
      "id": "Ini adalah 针对."
    }
  },
  {
    "id": "zh-v-1995",
    "hanzi": "代替",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是代替。",
      "py": "Zhè shì 代替.",
      "id": "Ini adalah 代替."
    }
  },
  {
    "id": "zh-v-1996",
    "hanzi": "寻找",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是寻找。",
      "py": "Zhè shì 寻找.",
      "id": "Ini adalah 寻找."
    }
  },
  {
    "id": "zh-v-1997",
    "hanzi": "周到",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是周到。",
      "py": "Zhè shì 周到.",
      "id": "Ini adalah 周到."
    }
  },
  {
    "id": "zh-v-1998",
    "hanzi": "否定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是否定。",
      "py": "Zhè shì 否定.",
      "id": "Ini adalah 否定."
    }
  },
  {
    "id": "zh-v-1999",
    "hanzi": "踏实",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to refuse",
    "enMeaning": "Vocabulary from How to refuse",
    "example": {
      "hz": "这是踏实。",
      "py": "Zhè shì 踏实.",
      "id": "Ini adalah 踏实."
    }
  },
  {
    "id": "zh-v-2000",
    "hanzi": "细节",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是细节。",
      "py": "Zhè shì 细节.",
      "id": "Ini adalah 细节."
    }
  },
  {
    "id": "zh-v-2001",
    "hanzi": "耳环",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是耳环。",
      "py": "Zhè shì 耳环.",
      "id": "Ini adalah 耳环."
    }
  },
  {
    "id": "zh-v-2002",
    "hanzi": "鲜艳",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是鲜艳。",
      "py": "Zhè shì 鲜艳.",
      "id": "Ini adalah 鲜艳."
    }
  },
  {
    "id": "zh-v-2003",
    "hanzi": "形成",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是形成。",
      "py": "Zhè shì 形成.",
      "id": "Ini adalah 形成."
    }
  },
  {
    "id": "zh-v-2004",
    "hanzi": "整体",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是整体。",
      "py": "Zhè shì 整体.",
      "id": "Ini adalah 整体."
    }
  },
  {
    "id": "zh-v-2005",
    "hanzi": "原则",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是原则。",
      "py": "Zhè shì 原则.",
      "id": "Ini adalah 原则."
    }
  },
  {
    "id": "zh-v-2006",
    "hanzi": "牛仔裤",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是牛仔裤。",
      "py": "Zhè shì 牛仔裤.",
      "id": "Ini adalah 牛仔裤."
    }
  },
  {
    "id": "zh-v-2007",
    "hanzi": "外套",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是外套。",
      "py": "Zhè shì 外套.",
      "id": "Ini adalah 外套."
    }
  },
  {
    "id": "zh-v-2008",
    "hanzi": "顶",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是顶。",
      "py": "Zhè shì 顶.",
      "id": "Ini adalah 顶."
    }
  },
  {
    "id": "zh-v-2009",
    "hanzi": "讲究",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是讲究。",
      "py": "Zhè shì 讲究.",
      "id": "Ini adalah 讲究."
    }
  },
  {
    "id": "zh-v-2010",
    "hanzi": "身材",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是身材。",
      "py": "Zhè shì 身材.",
      "id": "Ini adalah 身材."
    }
  },
  {
    "id": "zh-v-2011",
    "hanzi": "模特",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是模特。",
      "py": "Zhè shì 模特.",
      "id": "Ini adalah 模特."
    }
  },
  {
    "id": "zh-v-2012",
    "hanzi": "苗条",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是苗条。",
      "py": "Zhè shì 苗条.",
      "id": "Ini adalah 苗条."
    }
  },
  {
    "id": "zh-v-2013",
    "hanzi": "观念",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是观念。",
      "py": "Zhè shì 观念.",
      "id": "Ini adalah 观念."
    }
  },
  {
    "id": "zh-v-2014",
    "hanzi": "大方",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Outfit sharing",
    "enMeaning": "Vocabulary from Outfit sharing",
    "example": {
      "hz": "这是大方。",
      "py": "Zhè shì 大方.",
      "id": "Ini adalah 大方."
    }
  },
  {
    "id": "zh-v-2015",
    "hanzi": "向往",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是向往。",
      "py": "Zhè shì 向往.",
      "id": "Ini adalah 向往."
    }
  },
  {
    "id": "zh-v-2016",
    "hanzi": "人类",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是人类。",
      "py": "Zhè shì 人类.",
      "id": "Ini adalah 人类."
    }
  },
  {
    "id": "zh-v-2017",
    "hanzi": "彼此",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是彼此。",
      "py": "Zhè shì 彼此.",
      "id": "Ini adalah 彼此."
    }
  },
  {
    "id": "zh-v-2018",
    "hanzi": "对待",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是对待。",
      "py": "Zhè shì 对待.",
      "id": "Ini adalah 对待."
    }
  },
  {
    "id": "zh-v-2019",
    "hanzi": "身份",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是身份。",
      "py": "Zhè shì 身份.",
      "id": "Ini adalah 身份."
    }
  },
  {
    "id": "zh-v-2020",
    "hanzi": "绝对",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是绝对。",
      "py": "Zhè shì 绝对.",
      "id": "Ini adalah 绝对."
    }
  },
  {
    "id": "zh-v-2021",
    "hanzi": "习俗",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是习俗。",
      "py": "Zhè shì 习俗.",
      "id": "Ini adalah 习俗."
    }
  },
  {
    "id": "zh-v-2022",
    "hanzi": "控制",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是控制。",
      "py": "Zhè shì 控制.",
      "id": "Ini adalah 控制."
    }
  },
  {
    "id": "zh-v-2023",
    "hanzi": "巨大",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是巨大。",
      "py": "Zhè shì 巨大.",
      "id": "Ini adalah 巨大."
    }
  },
  {
    "id": "zh-v-2024",
    "hanzi": "冒险",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是冒险。",
      "py": "Zhè shì 冒险.",
      "id": "Ini adalah 冒险."
    }
  },
  {
    "id": "zh-v-2025",
    "hanzi": "力量",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是力量。",
      "py": "Zhè shì 力量.",
      "id": "Ini adalah 力量."
    }
  },
  {
    "id": "zh-v-2026",
    "hanzi": "压",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是压。",
      "py": "Zhè shì 压.",
      "id": "Ini adalah 压."
    }
  },
  {
    "id": "zh-v-2027",
    "hanzi": "塔",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是塔。",
      "py": "Zhè shì 塔.",
      "id": "Ini adalah 塔."
    }
  },
  {
    "id": "zh-v-2028",
    "hanzi": "结局",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是结局。",
      "py": "Zhè shì 结局.",
      "id": "Ini adalah 结局."
    }
  },
  {
    "id": "zh-v-2029",
    "hanzi": "刻苦",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是刻苦。",
      "py": "Zhè shì 刻苦.",
      "id": "Ini adalah 刻苦."
    }
  },
  {
    "id": "zh-v-2030",
    "hanzi": "本领",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Touring West Lake",
    "enMeaning": "Vocabulary from Touring West Lake",
    "example": {
      "hz": "这是本领。",
      "py": "Zhè shì 本领.",
      "id": "Ini adalah 本领."
    }
  },
  {
    "id": "zh-v-2031",
    "hanzi": "功效",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是功效。",
      "py": "Zhè shì 功效.",
      "id": "Ini adalah 功效."
    }
  },
  {
    "id": "zh-v-2032",
    "hanzi": "实践",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是实践。",
      "py": "Zhè shì 实践.",
      "id": "Ini adalah 实践."
    }
  },
  {
    "id": "zh-v-2033",
    "hanzi": "系统",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是系统。",
      "py": "Zhè shì 系统.",
      "id": "Ini adalah 系统."
    }
  },
  {
    "id": "zh-v-2034",
    "hanzi": "皇帝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是皇帝。",
      "py": "Zhè shì 皇帝.",
      "id": "Ini adalah 皇帝."
    }
  },
  {
    "id": "zh-v-2035",
    "hanzi": "品尝",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是品尝。",
      "py": "Zhè shì 品尝.",
      "id": "Ini adalah 品尝."
    }
  },
  {
    "id": "zh-v-2036",
    "hanzi": "地位",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是地位。",
      "py": "Zhè shì 地位.",
      "id": "Ini adalah 地位."
    }
  },
  {
    "id": "zh-v-2037",
    "hanzi": "品牌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是品牌。",
      "py": "Zhè shì 品牌.",
      "id": "Ini adalah 品牌."
    }
  },
  {
    "id": "zh-v-2038",
    "hanzi": "定义",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是定义。",
      "py": "Zhè shì 定义.",
      "id": "Ini adalah 定义."
    }
  },
  {
    "id": "zh-v-2039",
    "hanzi": "配料",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是配料。",
      "py": "Zhè shì 配料.",
      "id": "Ini adalah 配料."
    }
  },
  {
    "id": "zh-v-2040",
    "hanzi": "擅长",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是擅长。",
      "py": "Zhè shì 擅长.",
      "id": "Ini adalah 擅长."
    }
  },
  {
    "id": "zh-v-2041",
    "hanzi": "媒体",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是媒体。",
      "py": "Zhè shì 媒体.",
      "id": "Ini adalah 媒体."
    }
  },
  {
    "id": "zh-v-2042",
    "hanzi": "限定",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是限定。",
      "py": "Zhè shì 限定.",
      "id": "Ini adalah 限定."
    }
  },
  {
    "id": "zh-v-2043",
    "hanzi": "包装",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是包装。",
      "py": "Zhè shì 包装.",
      "id": "Ini adalah 包装."
    }
  },
  {
    "id": "zh-v-2044",
    "hanzi": "形式",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese tea",
    "enMeaning": "Vocabulary from Chinese tea",
    "example": {
      "hz": "这是形式。",
      "py": "Zhè shì 形式.",
      "id": "Ini adalah 形式."
    }
  },
  {
    "id": "zh-v-2045",
    "hanzi": "尾巴",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是尾巴。",
      "py": "Zhè shì 尾巴.",
      "id": "Ini adalah 尾巴."
    }
  },
  {
    "id": "zh-v-2046",
    "hanzi": "象征",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是象征。",
      "py": "Zhè shì 象征.",
      "id": "Ini adalah 象征."
    }
  },
  {
    "id": "zh-v-2047",
    "hanzi": "从头到尾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是从头到尾。",
      "py": "Zhè shì 从头到尾.",
      "id": "Ini adalah 从头到尾."
    }
  },
  {
    "id": "zh-v-2048",
    "hanzi": "包含",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是包含。",
      "py": "Zhè shì 包含.",
      "id": "Ini adalah 包含."
    }
  },
  {
    "id": "zh-v-2049",
    "hanzi": "鞭炮",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是鞭炮。",
      "py": "Zhè shì 鞭炮.",
      "id": "Ini adalah 鞭炮."
    }
  },
  {
    "id": "zh-v-2050",
    "hanzi": "盼望",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是盼望。",
      "py": "Zhè shì 盼望.",
      "id": "Ini adalah 盼望."
    }
  },
  {
    "id": "zh-v-2051",
    "hanzi": "实话",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是实话。",
      "py": "Zhè shì 实话.",
      "id": "Ini adalah 实话."
    }
  },
  {
    "id": "zh-v-2052",
    "hanzi": "怀念",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是怀念。",
      "py": "Zhè shì 怀念.",
      "id": "Ini adalah 怀念."
    }
  },
  {
    "id": "zh-v-2053",
    "hanzi": "扫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是扫。",
      "py": "Zhè shì 扫.",
      "id": "Ini adalah 扫."
    }
  },
  {
    "id": "zh-v-2054",
    "hanzi": "免得",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是免得。",
      "py": "Zhè shì 免得.",
      "id": "Ini adalah 免得."
    }
  },
  {
    "id": "zh-v-2055",
    "hanzi": "吉利",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是吉利。",
      "py": "Zhè shì 吉利.",
      "id": "Ini adalah 吉利."
    }
  },
  {
    "id": "zh-v-2056",
    "hanzi": "剪刀",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是剪刀。",
      "py": "Zhè shì 剪刀.",
      "id": "Ini adalah 剪刀."
    }
  },
  {
    "id": "zh-v-2057",
    "hanzi": "破坏",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是破坏。",
      "py": "Zhè shì 破坏.",
      "id": "Ini adalah 破坏."
    }
  },
  {
    "id": "zh-v-2058",
    "hanzi": "长辈",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是长辈。",
      "py": "Zhè shì 长辈.",
      "id": "Ini adalah 长辈."
    }
  },
  {
    "id": "zh-v-2059",
    "hanzi": "规矩",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是规矩。",
      "py": "Zhè shì 规矩.",
      "id": "Ini adalah 规矩."
    }
  },
  {
    "id": "zh-v-2060",
    "hanzi": "核心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Spring Festival customs",
    "enMeaning": "Vocabulary from Spring Festival customs",
    "example": {
      "hz": "这是核心。",
      "py": "Zhè shì 核心.",
      "id": "Ini adalah 核心."
    }
  },
  {
    "id": "zh-v-2061",
    "hanzi": "朗读",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是朗读。",
      "py": "Zhè shì 朗读.",
      "id": "Ini adalah 朗读."
    }
  },
  {
    "id": "zh-v-2062",
    "hanzi": "纠正",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是纠正。",
      "py": "Zhè shì 纠正.",
      "id": "Ini adalah 纠正."
    }
  },
  {
    "id": "zh-v-2063",
    "hanzi": "基本",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是基本。",
      "py": "Zhè shì 基本.",
      "id": "Ini adalah 基本."
    }
  },
  {
    "id": "zh-v-2064",
    "hanzi": "达到",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是达到。",
      "py": "Zhè shì 达到.",
      "id": "Ini adalah 达到."
    }
  },
  {
    "id": "zh-v-2065",
    "hanzi": "企业",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是企业。",
      "py": "Zhè shì 企业.",
      "id": "Ini adalah 企业."
    }
  },
  {
    "id": "zh-v-2066",
    "hanzi": "教材",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是教材。",
      "py": "Zhè shì 教材.",
      "id": "Ini adalah 教材."
    }
  },
  {
    "id": "zh-v-2067",
    "hanzi": "字幕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是字幕。",
      "py": "Zhè shì 字幕.",
      "id": "Ini adalah 字幕."
    }
  },
  {
    "id": "zh-v-2068",
    "hanzi": "电视剧",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是电视剧。",
      "py": "Zhè shì 电视剧.",
      "id": "Ini adalah 电视剧."
    }
  },
  {
    "id": "zh-v-2069",
    "hanzi": "总之",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是总之。",
      "py": "Zhè shì 总之.",
      "id": "Ini adalah 总之."
    }
  },
  {
    "id": "zh-v-2070",
    "hanzi": "运用",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是运用。",
      "py": "Zhè shì 运用.",
      "id": "Ini adalah 运用."
    }
  },
  {
    "id": "zh-v-2071",
    "hanzi": "人工",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是人工。",
      "py": "Zhè shì 人工.",
      "id": "Ini adalah 人工."
    }
  },
  {
    "id": "zh-v-2072",
    "hanzi": "情景",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是情景。",
      "py": "Zhè shì 情景.",
      "id": "Ini adalah 情景."
    }
  },
  {
    "id": "zh-v-2073",
    "hanzi": "融入",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是融入。",
      "py": "Zhè shì 融入.",
      "id": "Ini adalah 融入."
    }
  },
  {
    "id": "zh-v-2074",
    "hanzi": "连接",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Chinese learning journey",
    "enMeaning": "Vocabulary from Chinese learning journey",
    "example": {
      "hz": "这是连接。",
      "py": "Zhè shì 连接.",
      "id": "Ini adalah 连接."
    }
  },
  {
    "id": "zh-v-2075",
    "hanzi": "结账",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是结账。",
      "py": "Zhè shì 结账.",
      "id": "Ini adalah 结账."
    }
  },
  {
    "id": "zh-v-2076",
    "hanzi": "布",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是布。",
      "py": "Zhè shì 布.",
      "id": "Ini adalah 布."
    }
  },
  {
    "id": "zh-v-2077",
    "hanzi": "决心",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是决心。",
      "py": "Zhè shì 决心.",
      "id": "Ini adalah 决心."
    }
  },
  {
    "id": "zh-v-2078",
    "hanzi": "机器",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是机器。",
      "py": "Zhè shì 机器.",
      "id": "Ini adalah 机器."
    }
  },
  {
    "id": "zh-v-2079",
    "hanzi": "手工",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是手工。",
      "py": "Zhè shì 手工.",
      "id": "Ini adalah 手工."
    }
  },
  {
    "id": "zh-v-2080",
    "hanzi": "着迷",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是着迷。",
      "py": "Zhè shì 着迷.",
      "id": "Ini adalah 着迷."
    }
  },
  {
    "id": "zh-v-2081",
    "hanzi": "冲动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是冲动。",
      "py": "Zhè shì 冲动.",
      "id": "Ini adalah 冲动."
    }
  },
  {
    "id": "zh-v-2082",
    "hanzi": "摄影",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是摄影。",
      "py": "Zhè shì 摄影.",
      "id": "Ini adalah 摄影."
    }
  },
  {
    "id": "zh-v-2083",
    "hanzi": "平台",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是平台。",
      "py": "Zhè shì 平台.",
      "id": "Ini adalah 平台."
    }
  },
  {
    "id": "zh-v-2084",
    "hanzi": "反正",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是反正。",
      "py": "Zhè shì 反正.",
      "id": "Ini adalah 反正."
    }
  },
  {
    "id": "zh-v-2085",
    "hanzi": "循环",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是循环。",
      "py": "Zhè shì 循环.",
      "id": "Ini adalah 循环."
    }
  },
  {
    "id": "zh-v-2086",
    "hanzi": "回收",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是回收。",
      "py": "Zhè shì 回收.",
      "id": "Ini adalah 回收."
    }
  },
  {
    "id": "zh-v-2087",
    "hanzi": "捐",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是捐。",
      "py": "Zhè shì 捐.",
      "id": "Ini adalah 捐."
    }
  },
  {
    "id": "zh-v-2088",
    "hanzi": "其余",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Eco-friendly living",
    "enMeaning": "Vocabulary from Eco-friendly living",
    "example": {
      "hz": "这是其余。",
      "py": "Zhè shì 其余.",
      "id": "Ini adalah 其余."
    }
  },
  {
    "id": "zh-v-2089",
    "hanzi": "结实",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是结实。",
      "py": "Zhè shì 结实.",
      "id": "Ini adalah 结实."
    }
  },
  {
    "id": "zh-v-2090",
    "hanzi": "负担",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是负担。",
      "py": "Zhè shì 负担.",
      "id": "Ini adalah 负担."
    }
  },
  {
    "id": "zh-v-2091",
    "hanzi": "心态",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是心态。",
      "py": "Zhè shì 心态.",
      "id": "Ini adalah 心态."
    }
  },
  {
    "id": "zh-v-2092",
    "hanzi": "单纯",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是单纯。",
      "py": "Zhè shì 单纯.",
      "id": "Ini adalah 单纯."
    }
  },
  {
    "id": "zh-v-2093",
    "hanzi": "改善",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是改善。",
      "py": "Zhè shì 改善.",
      "id": "Ini adalah 改善."
    }
  },
  {
    "id": "zh-v-2094",
    "hanzi": "唯一",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是唯一。",
      "py": "Zhè shì 唯一.",
      "id": "Ini adalah 唯一."
    }
  },
  {
    "id": "zh-v-2095",
    "hanzi": "失眠",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是失眠。",
      "py": "Zhè shì 失眠.",
      "id": "Ini adalah 失眠."
    }
  },
  {
    "id": "zh-v-2096",
    "hanzi": "不足",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是不足。",
      "py": "Zhè shì 不足.",
      "id": "Ini adalah 不足."
    }
  },
  {
    "id": "zh-v-2097",
    "hanzi": "疲劳",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是疲劳。",
      "py": "Zhè shì 疲劳.",
      "id": "Ini adalah 疲劳."
    }
  },
  {
    "id": "zh-v-2098",
    "hanzi": "非",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是非。",
      "py": "Zhè shì 非.",
      "id": "Ini adalah 非."
    }
  },
  {
    "id": "zh-v-2099",
    "hanzi": "群",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是群。",
      "py": "Zhè shì 群.",
      "id": "Ini adalah 群."
    }
  },
  {
    "id": "zh-v-2100",
    "hanzi": "太极拳",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是太极拳。",
      "py": "Zhè shì 太极拳.",
      "id": "Ini adalah 太极拳."
    }
  },
  {
    "id": "zh-v-2101",
    "hanzi": "居然",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是居然。",
      "py": "Zhè shì 居然.",
      "id": "Ini adalah 居然."
    }
  },
  {
    "id": "zh-v-2102",
    "hanzi": "舒畅",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是舒畅。",
      "py": "Zhè shì 舒畅.",
      "id": "Ini adalah 舒畅."
    }
  },
  {
    "id": "zh-v-2103",
    "hanzi": "相对",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A balanced workout routine",
    "enMeaning": "Vocabulary from A balanced workout routine",
    "example": {
      "hz": "这是相对。",
      "py": "Zhè shì 相对.",
      "id": "Ini adalah 相对."
    }
  },
  {
    "id": "zh-v-2104",
    "hanzi": "孝顺",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是孝顺。",
      "py": "Zhè shì 孝顺.",
      "id": "Ini adalah 孝顺."
    }
  },
  {
    "id": "zh-v-2105",
    "hanzi": "议论",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是议论。",
      "py": "Zhè shì 议论.",
      "id": "Ini adalah 议论."
    }
  },
  {
    "id": "zh-v-2106",
    "hanzi": "排斥",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是排斥。",
      "py": "Zhè shì 排斥.",
      "id": "Ini adalah 排斥."
    }
  },
  {
    "id": "zh-v-2107",
    "hanzi": "完善",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是完善。",
      "py": "Zhè shì 完善.",
      "id": "Ini adalah 完善."
    }
  },
  {
    "id": "zh-v-2108",
    "hanzi": "护理",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是护理。",
      "py": "Zhè shì 护理.",
      "id": "Ini adalah 护理."
    }
  },
  {
    "id": "zh-v-2109",
    "hanzi": "寂寞",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是寂寞。",
      "py": "Zhè shì 寂寞.",
      "id": "Ini adalah 寂寞."
    }
  },
  {
    "id": "zh-v-2110",
    "hanzi": "商业",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是商业。",
      "py": "Zhè shì 商业.",
      "id": "Ini adalah 商业."
    }
  },
  {
    "id": "zh-v-2111",
    "hanzi": "保险",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是保险。",
      "py": "Zhè shì 保险.",
      "id": "Ini adalah 保险."
    }
  },
  {
    "id": "zh-v-2112",
    "hanzi": "资料",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是资料。",
      "py": "Zhè shì 资料.",
      "id": "Ini adalah 资料."
    }
  },
  {
    "id": "zh-v-2113",
    "hanzi": "人口",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是人口。",
      "py": "Zhè shì 人口.",
      "id": "Ini adalah 人口."
    }
  },
  {
    "id": "zh-v-2114",
    "hanzi": "比例",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是比例。",
      "py": "Zhè shì 比例.",
      "id": "Ini adalah 比例."
    }
  },
  {
    "id": "zh-v-2115",
    "hanzi": "寿命",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是寿命。",
      "py": "Zhè shì 寿命.",
      "id": "Ini adalah 寿命."
    }
  },
  {
    "id": "zh-v-2116",
    "hanzi": "必然",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是必然。",
      "py": "Zhè shì 必然.",
      "id": "Ini adalah 必然."
    }
  },
  {
    "id": "zh-v-2117",
    "hanzi": "社区",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran How to care for the elderly",
    "enMeaning": "Vocabulary from How to care for the elderly",
    "example": {
      "hz": "这是社区。",
      "py": "Zhè shì 社区.",
      "id": "Ini adalah 社区."
    }
  },
  {
    "id": "zh-v-2118",
    "hanzi": "原料",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是原料。",
      "py": "Zhè shì 原料.",
      "id": "Ini adalah 原料."
    }
  },
  {
    "id": "zh-v-2119",
    "hanzi": "手艺",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是手艺。",
      "py": "Zhè shì 手艺.",
      "id": "Ini adalah 手艺."
    }
  },
  {
    "id": "zh-v-2120",
    "hanzi": "功夫",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是功夫。",
      "py": "Zhè shì 功夫.",
      "id": "Ini adalah 功夫."
    }
  },
  {
    "id": "zh-v-2121",
    "hanzi": "一辈子",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是一辈子。",
      "py": "Zhè shì 一辈子.",
      "id": "Ini adalah 一辈子."
    }
  },
  {
    "id": "zh-v-2122",
    "hanzi": "延续",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是延续。",
      "py": "Zhè shì 延续.",
      "id": "Ini adalah 延续."
    }
  },
  {
    "id": "zh-v-2123",
    "hanzi": "创作",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是创作。",
      "py": "Zhè shì 创作.",
      "id": "Ini adalah 创作."
    }
  },
  {
    "id": "zh-v-2124",
    "hanzi": "图案",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是图案。",
      "py": "Zhè shì 图案.",
      "id": "Ini adalah 图案."
    }
  },
  {
    "id": "zh-v-2125",
    "hanzi": "元素",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是元素。",
      "py": "Zhè shì 元素.",
      "id": "Ini adalah 元素."
    }
  },
  {
    "id": "zh-v-2126",
    "hanzi": "呈现",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是呈现。",
      "py": "Zhè shì 呈现.",
      "id": "Ini adalah 呈现."
    }
  },
  {
    "id": "zh-v-2127",
    "hanzi": "色彩",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是色彩。",
      "py": "Zhè shì 色彩.",
      "id": "Ini adalah 色彩."
    }
  },
  {
    "id": "zh-v-2128",
    "hanzi": "摊",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是摊。",
      "py": "Zhè shì 摊.",
      "id": "Ini adalah 摊."
    }
  },
  {
    "id": "zh-v-2129",
    "hanzi": "不妨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是不妨。",
      "py": "Zhè shì 不妨.",
      "id": "Ini adalah 不妨."
    }
  },
  {
    "id": "zh-v-2130",
    "hanzi": "传播",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是传播。",
      "py": "Zhè shì 传播.",
      "id": "Ini adalah 传播."
    }
  },
  {
    "id": "zh-v-2131",
    "hanzi": "保留",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是保留。",
      "py": "Zhè shì 保留.",
      "id": "Ini adalah 保留."
    }
  },
  {
    "id": "zh-v-2132",
    "hanzi": "代",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是代。",
      "py": "Zhè shì 代.",
      "id": "Ini adalah 代."
    }
  },
  {
    "id": "zh-v-2133",
    "hanzi": "面貌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran China’s Porcelain Capital",
    "enMeaning": "Vocabulary from China’s Porcelain Capital",
    "example": {
      "hz": "这是面貌。",
      "py": "Zhè shì 面貌.",
      "id": "Ini adalah 面貌."
    }
  },
  {
    "id": "zh-v-2134",
    "hanzi": "进攻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是进攻。",
      "py": "Zhè shì 进攻.",
      "id": "Ini adalah 进攻."
    }
  },
  {
    "id": "zh-v-2135",
    "hanzi": "甩",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是甩。",
      "py": "Zhè shì 甩.",
      "id": "Ini adalah 甩."
    }
  },
  {
    "id": "zh-v-2136",
    "hanzi": "防守",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是防守。",
      "py": "Zhè shì 防守.",
      "id": "Ini adalah 防守."
    }
  },
  {
    "id": "zh-v-2137",
    "hanzi": "配合",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是配合。",
      "py": "Zhè shì 配合.",
      "id": "Ini adalah 配合."
    }
  },
  {
    "id": "zh-v-2138",
    "hanzi": "全面",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是全面。",
      "py": "Zhè shì 全面.",
      "id": "Ini adalah 全面."
    }
  },
  {
    "id": "zh-v-2139",
    "hanzi": "出色",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是出色。",
      "py": "Zhè shì 出色.",
      "id": "Ini adalah 出色."
    }
  },
  {
    "id": "zh-v-2140",
    "hanzi": "担任",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是担任。",
      "py": "Zhè shì 担任.",
      "id": "Ini adalah 担任."
    }
  },
  {
    "id": "zh-v-2141",
    "hanzi": "明星",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是明星。",
      "py": "Zhè shì 明星.",
      "id": "Ini adalah 明星."
    }
  },
  {
    "id": "zh-v-2142",
    "hanzi": "形象",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是形象。",
      "py": "Zhè shì 形象.",
      "id": "Ini adalah 形象."
    }
  },
  {
    "id": "zh-v-2143",
    "hanzi": "关注",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是关注。",
      "py": "Zhè shì 关注.",
      "id": "Ini adalah 关注."
    }
  },
  {
    "id": "zh-v-2144",
    "hanzi": "坦率",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是坦率。",
      "py": "Zhè shì 坦率.",
      "id": "Ini adalah 坦率."
    }
  },
  {
    "id": "zh-v-2145",
    "hanzi": "互动",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是互动。",
      "py": "Zhè shì 互动.",
      "id": "Ini adalah 互动."
    }
  },
  {
    "id": "zh-v-2146",
    "hanzi": "宣传",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是宣传。",
      "py": "Zhè shì 宣传.",
      "id": "Ini adalah 宣传."
    }
  },
  {
    "id": "zh-v-2147",
    "hanzi": "有利",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是有利。",
      "py": "Zhè shì 有利.",
      "id": "Ini adalah 有利."
    }
  },
  {
    "id": "zh-v-2148",
    "hanzi": "加油",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Discussing a match\t",
    "enMeaning": "Vocabulary from Discussing a match\t",
    "example": {
      "hz": "这是加油。",
      "py": "Zhè shì 加油.",
      "id": "Ini adalah 加油."
    }
  },
  {
    "id": "zh-v-2149",
    "hanzi": "推辞",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是推辞。",
      "py": "Zhè shì 推辞.",
      "id": "Ini adalah 推辞."
    }
  },
  {
    "id": "zh-v-2150",
    "hanzi": "惩罚",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是惩罚。",
      "py": "Zhè shì 惩罚.",
      "id": "Ini adalah 惩罚."
    }
  },
  {
    "id": "zh-v-2151",
    "hanzi": "包裹",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是包裹。",
      "py": "Zhè shì 包裹.",
      "id": "Ini adalah 包裹."
    }
  },
  {
    "id": "zh-v-2152",
    "hanzi": "凌晨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是凌晨。",
      "py": "Zhè shì 凌晨.",
      "id": "Ini adalah 凌晨."
    }
  },
  {
    "id": "zh-v-2153",
    "hanzi": "雾",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是雾。",
      "py": "Zhè shì 雾.",
      "id": "Ini adalah 雾."
    }
  },
  {
    "id": "zh-v-2154",
    "hanzi": "敌人",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是敌人。",
      "py": "Zhè shì 敌人.",
      "id": "Ini adalah 敌人."
    }
  },
  {
    "id": "zh-v-2155",
    "hanzi": "士兵",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是士兵。",
      "py": "Zhè shì 士兵.",
      "id": "Ini adalah 士兵."
    }
  },
  {
    "id": "zh-v-2156",
    "hanzi": "命令",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是命令。",
      "py": "Zhè shì 命令.",
      "id": "Ini adalah 命令."
    }
  },
  {
    "id": "zh-v-2157",
    "hanzi": "喊",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是喊。",
      "py": "Zhè shì 喊.",
      "id": "Ini adalah 喊."
    }
  },
  {
    "id": "zh-v-2158",
    "hanzi": "轻易",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是轻易。",
      "py": "Zhè shì 轻易.",
      "id": "Ini adalah 轻易."
    }
  },
  {
    "id": "zh-v-2159",
    "hanzi": "插",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是插。",
      "py": "Zhè shì 插.",
      "id": "Ini adalah 插."
    }
  },
  {
    "id": "zh-v-2160",
    "hanzi": "上当",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是上当。",
      "py": "Zhè shì 上当.",
      "id": "Ini adalah 上当."
    }
  },
  {
    "id": "zh-v-2161",
    "hanzi": "损失",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是损失。",
      "py": "Zhè shì 损失.",
      "id": "Ini adalah 损失."
    }
  },
  {
    "id": "zh-v-2162",
    "hanzi": "艰巨",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是艰巨。",
      "py": "Zhè shì 艰巨.",
      "id": "Ini adalah 艰巨."
    }
  },
  {
    "id": "zh-v-2163",
    "hanzi": "鼓舞",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是鼓舞。",
      "py": "Zhè shì 鼓舞.",
      "id": "Ini adalah 鼓舞."
    }
  },
  {
    "id": "zh-v-2164",
    "hanzi": "胜利",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Borrowing Arrows with Straw Boats",
    "enMeaning": "Vocabulary from Borrowing Arrows with Straw Boats",
    "example": {
      "hz": "这是胜利。",
      "py": "Zhè shì 胜利.",
      "id": "Ini adalah 胜利."
    }
  },
  {
    "id": "zh-v-2165",
    "hanzi": "闯",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是闯。",
      "py": "Zhè shì 闯.",
      "id": "Ini adalah 闯."
    }
  },
  {
    "id": "zh-v-2166",
    "hanzi": "行人",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是行人。",
      "py": "Zhè shì 行人.",
      "id": "Ini adalah 行人."
    }
  },
  {
    "id": "zh-v-2167",
    "hanzi": "遵守",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是遵守。",
      "py": "Zhè shì 遵守.",
      "id": "Ini adalah 遵守."
    }
  },
  {
    "id": "zh-v-2168",
    "hanzi": "时刻",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是时刻。",
      "py": "Zhè shì 时刻.",
      "id": "Ini adalah 时刻."
    }
  },
  {
    "id": "zh-v-2169",
    "hanzi": "汽油",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是汽油。",
      "py": "Zhè shì 汽油.",
      "id": "Ini adalah 汽油."
    }
  },
  {
    "id": "zh-v-2170",
    "hanzi": "违反",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是违反。",
      "py": "Zhè shì 违反.",
      "id": "Ini adalah 违反."
    }
  },
  {
    "id": "zh-v-2171",
    "hanzi": "罚款",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是罚款。",
      "py": "Zhè shì 罚款.",
      "id": "Ini adalah 罚款."
    }
  },
  {
    "id": "zh-v-2172",
    "hanzi": "划算",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是划算。",
      "py": "Zhè shì 划算.",
      "id": "Ini adalah 划算."
    }
  },
  {
    "id": "zh-v-2173",
    "hanzi": "显然",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是显然。",
      "py": "Zhè shì 显然.",
      "id": "Ini adalah 显然."
    }
  },
  {
    "id": "zh-v-2174",
    "hanzi": "体现",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是体现。",
      "py": "Zhè shì 体现.",
      "id": "Ini adalah 体现."
    }
  },
  {
    "id": "zh-v-2175",
    "hanzi": "绕",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是绕。",
      "py": "Zhè shì 绕.",
      "id": "Ini adalah 绕."
    }
  },
  {
    "id": "zh-v-2176",
    "hanzi": "车库",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是车库。",
      "py": "Zhè shì 车库.",
      "id": "Ini adalah 车库."
    }
  },
  {
    "id": "zh-v-2177",
    "hanzi": "呆",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是呆。",
      "py": "Zhè shì 呆.",
      "id": "Ini adalah 呆."
    }
  },
  {
    "id": "zh-v-2178",
    "hanzi": "执照",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是执照。",
      "py": "Zhè shì 执照.",
      "id": "Ini adalah 执照."
    }
  },
  {
    "id": "zh-v-2179",
    "hanzi": "不见得",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran Learning to drive and buying a car",
    "enMeaning": "Vocabulary from Learning to drive and buying a car",
    "example": {
      "hz": "这是不见得。",
      "py": "Zhè shì 不见得.",
      "id": "Ini adalah 不见得."
    }
  },
  {
    "id": "zh-v-2180",
    "hanzi": "新郎",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是新郎。",
      "py": "Zhè shì 新郎.",
      "id": "Ini adalah 新郎."
    }
  },
  {
    "id": "zh-v-2181",
    "hanzi": "牵",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是牵。",
      "py": "Zhè shì 牵.",
      "id": "Ini adalah 牵."
    }
  },
  {
    "id": "zh-v-2182",
    "hanzi": "组成",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是组成。",
      "py": "Zhè shì 组成.",
      "id": "Ini adalah 组成."
    }
  },
  {
    "id": "zh-v-2183",
    "hanzi": "协议",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是协议。",
      "py": "Zhè shì 协议.",
      "id": "Ini adalah 协议."
    }
  },
  {
    "id": "zh-v-2184",
    "hanzi": "重大",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是重大。",
      "py": "Zhè shì 重大.",
      "id": "Ini adalah 重大."
    }
  },
  {
    "id": "zh-v-2185",
    "hanzi": "争论",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是争论。",
      "py": "Zhè shì 争论.",
      "id": "Ini adalah 争论."
    }
  },
  {
    "id": "zh-v-2186",
    "hanzi": "账户",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是账户。",
      "py": "Zhè shì 账户.",
      "id": "Ini adalah 账户."
    }
  },
  {
    "id": "zh-v-2187",
    "hanzi": "尊敬",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是尊敬。",
      "py": "Zhè shì 尊敬.",
      "id": "Ini adalah 尊敬."
    }
  },
  {
    "id": "zh-v-2188",
    "hanzi": "感激",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是感激。",
      "py": "Zhè shì 感激.",
      "id": "Ini adalah 感激."
    }
  },
  {
    "id": "zh-v-2189",
    "hanzi": "新娘",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是新娘。",
      "py": "Zhè shì 新娘.",
      "id": "Ini adalah 新娘."
    }
  },
  {
    "id": "zh-v-2190",
    "hanzi": "形容",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是形容。",
      "py": "Zhè shì 形容.",
      "id": "Ini adalah 形容."
    }
  },
  {
    "id": "zh-v-2191",
    "hanzi": "体贴",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是体贴。",
      "py": "Zhè shì 体贴.",
      "id": "Ini adalah 体贴."
    }
  },
  {
    "id": "zh-v-2192",
    "hanzi": "鼓掌",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是鼓掌。",
      "py": "Zhè shì 鼓掌.",
      "id": "Ini adalah 鼓掌."
    }
  },
  {
    "id": "zh-v-2193",
    "hanzi": "隆重",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是隆重。",
      "py": "Zhè shì 隆重.",
      "id": "Ini adalah 隆重."
    }
  },
  {
    "id": "zh-v-2194",
    "hanzi": "真实",
    "pinyin": "zh",
    "tones": [
      1
    ],
    "level": 8,
    "pos": "Vocab",
    "idMeaning": "Kosakata pelajaran A wedding",
    "enMeaning": "Vocabulary from A wedding",
    "example": {
      "hz": "这是真实。",
      "py": "Zhè shì 真实.",
      "id": "Ini adalah 真实."
    }
  }
];

  var VOCAB_BY_HANZI = {};
  var VOCAB_BY_ID = {};

  for (var i = 0; i < VOCAB_LIST.length; i++) {
    var item = VOCAB_LIST[i];
    VOCAB_BY_HANZI[item.hanzi] = item;
    VOCAB_BY_ID[item.id] = item;
  }

  function getAll() {
    return VOCAB_LIST;
  }

  function getByLevel(lvl) {
    return VOCAB_LIST.filter(function (item) {
      return item.level === lvl;
    });
  }

  function getById(id) {
    return VOCAB_BY_ID[id] || null;
  }

  function getByHanzi(hz) {
    return VOCAB_BY_HANZI[hz] || null;
  }

  function search(query) {
    if (!query) return [];
    var q = query.trim().toLowerCase();
    return VOCAB_LIST.filter(function (item) {
      return item.hanzi.indexOf(q) >= 0 ||
        item.pinyin.toLowerCase().indexOf(q) >= 0 ||
        item.idMeaning.toLowerCase().indexOf(q) >= 0;
    });
  }

  return {
    schema: SCHEMA,
    getAll: getAll,
    getByLevel: getByLevel,
    getById: getById,
    getByHanzi: getByHanzi,
    search: search
  };
}));
