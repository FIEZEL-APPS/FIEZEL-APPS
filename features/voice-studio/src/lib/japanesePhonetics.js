/**
 * FIEZEL Japanese Phonetics & Furigana Engine
 *
 * Provides:
 * 1. tokenizeJapaneseToRuby: Tokenizes Japanese text into ruby tokens (<ruby>kanji<rt>kana</rt></ruby>)
 * 2. toPhoneticRomaji: Accurate Hepburn romaji transliteration strictly following Japanese vocal rules:
 *    - Topic particle は -> "wa" (e.g. 私は -> "watashi wa", 今日は -> "kyou wa", これは -> "kore wa")
 *    - Object particle を -> "o" (e.g. 本を -> "hon o", コーヒーを -> "koohii o")
 *    - Direction particle へ -> "e" (e.g. 日本へ -> "nihon e", 学校へ -> "gakkou e")
 *    - Greetings: こんにちは -> "konnichiwa", こんばんは -> "konbanwa", では -> "dewa"
 *    - Accurate vowels & long vowels: おう/おお -> "ou"/"oo", ー -> lengthened vowel
 *    - Sokuon っ: double consonant (e.g. ちょっと -> "chotto", 良かった -> "yokatta", 落としちゃった -> "otoshichatta")
 *    - Accurate yoon: きゃ/しゃ/ちゃ/じゃ/にゃ/ひゃ/みゃ/りゃ
 *    - Zero emojis and zero emoticon words!
 */



const KANJI_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005]/;

// Common Japanese dictionary: Kanji -> { kana, romaji }
const KANJI_DICT = {
  // Conversational Greetings, Introductions & Common Phrases
  'はじめまして': { kana: 'はじめまして', romaji: 'hajimemashite' },
  'よろしくお願': { kana: 'よろしくおねが', romaji: 'yoroshiku onega' },
  'よろしくお願いします': { kana: 'よろしくおねがいします', romaji: 'yoroshiku onegaishimasu' },
  'お世話': { kana: 'おせわ', romaji: 'o-sewa' },
  'お世話になっております': { kana: 'おせわになっております', romaji: 'o-sewa ni natte orimasu' },
  'お疲れ様': { kana: 'おつかれさま', romaji: 'otsukaresama' },
  'お疲れ様です': { kana: 'おつかれさまです', romaji: 'otsukaresama desu' },
  'お疲れ': { kana: 'おつかれ', romaji: 'otsukare' },
  '疲れ': { kana: 'つかれ', romaji: 'tsukare' },
  '疲れた': { kana: 'つかれた', romaji: 'tsukareta' },
  '疲れて': { kana: 'つかれて', romaji: 'tsukarete' },
  'お返事': { kana: 'おへんじ', romaji: 'o-henji' },
  '返事': { kana: 'へんじ', romaji: 'henji' },
  'お話し': { kana: 'おはなし', romaji: 'o-hanashi' },
  'お喋り': { kana: 'おしゃべり', romaji: 'o-shaberi' },
  '喋り': { kana: 'しゃべり', romaji: 'shaberi' },
  '喋る': { kana: 'しゃべる', romaji: 'shaberu' },
  '喋って': { kana: 'しゃべって', romaji: 'shabette' },
  '気軽に': { kana: 'きがるに', romaji: 'kigaru ni' },
  '気軽': { kana: 'きがる', romaji: 'kigaru' },
  '嬉しい': { kana: 'うれしい', romaji: 'ureshii' },
  '嬉しかった': { kana: 'うれしかった', romaji: 'ureshikatta' },
  '嬉しく': { kana: 'うれしく', romaji: 'ureshiku' },
  '喜ぶ': { kana: 'よろこぶ', romaji: 'yorokobu' },
  '喜び': { kana: 'よろこび', romaji: 'yorokobi' },
  '嫌': { kana: 'いや', romaji: 'iya' },
  '嫌な': { kana: 'いやな', romaji: 'iya na' },
  '嫌い': { kana: 'きらい', romaji: 'kirai' },
  '愚痴': { kana: 'ぐち', romaji: 'guchi' },
  '範囲': { kana: 'はんい', romaji: 'han\'i' },
  '無理': { kana: 'むり', romaji: 'muri' },
  '大丈夫': { kana: 'だいじょうぶ', romaji: 'daijoubu' },
  '全然': { kana: 'ぜんぜん', romaji: 'zenzen' },
  '証拠': { kana: 'しょうこ', romaji: 'shouko' },
  '意地悪': { kana: 'いじわる', romaji: 'ijiwaru' },
  '素晴らしい': { kana: 'すばらしい', romaji: 'subarashii' },
  '素敵': { kana: 'すてき', romaji: 'suteki' },
  '冗談': { kana: 'じょうだん', romaji: 'joudan' },
  '相談': { kana: 'そうだん', romaji: 'soudan' },
  '意味': { kana: 'いみ', romaji: 'imi' },
  '意見': { kana: 'いけん', romaji: 'iken' },
  '理由': { kana: 'りゆう', romaji: 'riyuu' },
  '夢': { kana: 'ゆめ', romaji: 'yume' },
  '接客': { kana: 'せっきゃく', romaji: 'sekkyaku' },
  '体験': { kana: 'たいけん', romaji: 'taiken' },
  '経験': { kana: 'けいけん', romaji: 'keiken' },
  '色々': { kana: 'いろいろ', romaji: 'iroiro' },
  '興味': { kana: 'きょうみ', romaji: 'kyoumi' },
  '趣味': { kana: 'しゅみ', romaji: 'shumi' },
  '職種': { kana: 'しょくしゅ', romaji: 'shokushu' },
  '職業': { kana: 'しょくぎょう', romaji: 'shokugyou' },
  '仕事': { kana: 'しごと', romaji: 'shigoto' },
  'お仕事': { kana: 'おしごと', romaji: 'o-shigoto' },
  '一生懸命': { kana: 'いっしょうけんめい', romaji: 'isshoukenmei' },
  '一生': { kana: 'いっしょう', romaji: 'isshou' },
  '命': { kana: 'いのち', romaji: 'inochi' },
  '気持ち': { kana: 'きもち', romaji: 'kimochi' },
  '意欲': { kana: 'いよく', romaji: 'iyoku' },
  '食欲': { kana: 'しょくよく', romaji: 'shokuyoku' },
  '今度': { kana: 'こんど', romaji: 'kondo' },
  '何度': { kana: 'なんど', romaji: 'nando' },
  '一度': { kana: 'いちど', romaji: 'ichido' },
  '悲しい': { kana: 'かなしい', romaji: 'kanashii' },
  '辛い': { kana: 'つらい', romaji: 'tsurai' },
  '辛さ': { kana: 'からさ', romaji: 'karasa' },
  '間違い': { kana: 'まちがい', romaji: 'machigai' },
  '手伝い': { kana: 'てつだい', romaji: 'tetsudai' },
  'お手伝い': { kana: 'おてつだい', romaji: 'o-tetsudai' },

  // Pronouns & People
  '私': { kana: 'わたし', romaji: 'watashi' },
  '僕': { kana: 'ぼく', romaji: 'boku' },
  '俺': { kana: 'おれ', romaji: 'ore' },
  '君': { kana: 'きみ', romaji: 'kimi' },
  'あなた': { kana: 'あなた', romaji: 'anata' },
  '彼': { kana: 'かれ', romaji: 'kare' },
  '彼女': { kana: 'かのじょ', romaji: 'kanojo' },
  '誰': { kana: 'だれ', romaji: 'dare' },
  '何': { kana: 'なに', romaji: 'nani' },
  '先生': { kana: 'せんせい', romaji: 'sensei' },
  '先輩': { kana: 'せんぱい', romaji: 'senpai' },
  '友達': { kana: 'ともだち', romaji: 'tomodachi' },
  '学生': { kana: 'がくせい', romaji: 'gakusei' },
  '生徒': { kana: 'せいと', romaji: 'seito' },
  '人': { kana: 'ひと', romaji: 'hito' },
  '大人': { kana: 'おとな', romaji: 'otona' },
  '男': { kana: 'おとこ', romaji: 'otoko' },
  '女': { kana: 'おんな', romaji: 'onna' },
  '子供': { kana: 'こども', romaji: 'kodomo' },
  '家族': { kana: 'かぞく', romaji: 'kazoku' },
  '両親': { kana: 'りょうしん', romaji: 'ryoushin' },
  '父': { kana: 'ちち', romaji: 'chichi' },
  'お父さん': { kana: 'おとうさん', romaji: 'otousan' },
  '母': { kana: 'はは', romaji: 'haha' },
  'お母さん': { kana: 'おかあさん', romaji: 'okaasan' },
  '兄': { kana: 'あに', romaji: 'ani' },
  'お兄さん': { kana: 'おにいさん', romaji: 'oniisan' },
  '姉': { kana: 'あね', romaji: 'ane' },
  'お姉さん': { kana: 'おねえさん', romaji: 'oneesan' },
  '弟': { kana: 'おとうと', romaji: 'otouto' },
  '妹': { kana: 'いもうと', romaji: 'imouto' },
  '七海': { kana: 'ななみ', romaji: 'Nanami' },
  '七海先生': { kana: 'ななみせんせい', romaji: 'Nanami-sensei' },
  '健太': { kana: 'けんた', romaji: 'Keita' },
  '健太先輩': { kana: 'けんたせんぱい', romaji: 'Keita-senpai' },
  '田中': { kana: 'たなか', romaji: 'Tanaka' },
  '田中さん': { kana: 'たなかさん', romaji: 'Tanaka-san' },
  '店員': { kana: 'てんいん', romaji: 'ten\'in' },
  '店長': { kana: 'てんちょう', romaji: 'tenchou' },
  'お客様': { kana: 'おきゃくさま', romaji: 'o-kyaku-sama' },
  '客': { kana: 'きゃく', romaji: 'kyaku' },
  '他人': { kana: 'たにん', romaji: 'tanin' },
  '自分': { kana: 'じぶん', romaji: 'jibun' },
  '一緒': { kana: 'いっしょ', romaji: 'issho' },

  // Food, Drinks & Dining
  '魚料理': { kana: 'さかなりょうり', romaji: 'sakana ryouri' },
  '料理法': { kana: 'りょうりほう', romaji: 'ryourihou' },
  '料理': { kana: 'りょうり', romaji: 'ryouri' },
  '魚': { kana: 'さかな', romaji: 'sakana' },
  '鮭': { kana: 'さけ', romaji: 'sake' },
  'お刺身': { kana: 'おさしみ', romaji: 'o-sashimi' },
  '刺身': { kana: 'さしみ', romaji: 'sashimi' },
  '焼き魚': { kana: 'やきざかな', romaji: 'yakizakana' },
  '焼き鳥': { kana: 'やきとり', romaji: 'yakitori' },
  '焼き肉': { kana: 'やきにく', romaji: 'yakiniku' },
  '焼き': { kana: 'やき', romaji: 'yaki' },
  '焼魚': { kana: 'やきざかな', romaji: 'yakizakana' },
  '塩気': { kana: 'しおけ', romaji: 'shioke' },
  '塩': { kana: 'しお', romaji: 'shio' },
  'ご飯': { kana: 'ごはん', romaji: 'gohan' },
  'お供': { kana: 'おとも', romaji: 'o-tomo' },
  '肉': { kana: 'にく', romaji: 'niku' },
  '牛肉': { kana: 'ぎゅうにく', romaji: 'gyuuniku' },
  '豚肉': { kana: 'ぶたにく', romaji: 'butaniku' },
  '鶏肉': { kana: 'とりにく', romaji: 'toriniku' },
  '野菜': { kana: 'やさい', romaji: 'yasai' },
  '果物': { kana: 'くだもの', romaji: 'kudamono' },
  '朝ご飯': { kana: 'あさごはん', romaji: 'asagohan' },
  '昼ご飯': { kana: 'ひるごはん', romaji: 'hirugohan' },
  '晩ご飯': { kana: 'ばんごはん', romaji: 'bangohan' },
  '食事': { kana: 'しょくじ', romaji: 'shokuji' },
  '食べ物': { kana: 'たべもの', romaji: 'tabemono' },
  '飲み物': { kana: 'のみもの', romaji: 'nomimono' },
  'お茶': { kana: 'おちゃ', romaji: 'o-cha' },
  '水': { kana: 'みず', romaji: 'mizu' },
  'お湯': { kana: 'おゆ', romaji: 'o-yu' },
  'お酒': { kana: 'おさけ', romaji: 'o-sake' },
  '酒': { kana: 'さけ', romaji: 'sake' },
  '砂糖': { kana: 'さとう', romaji: 'satou' },
  '味': { kana: 'あじ', romaji: 'aji' },
  '甘い': { kana: 'あまい', romaji: 'amai' },
  '辛い': { kana: 'からい', romaji: 'karai' },
  '苦い': { kana: 'にがい', romaji: 'nigai' },
  '酸っぱい': { kana: 'すっぱい', romaji: 'suppai' },

  // Time & Days
  '一日': { kana: 'いちにち', romaji: 'ichinichi' },
  '今日': { kana: 'きょう', romaji: 'kyou' },
  '今': { kana: 'いま', romaji: 'ima' },
  '明日': { kana: 'あした', romaji: 'ashita' },
  '昨日': { kana: 'きのう', romaji: 'kinou' },
  '毎日': { kana: 'まいにち', romaji: 'mainichi' },
  '時間': { kana: 'じかん', romaji: 'jikan' },
  '朝': { kana: 'あさ', romaji: 'asa' },
  '昼': { kana: 'ひる', romaji: 'hiru' },
  '夜': { kana: 'よる', romaji: 'yoru' },
  '今夜': { kana: 'こんや', romaji: 'kon\'ya' },
  '今週': { kana: 'こんしゅう', romaji: 'konshuu' },
  '今週末': { kana: 'こんしゅうまつ', romaji: 'konshuumatsu' },
  '週末': { kana: 'しゅうまつ', romaji: 'shuumatsu' },
  '来週': { kana: 'らいしゅう', romaji: 'raishuu' },
  '先週': { kana: 'せんしゅう', romaji: 'senshuu' },
  '来週末': { kana: 'らいしゅうまつ', romaji: 'raishuumatsu' },
  '月曜日': { kana: 'げつようび', romaji: 'getsuyoubi' },
  '火曜日': { kana: 'かようび', romaji: 'kayoubi' },
  '水曜日': { kana: 'すいようび', romaji: 'suiyoubi' },
  '木曜日': { kana: 'もくようび', romaji: 'mokuyoubi' },
  '金曜日': { kana: 'きんようび', romaji: 'kinyoubi' },
  '土曜日': { kana: 'どようび', romaji: 'doyoubi' },
  '日曜日': { kana: 'にちようび', romaji: 'nichiyoubi' },
  '何時': { kana: 'なんじ', romaji: 'nanji' },
  '最近': { kana: 'さいきん', romaji: 'saikin' },
  '今年': { kana: 'ことし', romaji: 'kotoshi' },
  '来年': { kana: 'らいねん', romaji: 'rainen' },
  '去年': { kana: 'きょねん', romaji: 'kyonen' },
  '時': { kana: 'とき', romaji: 'toki' },
  '予定': { kana: 'よてい', romaji: 'yotei' },
  '春': { kana: 'はる', romaji: 'haru' },
  '夏': { kana: 'なつ', romaji: 'natsu' },
  '秋': { kana: 'あき', romaji: 'aki' },
  '冬': { kana: 'ふゆ', romaji: 'fuyu' },

  // Numbers & Counters
  '一番': { kana: 'いちばん', romaji: 'ichiban' },
  '二番': { kana: 'にばん', romaji: 'niban' },
  '三番': { kana: 'さんばん', romaji: 'sanban' },
  '一回': { kana: 'いっかい', romaji: 'ikkai' },
  '二回': { kana: 'にかい', romaji: 'nikai' },
  '何回': { kana: 'なんかい', romaji: 'nankai' },
  '一つ': { kana: 'ひとつ', romaji: 'hitotsu' },
  '二つ': { kana: 'ふたつ', romaji: 'futatsu' },
  '三つ': { kana: 'みっつ', romaji: 'mittsu' },
  '一人': { kana: 'ひとり', romaji: 'hitori' },
  '二人': { kana: 'ふたり', romaji: 'futari' },

  // Nouns, School, Places & Objects
  '目覚まし時計': { kana: 'めざましどけい', romaji: 'mezamashidokei' },
  '目覚まし': { kana: 'めざまし', romaji: 'mezamashi' },
  '時計': { kana: 'とけい', romaji: 'tokei' },
  '画面': { kana: 'がめん', romaji: 'gamen' },
  '無事': { kana: 'ぶじ', romaji: 'buji' },
  '日本語': { kana: 'にほんご', romaji: 'nihongo' },
  '日本': { kana: 'にほん', romaji: 'nihon' },
  '英語': { kana: 'えいご', romaji: 'eigo' },
  'インドネシア語': { kana: 'いんどねしあご', romaji: 'indoneshia-go' },
  '言葉': { kana: 'ことば', romaji: 'kotoba' },
  '名前': { kana: 'なまえ', romaji: 'namae' },
  '勉強': { kana: 'べんきょう', romaji: 'benkyou' },
  '練習': { kana: 'れんしゅう', romaji: 'renshuu' },
  '宿題': { kana: 'しゅくだい', romaji: 'shukudai' },
  '教科書': { kana: 'きょうかしょ', romaji: 'kyoukasho' },
  '質問': { kana: 'しつもん', romaji: 'shitsumon' },
  '問題': { kana: 'もんだい', romaji: 'mondai' },
  '答え': { kana: 'こたえ', romaji: 'kotae' },
  '学校': { kana: 'がっこう', romaji: 'gakkou' },
  '大学': { kana: 'だいがく', romaji: 'daigaku' },
  '図書館': { kana: 'としょかん', romaji: 'toshokan' },
  '部屋': { kana: 'へや', romaji: 'heya' },
  '家': { kana: 'いえ', romaji: 'ie' },
  '駅': { kana: 'えき', romaji: 'eki' },
  '電車': { kana: 'でんしゃ', romaji: 'densha' },
  '本': { kana: 'ほん', romaji: 'hon' },
  '電話': { kana: 'でんわ', romaji: 'denwa' },
  '写真': { kana: 'しゃしん', romaji: 'shashin' },
  '車': { kana: 'くるま', romaji: 'kuruma' },
  '道': { kana: 'みち', romaji: 'michi' },
  '店': { kana: 'みせ', romaji: 'mise' },
  '店内': { kana: 'てんない', romaji: 'tennai' },
  '持ち帰り': { kana: 'もちかえり', romaji: 'mochikaeri' },
  '天気': { kana: 'てんき', romaji: 'tenki' },
  '雨': { kana: 'あめ', romaji: 'ame' },
  '元気': { kana: 'げんき', romaji: 'genki' },
  '本当': { kana: 'ほんとう', romaji: 'hontou' },
  '大切': { kana: 'たいせつ', romaji: 'taisetsu' },
  '場所': { kana: 'ばしょ', romaji: 'basho' },
  '会社': { kana: 'かいしゃ', romaji: 'kaisha' },
  '病院': { kana: 'びょういん', romaji: 'byouin' },
  '手紙': { kana: 'てがみ', romaji: 'tegami' },
  'お金': { kana: 'おかね', romaji: 'o-kane' },
  '服': { kana: 'ふく', romaji: 'fuku' },
  '旅行': { kana: 'りょこう', romaji: 'ryokou' },
  '買い物': { kana: 'かいもの', romaji: 'kaimono' },

  // Adjectives
  '面白い': { kana: 'おもしろい', romaji: 'omoshiroi' },
  '面白かった': { kana: 'おもしろかった', romaji: 'omoshirokatta' },
  '面白': { kana: 'おもしろ', romaji: 'omoshiro' },
  '楽しい': { kana: 'たのしい', romaji: 'tanoshii' },
  '楽しかった': { kana: 'たのしかった', romaji: 'tanoshikatta' },
  '楽しみ': { kana: 'たのしみ', romaji: 'tanoshimi' },
  '良い': { kana: 'よい', romaji: 'yoi' },
  '良かった': { kana: 'よかった', romaji: 'yokatta' },
  '美味しい': { kana: 'おいしい', romaji: 'oishii' },
  '美味しかった': { kana: 'おいしかった', romaji: 'oishikatta' },
  '大きい': { kana: 'おおきい', romaji: 'ookii' },
  '小さい': { kana: 'ちいさい', romaji: 'chiisai' },
  '新しい': { kana: 'あたらしい', romaji: 'atarashii' },
  '古い': { kana: 'ふるい', romaji: 'furui' },
  '高い': { kana: 'たかい', romaji: 'takai' },
  '安い': { kana: 'やすい', romaji: 'yasui' },
  '近い': { kana: 'ちかい', romaji: 'chikai' },
  '遠い': { kana: 'とおい', romaji: 'tooi' },
  '早い': { kana: 'はやい', romaji: 'hayai' },
  '遅い': { kana: 'おそい', romaji: 'osoi' },
  '難しい': { kana: 'むずかしい', romaji: 'muzukashii' },
  '優しい': { kana: 'やさしい', romaji: 'yasashii' },
  '好き': { kana: 'すき', romaji: 'suki' },
  '大好き': { kana: 'だいすき', romaji: 'daisuki' },
  '上手': { kana: 'じょうず', romaji: 'jouzu' },
  '下手': { kana: 'へた', romaji: 'heta' },
  '得意': { kana: 'とくい', romaji: 'tokui' },
  '苦手': { kana: 'にがて', romaji: 'nigate' },
  '忙しい': { kana: 'いそがしい', romaji: 'isogashii' },
  '暇': { kana: 'ひま', romaji: 'hima' },
  '便利': { kana: 'べんり', romaji: 'benri' },
  '有名': { kana: 'ゆうめい', romaji: 'yuumei' },
  '親切': { kana: 'しんせつ', romaji: 'shinsetsu' },
  '簡単': { kana: 'かんたん', romaji: 'kantan' },
  '静か': { kana: 'しずか', romaji: 'shizuka' },
  '賑やか': { kana: 'にぎやか', romaji: 'nigiyaka' },

  // Verbs & verb stems
  '落としちゃった': { kana: 'おとしちゃった', romaji: 'otoshichatta' },
  '落とす': { kana: 'おとす', romaji: 'otosu' },
  '止めよう': { kana: 'とめよう', romaji: 'tomeyou' },
  '止める': { kana: 'とめる', romaji: 'tomeru' },
  '行きます': { kana: 'いきます', romaji: 'ikimasu' },
  '行く': { kana: 'いく', romaji: 'iku' },
  '行って': { kana: 'いって', romaji: 'itte' },
  '来ます': { kana: 'きます', romaji: 'kimasu' },
  '来る': { kana: 'くる', romaji: 'kuru' },
  '食べます': { kana: 'たべます', romaji: 'tabemasu' },
  '食べる': { kana: 'たべる', romaji: 'taberu' },
  '食べた': { kana: 'たべた', romaji: 'tabeta' },
  '食べて': { kana: 'たべて', romaji: 'tabete' },
  '飲みます': { kana: 'のみます', romaji: 'nomimasu' },
  '飲む': { kana: 'のむ', romaji: 'nomu' },
  '飲んだ': { kana: 'のんだ', romaji: 'nonda' },
  '飲んで': { kana: 'のんで', romaji: 'nonde' },
  '見ます': { kana: 'みます', romaji: 'mimasu' },
  '見る': { kana: 'みる', romaji: 'miru' },
  '見た': { kana: 'みた', romaji: 'mita' },
  '見て': { kana: 'みて', romaji: 'mite' },
  '見てみる': { kana: 'みてみる', romaji: 'mite miru' },
  '見ると': { kana: 'みると', romaji: 'miru to' },
  '見せる': { kana: 'みせる', romaji: 'miseru' },
  '聞きます': { kana: 'ききます', romaji: 'kikimasu' },
  '聞く': { kana: 'きく', romaji: 'kiku' },
  '聞いた': { kana: 'きいた', romaji: 'kiita' },
  '聞いて': { kana: 'きいて', romaji: 'kiite' },
  '聞ける': { kana: 'きける', romaji: 'kikeru' },
  '話します': { kana: 'はなします', romaji: 'hanashimasu' },
  '話す': { kana: 'はなす', romaji: 'hanasu' },
  '話した': { kana: 'はなした', romaji: 'hanashita' },
  '話して': { kana: 'はなして', romaji: 'hanashite' },
  '話せる': { kana: 'はなせる', romaji: 'hanaseru' },
  '話そ': { kana: 'はなそ', romaji: 'hanaso' },
  '話そう': { kana: 'はなそう', romaji: 'hanasou' },
  '話': { kana: 'はなし', romaji: 'hanashi' },
  '読みます': { kana: 'よみます', romaji: 'yomimasu' },
  '読む': { kana: 'よむ', romaji: 'yomu' },
  '読んだ': { kana: 'よんだ', romaji: 'yonda' },
  '買います': { kana: 'かいます', romaji: 'kaimasu' },
  '買う': { kana: 'かう', romaji: 'kau' },
  '買った': { kana: 'かった', romaji: 'katta' },
  '言います': { kana: 'いいます', romaji: 'iimasu' },
  '言う': { kana: 'いう', romaji: 'iu' },
  '言った': { kana: 'いった', romaji: 'itta' },
  '言って': { kana: 'いって', romaji: 'itte' },
  '言える': { kana: 'いえる', romaji: 'ieru' },
  '会います': { kana: 'あいます', romaji: 'aimasu' },
  '会う': { kana: 'あう', romaji: 'au' },
  '会った': { kana: 'あった', romaji: 'atta' },
  '待ちます': { kana: 'まちます', romaji: 'machimasu' },
  '待つ': { kana: 'まつ', romaji: 'matsu' },
  '待って': { kana: 'まって', romaji: 'matte' },
  '出ます': { kana: 'でます', romaji: 'demasu' },
  '出る': { kana: 'でる', romaji: 'deru' },
  '出た': { kana: 'でた', romaji: 'deta' },
  '寝ます': { kana: 'ねます', romaji: 'nemasu' },
  '寝る': { kana: 'ねる', romaji: 'neru' },
  '起きます': { kana: 'おきます', romaji: 'okimasu' },
  '起きる': { kana: 'おきる', romaji: 'okiru' },
  '始まります': { kana: 'はじまります', romaji: 'hajimarimasu' },
  '始める': { kana: 'はじめる', romaji: 'hajimeru' },
  '終わります': { kana: 'おわります', romaji: 'owarimasu' },
  '終わる': { kana: 'おわる', romaji: 'owaru' },
  '教えます': { kana: 'おしえます', romaji: 'oshiemasu' },
  '教える': { kana: 'おしえる', romaji: 'oshieru' },
  '教えて': { kana: 'おしえて', romaji: 'oshiete' },
  '思います': { kana: 'おもいます', romaji: 'omoimasu' },
  '思う': { kana: 'おもう', romaji: 'omou' },
  '思って': { kana: 'おもって', romaji: 'omette' },
  '分かります': { kana: 'わかります', romaji: 'wakarimasu' },
  '分かる': { kana: 'わかる', romaji: 'wakaru' },
  '分かった': { kana: 'わかった', romaji: 'wakatta' },
  '分からない': { kana: 'わからない', romaji: 'wakaranai' },
  '分からなかった': { kana: 'わからなかった', romaji: 'wakaranakatta' },
  '知ります': { kana: 'しります', romaji: 'shirimasu' },
  '知る': { kana: 'しる', romaji: 'shiru' },
  '知って': { kana: 'しって', romaji: 'shitte' },
  '知りたい': { kana: 'しりたい', romaji: 'shiritai' },
  '知らない': { kana: 'しらない', romaji: 'shiranai' },
  '作ります': { kana: 'つくります', romaji: 'tsukurimasu' },
  '作る': { kana: 'つくる', romaji: 'tsukuru' },
  '作って': { kana: 'つくって', romaji: 'tsukutte' },
  '作ろう': { kana: 'つくろう', romaji: 'tsukurou' },
  '進みます': { kana: 'すすみます', romaji: 'susumimasu' },
  '進む': { kana: 'すすむ', romaji: 'susumu' },
  '進んで': { kana: 'すすんで', romaji: 'susunde' },
  '効きます': { kana: 'ききます', romaji: 'kikimasu' },
  '効く': { kana: 'きく', romaji: 'kiku' },
  '効いて': { kana: 'きいて', romaji: 'kiite' },
  '休む': { kana: 'やすむ', romaji: 'yasumu' },
  '休んで': { kana: 'やすんで', romaji: 'yasunde' },
  '休んだ': { kana: 'やすんだ', romaji: 'yasunda' },
  '働きます': { kana: 'はたらきます', romaji: 'hatarakimasu' },
  '働く': { kana: 'はたらく', romaji: 'hataraku' },
  '働いて': { kana: 'はたらいて', romaji: 'hataraite' },
  '頑張って': { kana: 'がんばって', romaji: 'ganbatte' },
  '頑張る': { kana: 'がんばる', romaji: 'ganbaru' },
  '笑': { kana: 'わら', romaji: 'wara' },
  '笑う': { kana: 'わらう', romaji: 'warau' },
  '怒る': { kana: 'おこる', romaji: 'okoru' },
  '怒られる': { kana: 'おこられる', romaji: 'okorareru' },
  '間違って': { kana: 'まちがって', romaji: 'machigatte' },
  '手伝う': { kana: 'てつだう', romaji: 'tetsudau' },
  '助かる': { kana: 'たすかる', romaji: 'tasukaru' },
};

// Kanji single-character stem fallback
const KANJI_SINGLE_CHAR_STEMS = {
  '私': 'わたし',
  '僕': 'ぼく',
  '君': 'きみ',
  '彼': 'かれ',
  '人': 'ひと',
  '男': 'おとこ',
  '女': 'おんな',
  '今': 'いま',
  '朝': 'あさ',
  '昼': 'ひる',
  '夜': 'よる',
  '本': 'ほん',
  '家': 'いえ',
  '駅': 'えき',
  '道': 'みち',
  '車': 'くるま',
  '店': 'みせ',
  '雨': 'あめ',
  '何': 'なに',
  '行': 'い',
  '来': 'き',
  '食': 'た',
  '飲': 'の',
  '見': 'み',
  '聞': 'き',
  '話': 'はな',
  '読': 'よ',
  '買': 'か',
  '言': 'い',
  '会': 'あ',
  '待': 'ま',
  '出': 'で',
  '寝': 'ね',
  '起': 'お',
  '始': 'はじ',
  '終': 'お',
  '休': 'やす',
  '思': 'おも',
  '分': 'わ',
  '教': 'おし',
  '落': 'お',
  '止': 'と',
  '好': 'す',
  '大': 'おお',
  '小': 'ちい',
  '新': 'あたら',
  '古': 'ふる',
  '高': 'たか',
  '安': 'やす',
  '早': 'はや',
  '良': 'よ',
  '多': 'おお',
  '少': 'すく',
  '笑': 'わら',
  '嬉': 'うれ',
  '喜': 'よろこ',
  '気': 'き',
  '軽': 'かる',
  '返': 'へん',
  '事': 'じ',
  '一': 'いち',
  '二': 'に',
  '三': 'さん',
  '四': 'よん',
  '五': 'ご',
  '六': 'ろく',
  '七': 'なな',
  '八': 'はち',
  '九': 'きゅう',
  '十': 'じゅう',
  '百': 'ひゃく',
  '千': 'せん',
  '万': 'まん',
  '円': 'えん',
  '日': 'ひ',
  '嫌': 'いや',
  '範': 'はん',
  '囲': 'い',
  '愚': 'ぐ',
  '痴': 'ち',
  '時': 'とき',
  '末': 'まつ',
  '楽': 'たの',
  '予': 'よ',
  '定': 'てい',
  '仕': 'し',
  '疲': 'つか',
  '様': 'さま',
  '無': 'む',
  '理': 'り',
  '喋': 'しゃべ',
  '番': 'ばん',
  '美': 'おい',
  '味': 'あじ',
  '塩': 'しお',
  '進': 'すす',
  '飯': 'はん',
  '供': 'とも',
  '料': 'りょう',
  '法': 'ほう',
  '特': 'とく',
  '鮭': 'さけ',
  '刺': 'さし',
  '身': 'み',
  '焼': 'や',
  '効': 'き',
  '辛': 'から',
  '全': 'ぜん',
  '然': 'ぜん',
  '証': 'しょう',
  '拠': 'きょ',
  '意': 'い',
  '地': 'じ',
  '悪': 'わる',
  '素': 'す',
  '晴': 'ば',
  '夢': 'ゆめ',
  '接': 'せっ',
  '客': 'きゃく',
  '体': 'たい',
  '験': 'けん',
  '色': 'いろ',
  '々': '',
  '興': 'きょう',
  '職': 'しょく',
  '種': 'しゅ',
  '生': 'せい',
  '懸': 'けん',
  '命': 'めい',
  '敵': 'てき',
  '冗': 'じょう',
  '談': 'だん',
  '知': 'し',
  '他': 'ほか',
  '作': 'つく',
  '欲': 'よく',
  '度': 'ど',
  '悲': 'かな',
  '違': 'ちが',
  '怒': 'おこ',
  '伝': 'つた',
  '助': 'たす',
  '旅': 'たび',
  '親': 'おや',
  '父': 'ちち',
  '母': 'はは',
  '兄': 'あに',
  '姉': 'あね',
  '弟': 'おとうと',
  '妹': 'いもうと',
  '春': 'はる',
  '夏': 'なつ',
  '秋': 'あき',
  '冬': 'ふゆ',
  '暑': 'あつ',
  '寒': 'さむ',
  '暖': 'あたた',
  '涼': 'すず',
  '肉': 'にく',
  '牛': 'ぎゅう',
  '豚': 'ぶた',
  '鳥': 'とり',
  '野': 'や',
  '菜': 'さい',
  '果': 'くだ',
  '物': 'もの',
  '甘': 'あま',
  '苦': 'にが',
  '酸': 'す',
  '茶': 'ちゃ',
  '水': 'みず',
  '湯': 'ゆ',
  '酒': 'さけ',
  '町': 'まち',
  '街': 'まち',
  '海': 'うみ',
  '山': 'やま',
  '川': 'かわ',
  '空': 'そら',
  '鉄': 'てつ',
  '線': 'せん',
  '機': 'き',
  '港': 'こう',
  '病': 'びょう',
  '院': 'いん',
  '薬': 'くすり',
  '歩': 'ある',
  '走': 'はし',
  '立': 'た',
  '座': 'すわ',
  '置': 'お',
  '取': 'と',
  '持': 'も',
  '使': 'つか',
  '洗': 'あら',
  '呼': 'よ',
  '頼': 'たの',
  '探': 'さが',
  '考': 'かんが',
  '覚': 'おぼ',
  '忘': 'わす',
  '貸': 'か',
  '借': 'か',
  '送': 'おく',
  '受': 'う',
  '払': 'はら',
  '計': 'けい',
  '収': 'しゅう',
  '便': 'べん',
  '利': 'り',
  '有': 'ゆう',
  '名': 'めい',
  '静': 'しず',
  '賑': 'にぎ',
  '暇': 'ひま',
  '忙': 'いそが',
  '簡': 'かん',
  '単': 'たん',
  '複': 'ふく',
  '雑': 'ざつ',
  '危': 'き',
  '険': 'けん',
  '心': 'しん',
  '配': 'ぱい',
  '要': 'よう',
  '初': 'しょ',
  '部': 'ぶ',
  '半': 'はん',
  '同': 'おな',
  '嘘': 'うそ',
};

// Kana to Romaji mapping table
const KANA_MAP = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'o', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
  'ゔ': 'vu',
};

const YOON_MAP = {
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  'ふぁ': 'fa', 'ふぃ': 'fi', 'ふぇ': 'fe', 'ふぉ': 'fo',
  'てぃ': 'ti', 'でぃ': 'di', 'うぃ': 'wi', 'うぇ': 'we',
};

// Convert Katakana to Hiragana
export function katakanaToHiragana(text) {
  return text.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// Strip emojis, emoticons, and action words completely
export function stripEmojisAndEmotWords(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\*.*?\*|\(.*?\)|\[.*?\]|（.*?）/g, '')
    .replace(/\b(?:smiling|grinning|beaming|laughing|winking)\s+face(?:\s+with\s+[^.,!?:;]+)?/gi, '')
    .replace(/\b(?:face\s+with\s+tears\s+of\s+joy|rofl|lol|lmao)\b/gi, '')
    .replace(/\b(?:wajah\s+tersenyum|senyum\s+lebar|tertawa|senyuman)\b/gi, '')
    .replace(/\(\s*\)|\[\s*\]|（\s*）/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Tokenize Japanese text into Ruby tokens for HTML rendering.
 */
export function tokenizeJapaneseToRuby(rawText) {
  const clean = stripEmojisAndEmotWords(rawText);
  if (!clean) return [];

  const tokens = [];
  let i = 0;

  // Sort dictionary keys by descending length
  const dictKeys = Object.keys(KANJI_DICT).sort((a, b) => b.length - a.length);

  while (i < clean.length) {
    // 1. Try dictionary match (longest match first)
    let matched = false;
    for (const word of dictKeys) {
      if (clean.startsWith(word, i)) {
        tokens.push({
          text: word,
          ruby: KANJI_DICT[word].kana,
          isKanji: KANJI_REGEX.test(word),
        });
        i += word.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 2. Try single kanji stem match
    const ch = clean[i];
    if (KANJI_REGEX.test(ch)) {
      const stem = KANJI_SINGLE_CHAR_STEMS[ch] || '';
      tokens.push({
        text: ch,
        ruby: stem || undefined,
        isKanji: true,
      });
      i += 1;
      continue;
    }

    // 3. Non-kanji segment (kana, Latin, punctuation, spaces)
    let j = i;
    while (j < clean.length && !KANJI_REGEX.test(clean[j])) {
      j += 1;
    }
    const nonKanjiChunk = clean.slice(i, j);
    tokens.push({
      text: nonKanjiChunk,
      isKanji: false,
    });
    i = j;
  }

  return tokens;
}

/**
 * Render HTML with <ruby> and <rt> tags.
 */
export function renderFuriganaHtml(rawText) {
  const tokens = tokenizeJapaneseToRuby(rawText);
  return tokens
    .map((tk) => {
      if (tk.isKanji && tk.ruby) {
        return `<ruby class="fz-ja-ruby">${tk.text}<rt class="fz-ja-rt">${tk.ruby}</rt></ruby>`;
      }
      return tk.text;
    })
    .join('');
}

/**
 * Convert Kana string to Romaji strictly observing Hepburn rules:
 * - Particle は -> "wa"
 * - Particle を -> "o"
 * - Particle へ -> "e"
 * - Sokuon っ -> double consonant
 * - Long vowel ー -> prolonged vowel
 */
export function kanaStringToRomaji(kanaStr) {
  let s = katakanaToHiragana(kanaStr);
  let out = '';
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1] || '';
    const pair = ch + next;

    // Sokuon っ
    if (ch === 'っ') {
      const peekYoon = s.slice(i + 1, i + 3);
      if (YOON_MAP[peekYoon]) {
        const nextRoma = YOON_MAP[peekYoon];
        out += nextRoma[0] === 'c' ? 't' : nextRoma[0];
        i += 1;
        continue;
      }
      const nextRoma = KANA_MAP[next];
      if (nextRoma) {
        out += nextRoma[0] === 'c' ? 't' : nextRoma[0];
      }
      i += 1;
      continue;
    }

    // Chouon ー
    if (ch === 'ー') {
      const lastChar = out.slice(-1).toLowerCase();
      if (['a', 'i', 'u', 'e', 'o'].includes(lastChar)) {
        out += lastChar;
      }
      i += 1;
      continue;
    }

    // Yoon (拗音)
    if (YOON_MAP[pair]) {
      out += YOON_MAP[pair];
      i += 2;
      continue;
    }

    // Single kana
    if (KANA_MAP[ch]) {
      let roma = KANA_MAP[ch];
      // Syllabic n (ん) before vowels or y: use n'
      if (ch === 'ん' && next && ['あ', 'い', 'う', 'え', 'お', 'や', 'ゆ', 'よ'].includes(next)) {
        roma = "n'";
      }
      out += roma;
      i += 1;
      continue;
    }

    // Punctuation and spaces
    if (ch === '。') out += '. ';
    else if (ch === '、') out += ', ';
    else if (ch === '！') out += '! ';
    else if (ch === '？') out += '? ';
    else if (ch === '〜' || ch === '~') out += '~';
    else out += ch;
    i += 1;
  }

  return out;
}

/**
 * Transliterates ANY Japanese sentence into phonetically accurate Romaji:
 * - Particle は after a noun/pronoun/name/greeting is transliterated as "wa"
 * - Particle を is transliterated as "o"
 * - Particle へ (direction) is transliterated as "e"
 * - Greetings: こんにちは -> "konnichiwa", こんばんは -> "konbanwa"
 * - Exact vowel sounds according to standard Japanese phonetics.
 */
export function toPhoneticRomaji(text) {
  const clean = stripEmojisAndEmotWords(text);
  if (!clean) return '';

  // 1. First tokenize into words using dictionary
  const tokens = tokenizeJapaneseToRuby(clean);

  // 2. Transliterate tokens with smart particle recognition
  const parts = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const tk = tokens[idx];
    const prevTk = tokens[idx - 1];

    if (tk.isKanji) {
      const reading = tk.ruby || KANJI_SINGLE_CHAR_STEMS[tk.text] || '';
      if (reading) {
        parts.push(kanaStringToRomaji(reading));
      }
      continue;
    }

    // Non-kanji text
    let str = tk.text;

    // Greeting fixes
    str = str.replace(/こんにちは/g, 'konnichiwa ');
    str = str.replace(/こんばんは/g, 'konbanwa ');

    // Scan characters and identify particles
    let buffer = '';
    for (let c = 0; c < str.length; c++) {
      const char = str[c];
      const prevChar = str[c - 1] || (prevTk ? prevTk.text.slice(-1) : '');
      const nextChar = str[c + 1] || '';

      // Topic particle は -> "wa"
      // Rules for は -> wa:
      // 1. Immediately after kanji (e.g. 私は -> watashi wa, 今日は -> kyou wa)
      // 2. After noun/particle (これ/それ/あれ/だれ/なに/さん/くん/ちゃん/の/て/で/に/と/から/より)
      // 3. Isolated は with spaces or punctuation around it
      if (char === 'は') {
        const isAfterKanji = (c === 0 && prevTk && prevTk.isKanji);
        const isFollowedByPunctOrEnd = !nextChar || /[。、！？!?\s]/.test(nextChar);
        const prevWord = buffer || (prevTk ? prevTk.text : '');
        const isAfterNounOrPronoun = /(?:これ|それ|あれ|どれ|だれ|なに|私|僕|俺|君|あなた|彼|彼女|さん|くん|ちゃん|人|学生|先生|先輩|友達|家族|今日|今|明日|昨日|天気|時間|本|駅|電車|勉強|テスト|練習|の|て|で|に|と|から)$/.test(prevWord);

        if (isAfterKanji || (isAfterNounOrPronoun && isFollowedByPunctOrEnd) || isAfterNounOrPronoun) {
          if (buffer) {
            parts.push(kanaStringToRomaji(buffer));
            buffer = '';
          }
          parts.push('wa');
          continue;
        }
      }

      // Object particle を -> "o"
      if (char === 'を') {
        if (buffer) {
          parts.push(kanaStringToRomaji(buffer));
          buffer = '';
        }
        parts.push('o');
        continue;
      }

      // Direction particle へ -> "e"
      if (char === 'へ') {
        const isAfterKanji = (c === 0 && prevTk && prevTk.isKanji);
        const prevWord = buffer || (prevTk ? prevTk.text : '');
        const isAfterPlace = /(?:駅|学校|大学|図書館|家|部屋|店|カフェ|日本|東京|大阪|京都|どこ|あそこ)$/.test(prevWord);
        if (isAfterKanji || isAfterPlace) {
          if (buffer) {
            parts.push(kanaStringToRomaji(buffer));
            buffer = '';
          }
          parts.push('e');
          continue;
        }
      }

      buffer += char;
    }

    if (buffer) {
      parts.push(kanaStringToRomaji(buffer));
    }
  }

  // 3. Clean up spacing and punctuation
  let romaji = parts
    .join(' ')
    .replace(/\s+([.,!?:;~])/g, '$1')
    .replace(/([(\[{])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Common phrase post-polishing for 100% natural vocal flow
  romaji = romaji
    .replace(/\bwatashi ha\b/gi, 'watashi wa')
    .replace(/\bboku ha\b/gi, 'boku wa')
    .replace(/\bore ha\b/gi, 'ore wa')
    .replace(/\bkimi ha\b/gi, 'kimi wa')
    .replace(/\banata ha\b/gi, 'anata wa')
    .replace(/\bkore ha\b/gi, 'kore wa')
    .replace(/\bsore ha\b/gi, 'sore wa')
    .replace(/\bare ha\b/gi, 'are wa')
    .replace(/\bkyou ha\b/gi, 'kyou wa')
    .replace(/\bashita ha\b/gi, 'ashita wa')
    .replace(/\bkinou ha\b/gi, 'kinou wa')
    .replace(/\bima ha\b/gi, 'ima wa')
    .replace(/\btenki ha\b/gi, 'tenki wa')
    .replace(/\btesuto ha\b/gi, 'tesuto wa')
    .replace(/\bkonnichiha\b/gi, 'konnichiwa')
    .replace(/\bkonbanha\b/gi, 'konbanwa')
    .replace(/\bdewa arimasen\b/gi, 'dewa arimasen')
    .replace(/\bja arimasen\b/gi, 'ja arimasen')
    .replace(/\bwo\b/gi, 'o')
    .replace(/\bdesune\b/gi, 'desu ne')
    .replace(/\bdesuyo\b/gi, 'desu yo')
    .replace(/\bdesuka\b/gi, 'desu ka')
    .replace(/([A-Za-z]+)(kara|made|yori|toshite)\b/gi, '$1 $2')
    .replace(/([A-Za-z]+)(san|kun|chan|sensei|senpai)\b/gi, '$1-$2')
    .replace(/([A-Za-z]+)\s+ha\b/gi, (match, word) => {
      // If preceding word is a known particle or noun, " ha" is particle " wa"
      if (['san', 'kun', 'chan', 'hito', 'tachi', 'no', 'de', 'ni', 'to', 'te', 'kara', 'yori', 'ga', 'wa'].includes(word.toLowerCase())) {
        return `${word} wa`;
      }
      return match;
    });

  // STRICT INVARIANT: ZERO KANJI LEAKAGE IN ROMAJI
  if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005]/.test(romaji)) {
    romaji = romaji.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005]/g, (k) => {
      const reading = KANJI_SINGLE_CHAR_STEMS[k] || '';
      return reading ? kanaStringToRomaji(reading) : '';
    });
  }
  romaji = romaji.replace(/\s{2,}/g, ' ').trim();

  // Capitalize first letter of sentence
  if (romaji.length > 0) {
    romaji = romaji.charAt(0).toUpperCase() + romaji.slice(1);
  }

  return romaji;
}

/**
 * Full analysis producing both Furigana HTML and Phonetic Romaji.
 */
export function analyzeJapaneseText(text) {
  const clean = stripEmojisAndEmotWords(text);
  return {
    raw: clean,
    furiganaHtml: renderFuriganaHtml(clean),
    romaji: toPhoneticRomaji(clean),
  };
}
