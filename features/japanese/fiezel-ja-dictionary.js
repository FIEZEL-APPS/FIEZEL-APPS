/**
 * FIEZEL · features/japanese/fiezel-ja-dictionary.js
 * Master Japanese Lexicon & Kanji Engine for FIEZEL Apps.
 *
 * Indexed:
 *   - WORDS: 6128 compound kanji & expressions (sorted longest first)
 *   - STEMS: 1561 okurigana stems for conjugated verbs & adjectives
 *   - SINGLE: 1653 single kanji entries (Zero-Bare-Kanji guarantee)
 *   - COUNTERS: numeric patterns & units (時, 分, 日, 月, 年, 回, 人, 歳, 階, 円, etc.)
 *
 * Dual-compatible: Browser (window.FiezelJaDictionary) and Node.js (CommonJS / ESM).
 */
(function (root) {
  'use strict';

  var WORDS = {
  "お世話になっております": {
    "kana": "おせわになっております",
    "romaji": "o-sewa ni natte orimasu"
  },
  "ありがとうございます": {
    "kana": "ありがとうございます",
    "romaji": "arigatou gozaimasu"
  },
  "インスタントコーヒー": {
    "kana": "インスタントコーヒー",
    "romaji": "insutantokoohii"
  },
  "インスタントラーメン": {
    "kana": "インスタントラーメン",
    "romaji": "insutantoraamen"
  },
  "よろしくお願いします": {
    "kana": "よろしくおねがいします",
    "romaji": "yoroshiku onegaishimasu"
  },
  "おはようございます": {
    "kana": "おはようございます",
    "romaji": "ohayou gozaimasu"
  },
  "ごちそうさまでした": {
    "kana": "ごちそうさまでした",
    "romaji": "gochisousamadeshita"
  },
  "スーパーマーケット": {
    "kana": "スーパーマーケット",
    "romaji": "suupaamaaketto"
  },
  "ティッシュペーパー": {
    "kana": "ティッシュペーパー",
    "romaji": "teassyupeepaa"
  },
  "トイレットペーパー": {
    "kana": "トイレットペーパー",
    "romaji": "toirettopeepaa"
  },
  "打ち合わせをします": {
    "kana": "うちあわせをします",
    "romaji": "uchiawase o shimasu"
  },
  "断らざるを得ません": {
    "kana": "ことわらざるをえません",
    "romaji": "kotowarazaru o emasen"
  },
  "絞らざるを得ません": {
    "kana": "しぼらざるをえません",
    "romaji": "shiborazaru o emasen"
  },
  "アイエムジャパン": {
    "kana": "アイエムジャパン",
    "romaji": "aimujyapan"
  },
  "あじがついている": {
    "kana": "あじがついている",
    "romaji": "aji ga tsuite iru"
  },
  "ありませんでした": {
    "kana": "ありませんでした",
    "romaji": "arimasen deshita"
  },
  "オレンジジュース": {
    "kana": "オレンジジュース",
    "romaji": "orenjijyuusu"
  },
  "ガソリンスタンド": {
    "kana": "ガソリンスタンド",
    "romaji": "gasorinsutando"
  },
  "シャープペンシル": {
    "kana": "シャープペンシル",
    "romaji": "syaabupensiru"
  },
  "つくってあります": {
    "kana": "つくってあります",
    "romaji": "tsukutte arimasu"
  },
  "どういたしまして": {
    "kana": "どういたしまして",
    "romaji": "douitashimashite"
  },
  "ともだちができる": {
    "kana": "ともだちができる",
    "romaji": "tomodachi ga dekiru"
  },
  "バスケットボール": {
    "kana": "バスケットボール",
    "romaji": "basukettobooru"
  },
  "ファーストフード": {
    "kana": "ファーストフード",
    "romaji": "fuaasutofuudo"
  },
  "ポリテクセンター": {
    "kana": "ポリテクセンター",
    "romaji": "poritekusentaa"
  },
  "よみませんでした": {
    "kana": "よみませんでした",
    "romaji": "yomimasen deshita"
  },
  "切り替えましょう": {
    "kana": "きりかえましょう",
    "romaji": "kirikaemashou"
  },
  "読みませんでした": {
    "kana": "よみませんでした",
    "romaji": "yomimasen deshita"
  },
  "アイスクリーム": {
    "kana": "アイスクリーム",
    "romaji": "aisukuriimu"
  },
  "アイスコーヒー": {
    "kana": "アイスコーヒー",
    "romaji": "aisukoohii"
  },
  "アルファベット": {
    "kana": "アルファベット",
    "romaji": "arufuabetto"
  },
  "インターネット": {
    "kana": "インターネット",
    "romaji": "intaanetto"
  },
  "インドネシア語": {
    "kana": "いんどねしあご",
    "romaji": "indoneshia-go"
  },
  "エスカレーター": {
    "kana": "エスカレーター",
    "romaji": "esukareetaa"
  },
  "オーストラリア": {
    "kana": "オーストラリア",
    "romaji": "oosutoraria"
  },
  "おつけしますか": {
    "kana": "おつけしますか",
    "romaji": "otsuke shimasu ka"
  },
  "おねがいします": {
    "kana": "おねがいします",
    "romaji": "onegaishimasu"
  },
  "お預かりします": {
    "kana": "おあずかりします",
    "romaji": "oazukari shimasu"
  },
  "カセットテープ": {
    "kana": "カセットテープ",
    "romaji": "kasettoteepu"
  },
  "じゃありません": {
    "kana": "じゃありません",
    "romaji": "ja arimasen"
  },
  "スタンプをおす": {
    "kana": "スタンプをおす",
    "romaji": "sutanpu o osu"
  },
  "セルフサービス": {
    "kana": "セルフサービス",
    "romaji": "serufusaabisu"
  },
  "センチメートル": {
    "kana": "センチメートル",
    "romaji": "senchimeetoru"
  },
  "ダイエットする": {
    "kana": "ダイエットする",
    "romaji": "daietto suru"
  },
  "つくっています": {
    "kana": "つくっています",
    "romaji": "tsukutte imasu"
  },
  "ではありません": {
    "kana": "ではありません",
    "romaji": "dewa arimasen"
  },
  "テレホンカード": {
    "kana": "テレホンカード",
    "romaji": "terehonkaado"
  },
  "でんわをかける": {
    "kana": "でんわをかける",
    "romaji": "denwa o kakeru"
  },
  "なかったでした": {
    "kana": "なかったでした",
    "romaji": "nakatta deshita"
  },
  "ネットを見ます": {
    "kana": "ネットをみます",
    "romaji": "netto o mimasu"
  },
  "のんびり暮らす": {
    "kana": "のんびりくらす",
    "romaji": "nonbiri kurasu"
  },
  "ピンポンします": {
    "kana": "ピンポンします",
    "romaji": "pinponshimasu"
  },
  "フライドチキン": {
    "kana": "フライドチキン",
    "romaji": "furaidochikin"
  },
  "フライドポテト": {
    "kana": "フライドポテト",
    "romaji": "furaido poteto"
  },
  "プラットホーム": {
    "kana": "プラットホーム",
    "romaji": "purattohoomu"
  },
  "プロテスタント": {
    "kana": "プロテスタント",
    "romaji": "purotesutanto"
  },
  "ボロブドゥール": {
    "kana": "ボロブドゥール",
    "romaji": "borobudouuru"
  },
  "マイルドセブン": {
    "kana": "マイルドセブン",
    "romaji": "mairudosebun"
  },
  "ゆっくりします": {
    "kana": "ゆっくりします",
    "romaji": "yukkuri shimasu"
  },
  "リサイクルする": {
    "kana": "リサイクルする",
    "romaji": "risaikuru suru"
  },
  "レンタルビデオ": {
    "kana": "レンタルビデオ",
    "romaji": "rentarubideo"
  },
  "住みにくかった": {
    "kana": "すみにくかった",
    "romaji": "suminikukatta"
  },
  "作ってあります": {
    "kana": "つくってあります",
    "romaji": "tsukutte arimasu"
  },
  "分からなかった": {
    "kana": "わからなかった",
    "romaji": "wakaranakatta"
  },
  "姿勢を低くする": {
    "kana": "しせいをひくくする",
    "romaji": "shisei o hikuku suru"
  },
  "座ってください": {
    "kana": "すわってください",
    "romaji": "suwatte kudasai"
  },
  "待ち合わせする": {
    "kana": "まちあわせする",
    "romaji": "machiawase suru"
  },
  "拡大生産者責任": {
    "kana": "かくだいせいさんものせきにん",
    "romaji": "kakudaiseisan mono sekinin"
  },
  "持って行きます": {
    "kana": "もっていきます",
    "romaji": "motte ikimasu"
  },
  "断片的情報消費": {
    "kana": "だんぺんてきじょうほうしょうひ",
    "romaji": "danpenteki jouhou shouhi"
  },
  "日本語能力試験": {
    "kana": "にほんごのうりょくしけん",
    "romaji": "nihongonouryoku shiken"
  },
  "毎月第一日曜日": {
    "kana": "まいげつだいついたちようび",
    "romaji": "maigetsudai tsuitachi youbi"
  },
  "深海熱水噴出孔": {
    "kana": "しんかいねっすいふんしゅつあな",
    "romaji": "shinkai nessui funshutsu ana"
  },
  "立ってください": {
    "kana": "たってください",
    "romaji": "tatte kudasai"
  },
  "終わりましょう": {
    "kana": "おわりましょう",
    "romaji": "owarimashou"
  },
  "自律的意思決定": {
    "kana": "じりつてきいしけってい",
    "romaji": "jiritsuteki ishikettei"
  },
  "落としちゃった": {
    "kana": "おとしちゃった",
    "romaji": "otoshichatta"
  },
  "解読技術確立後": {
    "kana": "かいどくぎじゅつかくりつのち",
    "romaji": "kaidoku gijutsu kakuritsu nochi"
  },
  "言い切れません": {
    "kana": "いいきれません",
    "romaji": "iikiremasen"
  },
  "贈収賄防止規程": {
    "kana": "ぞうしゅうわいぼうしきてい",
    "romaji": "zoushuuwai boushi kitei"
  },
  "間に合いません": {
    "kana": "まにあいません",
    "romaji": "maniaimasen"
  },
  "電話をかけます": {
    "kana": "でんわをかけます",
    "romaji": "denwa o kakemasu"
  },
  "音楽に合わせて": {
    "kana": "おんがくにあわせて",
    "romaji": "ongaku ni awasete"
  },
  "10000円": {
    "kana": "いちまんえん",
    "romaji": "ichiman'en"
  },
  "アイスティー": {
    "kana": "アイスティー",
    "romaji": "aisuteii"
  },
  "いただきます": {
    "kana": "いただきます",
    "romaji": "itadakimasu"
  },
  "いらいらする": {
    "kana": "いらいらする",
    "romaji": "iraira suru"
  },
  "インドネシア": {
    "kana": "インドネシア",
    "romaji": "indonesia"
  },
  "ウエートレス": {
    "kana": "ウエートレス",
    "romaji": "ueetoresu"
  },
  "ウォークマン": {
    "kana": "ウォークマン",
    "romaji": "uookuman"
  },
  "うっかりする": {
    "kana": "うっかりする",
    "romaji": "ukkari suru"
  },
  "うっすりする": {
    "kana": "うっすりする",
    "romaji": "ussuri suru"
  },
  "エレベーター": {
    "kana": "エレベーター",
    "romaji": "erebeetaa"
  },
  "おしゃれする": {
    "kana": "おしゃれする",
    "romaji": "oshare suru"
  },
  "お疲れ様です": {
    "kana": "おつかれさまです",
    "romaji": "otsukaresama desu"
  },
  "お風呂に入る": {
    "kana": "おふろにはいる",
    "romaji": "ofuronihairu"
  },
  "カリマンタン": {
    "kana": "カリマンタン",
    "romaji": "karimantan"
  },
  "カレーライス": {
    "kana": "カレーライス",
    "romaji": "kareeraisu"
  },
  "キーホルダー": {
    "kana": "キーホルダー",
    "romaji": "kiihorudaa"
  },
  "きらきらする": {
    "kana": "きらきらする",
    "romaji": "kirakira suru"
  },
  "キロメートル": {
    "kana": "キロメートル",
    "romaji": "kiromeetoru"
  },
  "ごちそうする": {
    "kana": "ごちそうする",
    "romaji": "gochisou suru"
  },
  "コマーシャル": {
    "kana": "コマーシャル",
    "romaji": "komaasyaru"
  },
  "ごろごろする": {
    "kana": "ごろごろする",
    "romaji": "gorogoro suru"
  },
  "コンピュータ": {
    "kana": "コンピュータ",
    "romaji": "konpyuuta"
  },
  "サンドイッチ": {
    "kana": "サンドイッチ",
    "romaji": "sandoicchi"
  },
  "しみこませる": {
    "kana": "しみこませる",
    "romaji": "shimikomaseru"
  },
  "じめじめする": {
    "kana": "じめじめする",
    "romaji": "jimejime suru"
  },
  "しゃべります": {
    "kana": "しゃべります",
    "romaji": "shaberimasu"
  },
  "スーツケース": {
    "kana": "スーツケース",
    "romaji": "suutsukeesu"
  },
  "スケジュール": {
    "kana": "スケジュール",
    "romaji": "sukejyuuru"
  },
  "チョコレート": {
    "kana": "チョコレート",
    "romaji": "chokoreeto"
  },
  "つくりました": {
    "kana": "つくりました",
    "romaji": "tsukurimashita"
  },
  "ティーバッグ": {
    "kana": "ティーバッグ",
    "romaji": "teiibaggu"
  },
  "どきっとする": {
    "kana": "どきっとする",
    "romaji": "dokitto suru"
  },
  "ねばねばする": {
    "kana": "ねばねばする",
    "romaji": "nebaneba suru"
  },
  "ノックします": {
    "kana": "ノックします",
    "romaji": "nokkushimasu"
  },
  "のんびりする": {
    "kana": "のんびりする",
    "romaji": "nonbiri suru"
  },
  "パイナップル": {
    "kana": "パイナップル",
    "romaji": "painappuru"
  },
  "はじめまして": {
    "kana": "はじめまして",
    "romaji": "hajimemashite"
  },
  "バドミントン": {
    "kana": "バドミントン",
    "romaji": "badominton"
  },
  "バレーボール": {
    "kana": "バレーボール",
    "romaji": "bareebooru"
  },
  "ハンバーガー": {
    "kana": "ハンバーガー",
    "romaji": "hanbaagaa"
  },
  "プラスチック": {
    "kana": "プラスチック",
    "romaji": "purasuchikku"
  },
  "ホームシック": {
    "kana": "ホームシック",
    "romaji": "hoomusikku"
  },
  "マクドナルド": {
    "kana": "マクドナルド",
    "romaji": "makudonarudo"
  },
  "ませんでした": {
    "kana": "ませんでした",
    "romaji": "masen deshita"
  },
  "ミルクティー": {
    "kana": "ミルクティー",
    "romaji": "mirukuteii"
  },
  "よまなかった": {
    "kana": "よまなかった",
    "romaji": "yomanakatta"
  },
  "よろしくお願": {
    "kana": "よろしくおねが",
    "romaji": "yoroshiku onega"
  },
  "ルールを守る": {
    "kana": "ルールをまもる",
    "romaji": "ruuru o mamoru"
  },
  "レモンティー": {
    "kana": "レモンティー",
    "romaji": "remonteii"
  },
  "三十年以上前": {
    "kana": "さんじゅうねんいじょうまえ",
    "romaji": "sanjuu nen'ijou mae"
  },
  "主観的幸福度": {
    "kana": "しゅかんてきこうふくど",
    "romaji": "shukanteki koufukudo"
  },
  "乗り換えます": {
    "kana": "のりかえます",
    "romaji": "norikaemasu"
  },
  "事前登録制度": {
    "kana": "じぜんとうろくせいど",
    "romaji": "jizentouroku seido"
  },
  "事実上不可能": {
    "kana": "じじつじょうふかのう",
    "romaji": "jijitsujoufukanou"
  },
  "二十四時間使": {
    "kana": "にじゅうしじかんし",
    "romaji": "nijuushi jikan shi"
  },
  "二日程度出社": {
    "kana": "ふつかていどしゅっしゃ",
    "romaji": "futsuka teido shussha"
  },
  "人口減少社会": {
    "kana": "じんこうげんしょうしゃかい",
    "romaji": "jinkou genshou shakai"
  },
  "人文社会科学": {
    "kana": "じんぶんしゃかいかがく",
    "romaji": "jinbun shakaikagaku"
  },
  "休みましょう": {
    "kana": "やすみましょう",
    "romaji": "yasumimashou"
  },
  "作っています": {
    "kana": "つくっています",
    "romaji": "tsukutte imasu"
  },
  "倉庫に行って": {
    "kana": "そうこにいって",
    "romaji": "souko ni itte"
  },
  "元も子もない": {
    "kana": "もともこもない",
    "romaji": "moto mo ko mo nai"
  },
  "先端科学技術": {
    "kana": "せんたんかがくぎじゅつ",
    "romaji": "sentankagakugijutsu"
  },
  "免疫抑制療法": {
    "kana": "めんえきよくせいりょうほう",
    "romaji": "men'eki yokusei ryouhou"
  },
  "共同研究覚書": {
    "kana": "きょうどうけんきゅうおぼえがき",
    "romaji": "kyoudoukenkyuu oboegaki"
  },
  "分かりますか": {
    "kana": "わかりますか",
    "romaji": "wakarimasuka"
  },
  "分かりません": {
    "kana": "わかりません",
    "romaji": "wakarimasen"
  },
  "切り出します": {
    "kana": "きりだします",
    "romaji": "kiridashimasu"
  },
  "別途誠実協議": {
    "kana": "べっとせいじつきょうぎ",
    "romaji": "betto seijitsu kyougi"
  },
  "午後七時以降": {
    "kana": "ごごしちじいこう",
    "romaji": "gogo shichiji ikou"
  },
  "単一樹種造林": {
    "kana": "たんいつじゅしゅぞうりん",
    "romaji": "tan'itsu jushu zourin"
  },
  "取り組みます": {
    "kana": "とりくみます",
    "romaji": "torikumimasu"
  },
  "古文書保存庫": {
    "kana": "こもんじょほぞんこ",
    "romaji": "komonjo hozonko"
  },
  "地政学的緊張": {
    "kana": "ちせいがくてききんちょう",
    "romaji": "chiseigaku teki kinchou"
  },
  "地方物流大手": {
    "kana": "ちほうぶつりゅうおおて",
    "romaji": "chihou butsuryuu oote"
  },
  "声をかけ合う": {
    "kana": "こえをかけあう",
    "romaji": "koe o kakeau"
  },
  "夜十一時以降": {
    "kana": "よるじゅういちじいこう",
    "romaji": "yoru juuichi jiikou"
  },
  "始めましょう": {
    "kana": "はじめましょう",
    "romaji": "hajimemashou"
  },
  "家改修補助金": {
    "kana": "いえかいしゅうほじょきん",
    "romaji": "ie kaishuu hojokin"
  },
  "差し上げます": {
    "kana": "さしあげます",
    "romaji": "sashiagemasu"
  },
  "巻き込まれる": {
    "kana": "まきこまれる",
    "romaji": "makikomareru"
  },
  "役に立ちます": {
    "kana": "やくにたちます",
    "romaji": "yakunitachimasu"
  },
  "徒歩五分以内": {
    "kana": "とほごぶいない",
    "romaji": "toho gobu inai"
  },
  "恐れ入ります": {
    "kana": "おそれいります",
    "romaji": "osoreirimasu"
  },
  "批判的読解力": {
    "kana": "ひはんてきどっかいりょく",
    "romaji": "hihanteki dokkairyoku"
  },
  "抗菌薬耐性菌": {
    "kana": "こうきんくすりたいせいきん",
    "romaji": "koukin kusuri taisei kin"
  },
  "持って来ます": {
    "kana": "もってきます",
    "romaji": "motte kimasu"
  },
  "揺れが収まる": {
    "kana": "ゆれがおさまる",
    "romaji": "yure ga osamaru"
  },
  "操作解説動画": {
    "kana": "そうさかいせつどうが",
    "romaji": "sousa kaisetsu douga"
  },
  "既存暗号基盤": {
    "kana": "きぞんあんごうきばん",
    "romaji": "kizon angou kiban"
  },
  "時期に行って": {
    "kana": "じきにおこなって",
    "romaji": "jiki ni okonatte"
  },
  "来週公開予定": {
    "kana": "らいしゅうこうかいよてい",
    "romaji": "raishuu koukaiyotei"
  },
  "歴史的建造物": {
    "kana": "れきしてきけんぞうぶつ",
    "romaji": "rekishiteki kenzoubutsu"
  },
  "毎日入力作業": {
    "kana": "まいにちにゅうりょくさぎょう",
    "romaji": "mainichi nyuuryoku sagyou"
  },
  "気を付けます": {
    "kana": "きをつけます",
    "romaji": "kiotsukemasu"
  },
  "炭素吸収機能": {
    "kana": "たんそきゅうしゅうきのう",
    "romaji": "tanso kyuushuu kinou"
  },
  "炭素貯留能力": {
    "kana": "たんそちょりゅうのうりょく",
    "romaji": "tanso choryuu nouryoku"
  },
  "無形資産投資": {
    "kana": "むけいしさんとうし",
    "romaji": "mukei shisan toushi"
  },
  "生命起源仮説": {
    "kana": "せいめいきげんかせつ",
    "romaji": "seimei kigen kasetsu"
  },
  "病気にかかる": {
    "kana": "びょうきにかかる",
    "romaji": "byouki ni kakaru"
  },
  "目覚まし時計": {
    "kana": "めざましどけい",
    "romaji": "mezamashidokei"
  },
  "眠れなかった": {
    "kana": "ねむれなかった",
    "romaji": "nemurenakatta"
  },
  "組み立てます": {
    "kana": "くみたてます",
    "romaji": "kumitatemasu"
  },
  "美味しかった": {
    "kana": "おいしかった",
    "romaji": "oishikatta"
  },
  "翻訳不可能性": {
    "kana": "ほんやくふかのうせい",
    "romaji": "honyaku fukanousei"
  },
  "言っています": {
    "kana": "いっています",
    "romaji": "itte imasu"
  },
  "読まなかった": {
    "kana": "よまなかった",
    "romaji": "yomanakatta"
  },
  "買い物します": {
    "kana": "かいものします",
    "romaji": "kaimonoshimasu"
  },
  "遅かれ早かれ": {
    "kana": "おそかれはやかれ",
    "romaji": "osokarehayakare"
  },
  "量子暗号通信": {
    "kana": "りょうしあんごうつうしん",
    "romaji": "ryoushi angou tsuushin"
  },
  "金融仲介機能": {
    "kana": "きんゆうちゅうかいきのう",
    "romaji": "kinyuu chuukai kinou"
  },
  "願ってもない": {
    "kana": "ねがってもない",
    "romaji": "negatte mo nai"
  },
  "1000円": {
    "kana": "せんえん",
    "romaji": "sen'en"
  },
  "5000円": {
    "kana": "ごせんえん",
    "romaji": "gosen'en"
  },
  "ありがとう": {
    "kana": "ありがとう",
    "romaji": "arigatou"
  },
  "ありました": {
    "kana": "ありました",
    "romaji": "arimashita"
  },
  "ありません": {
    "kana": "ありません",
    "romaji": "arimasen"
  },
  "アルコール": {
    "kana": "アルコール",
    "romaji": "arukooru"
  },
  "アルバイト": {
    "kana": "アルバイト",
    "romaji": "arupaito"
  },
  "いきました": {
    "kana": "いきました",
    "romaji": "ikimashita"
  },
  "イニシャル": {
    "kana": "イニシャル",
    "romaji": "inisyaru"
  },
  "ウイスキー": {
    "kana": "ウイスキー",
    "romaji": "uisukii"
  },
  "ウエーター": {
    "kana": "ウエーター",
    "romaji": "ueetaa"
  },
  "エアメール": {
    "kana": "エアメール",
    "romaji": "eameeru"
  },
  "オートバイ": {
    "kana": "オートバイ",
    "romaji": "ootobai"
  },
  "おじいさん": {
    "kana": "おじいさん",
    "romaji": "ojiisan"
  },
  "おばあさん": {
    "kana": "おばあさん",
    "romaji": "obaasan"
  },
  "お祖母さん": {
    "kana": "おばあさん",
    "romaji": "obaasan"
  },
  "お祖父さん": {
    "kana": "おじいさん",
    "romaji": "ojiisan"
  },
  "お金を稼ぐ": {
    "kana": "おかねをかせぐ",
    "romaji": "okane o kasegu"
  },
  "かかります": {
    "kana": "かかります",
    "romaji": "kakarimasu"
  },
  "カトリック": {
    "kana": "カトリック",
    "romaji": "katorikku"
  },
  "ガムテープ": {
    "kana": "ガムテープ",
    "romaji": "gamuteepu"
  },
  "カレンダー": {
    "kana": "カレンダー",
    "romaji": "karendaa"
  },
  "キャンセル": {
    "kana": "キャンセル",
    "romaji": "kyanseru"
  },
  "きょうしつ": {
    "kana": "きょうしつ",
    "romaji": "kyoushitsu"
  },
  "キログラム": {
    "kana": "キログラム",
    "romaji": "kirogaramu"
  },
  "クラシック": {
    "kana": "クラシック",
    "romaji": "kurasikku"
  },
  "ケチャップ": {
    "kana": "ケチャップ",
    "romaji": "kechappu"
  },
  "コンセント": {
    "kana": "コンセント",
    "romaji": "konsento"
  },
  "こんにちは": {
    "kana": "こんにちは",
    "romaji": "konnichiwa"
  },
  "こんばんは": {
    "kana": "こんばんは",
    "romaji": "konbanwa"
  },
  "さようなら": {
    "kana": "さようなら",
    "romaji": "sayounara"
  },
  "ジャカルタ": {
    "kana": "ジャカルタ",
    "romaji": "jyakaruta"
  },
  "ジャンパー": {
    "kana": "ジャンパー",
    "romaji": "jyanpaa"
  },
  "シャンプー": {
    "kana": "シャンプー",
    "romaji": "shanpuu"
  },
  "スクーター": {
    "kana": "スクーター",
    "romaji": "sukuutaa"
  },
  "すみません": {
    "kana": "すみません",
    "romaji": "sumimasen"
  },
  "スラウェシ": {
    "kana": "スラウェシ",
    "romaji": "surauesi"
  },
  "セロテープ": {
    "kana": "セロテープ",
    "romaji": "seroteepu"
  },
  "ソーセージ": {
    "kana": "ソーセージ",
    "romaji": "sooseeji"
  },
  "だいどころ": {
    "kana": "だいどころ",
    "romaji": "daidokoro"
  },
  "タッチする": {
    "kana": "タッチする",
    "romaji": "tatchi suru"
  },
  "たべました": {
    "kana": "たべました",
    "romaji": "tabemashita"
  },
  "チャンネル": {
    "kana": "チャンネル",
    "romaji": "channeru"
  },
  "チリソース": {
    "kana": "チリソース",
    "romaji": "chirisoosu"
  },
  "ついている": {
    "kana": "ついている",
    "romaji": "tsuite iru"
  },
  "つくります": {
    "kana": "つくります",
    "romaji": "tsukurimasu"
  },
  "つまらない": {
    "kana": "つまらない",
    "romaji": "tsumaranai"
  },
  "ドライバー": {
    "kana": "ドライバー",
    "romaji": "doraibaa"
  },
  "ドライヤー": {
    "kana": "ドライヤー",
    "romaji": "doraiyaa"
  },
  "トレーナー": {
    "kana": "トレーナー",
    "romaji": "toreenaa"
  },
  "なくします": {
    "kana": "なくします",
    "romaji": "nakushimasu"
  },
  "のみました": {
    "kana": "のみました",
    "romaji": "nomimashita"
  },
  "パーセント": {
    "kana": "パーセント",
    "romaji": "paasento"
  },
  "パーティー": {
    "kana": "ぱーてぃー",
    "romaji": "paatii"
  },
  "バスタオル": {
    "kana": "バスタオル",
    "romaji": "basutaoru"
  },
  "パスポート": {
    "kana": "パスポート",
    "romaji": "pasupooto"
  },
  "ハンサムな": {
    "kana": "ハンサムな",
    "romaji": "hansumuna"
  },
  "ピーナッツ": {
    "kana": "ピーナッツ",
    "romaji": "piinattsu"
  },
  "ファスナー": {
    "kana": "ファスナー",
    "romaji": "fuasunaa"
  },
  "フィリピン": {
    "kana": "フィリピン",
    "romaji": "fuiripiin"
  },
  "フライパン": {
    "kana": "フライパン",
    "romaji": "furaipan"
  },
  "プレゼント": {
    "kana": "プレゼント",
    "romaji": "purezento"
  },
  "ヘルメット": {
    "kana": "ヘルメット",
    "romaji": "herumetto"
  },
  "ボールペン": {
    "kana": "ボールペン",
    "romaji": "boorupen"
  },
  "ボクシング": {
    "kana": "ボクシング",
    "romaji": "bokusingu"
  },
  "ホッチキス": {
    "kana": "ホッチキス",
    "romaji": "pocchikisu"
  },
  "ぼっちゃん": {
    "kana": "ぼっちゃん",
    "romaji": "botchan"
  },
  "ボリューム": {
    "kana": "ボリューム",
    "romaji": "boryuumu"
  },
  "マールボロ": {
    "kana": "マールボロ",
    "romaji": "maruboro"
  },
  "まとめする": {
    "kana": "まとめする",
    "romaji": "matomesuru"
  },
  "まねをする": {
    "kana": "まねをする",
    "romaji": "mane o suru"
  },
  "マヨネーズ": {
    "kana": "マヨネーズ",
    "romaji": "mayoneezu"
  },
  "マレーシア": {
    "kana": "マレーシア",
    "romaji": "mareesia"
  },
  "もらいます": {
    "kana": "もらいます",
    "romaji": "moraimasu"
  },
  "ヨーロッパ": {
    "kana": "ヨーロッパ",
    "romaji": "yooroppa"
  },
  "よみました": {
    "kana": "よみました",
    "romaji": "yomimashita"
  },
  "よみません": {
    "kana": "よみません",
    "romaji": "yomimasen"
  },
  "レストラン": {
    "kana": "レストラン",
    "romaji": "resutoran"
  },
  "ワイシャツ": {
    "kana": "ワイシャツ",
    "romaji": "waishatsu"
  },
  "一度研究室": {
    "kana": "いちどけんきゅうしつ",
    "romaji": "ichido kenkyuushitsu"
  },
  "一日二十語": {
    "kana": "ついたちにじゅうご",
    "romaji": "tsuitachi nijuu go"
  },
  "一時間以上": {
    "kana": "いちじかんいじょう",
    "romaji": "ichijikan ijou"
  },
  "三次元映像": {
    "kana": "さんじげんえいぞう",
    "romaji": "sanjigen eizou"
  },
  "上がらない": {
    "kana": "あがらない",
    "romaji": "agaranai"
  },
  "不法就労者": {
    "kana": "ふほうしゅうろうしゃ",
    "romaji": "fuhoushuurousha"
  },
  "世界的流行": {
    "kana": "せかいてきりゅうこう",
    "romaji": "sekaiteki ryuukou"
  },
  "主力電源化": {
    "kana": "しゅりょくでんげんか",
    "romaji": "shuryoku dengen ka"
  },
  "主要博物館": {
    "kana": "しゅようはくぶつかん",
    "romaji": "shuyou hakubutsukan"
  },
  "乗り換える": {
    "kana": "のりかえる",
    "romaji": "norikaeru"
  },
  "予測可能性": {
    "kana": "よそくかのうせい",
    "romaji": "yosoku kanousei"
  },
  "今世紀最大": {
    "kana": "こんせいきさいだい",
    "romaji": "konseiki saidai"
  },
  "今週金曜日": {
    "kana": "こんしゅうきんようび",
    "romaji": "konshuukinyoubi"
  },
  "付帯条項案": {
    "kana": "ふたいじょうこうあん",
    "romaji": "futai joukouan"
  },
  "仮想空間上": {
    "kana": "かそうくうかんうえ",
    "romaji": "kasoukuukan ue"
  },
  "伸び悩んで": {
    "kana": "のびなやんで",
    "romaji": "nobinayande"
  },
  "作りました": {
    "kana": "つくりました",
    "romaji": "tsukurimashita"
  },
  "作り直した": {
    "kana": "つくりなおした",
    "romaji": "tsukurinaoshita"
  },
  "使用者責任": {
    "kana": "しようしゃせきにん",
    "romaji": "shiyousha sekinin"
  },
  "依然として": {
    "kana": "いぜんとして",
    "romaji": "izentoshite"
  },
  "修理します": {
    "kana": "しゅうりします",
    "romaji": "shuurishimasu"
  },
  "個人事業主": {
    "kana": "こじんじぎょうぬし",
    "romaji": "kojinjigyounushi"
  },
  "先例拘束性": {
    "kana": "せんれいこうそくせい",
    "romaji": "senrei kousoku sei"
  },
  "入居希望者": {
    "kana": "にゅうきょきぼうしゃ",
    "romaji": "nyuukyo kibousha"
  },
  "入社一年目": {
    "kana": "にゅうしゃいちねんめ",
    "romaji": "nyuusha ichinenme"
  },
  "公開日自体": {
    "kana": "こうかいびじたい",
    "romaji": "koukaibi jitai"
  },
  "公開鍵暗号": {
    "kana": "こうかいかぎあんごう",
    "romaji": "koukai kagi angou"
  },
  "再起動する": {
    "kana": "さいきどうする",
    "romaji": "saikidou suru"
  },
  "再開発計画": {
    "kana": "さいかいはつけいかく",
    "romaji": "saikaihatsu keikaku"
  },
  "最高裁判決": {
    "kana": "さいこうさいはんけつ",
    "romaji": "saikousaihanketsu"
  },
  "最高責任者": {
    "kana": "さいこうせきにんしゃ",
    "romaji": "saikousekininsha"
  },
  "出かけます": {
    "kana": "でかけます",
    "romaji": "dekakemasu"
  },
  "出来上がる": {
    "kana": "できあがる",
    "romaji": "dekiagaru"
  },
  "分からない": {
    "kana": "わからない",
    "romaji": "wakaranai"
  },
  "分かります": {
    "kana": "わかります",
    "romaji": "wakarimasu"
  },
  "分解します": {
    "kana": "ぶんかいします",
    "romaji": "bunkaishimasu"
  },
  "利他的行動": {
    "kana": "りたてきこうどう",
    "romaji": "rita teki koudou"
  },
  "利害関係者": {
    "kana": "りがいかんけいしゃ",
    "romaji": "rigaikankeisha"
  },
  "創業二百年": {
    "kana": "そうぎょうにひゃくねん",
    "romaji": "sougyou nihyaku nen"
  },
  "労働力人口": {
    "kana": "ろうどうりょくじんこう",
    "romaji": "roudouryoku jinkou"
  },
  "勉強します": {
    "kana": "べんきょうします",
    "romaji": "benkyoushimasu"
  },
  "医学生物学": {
    "kana": "いがくせいものがく",
    "romaji": "igakusei mono gaku"
  },
  "十年以上続": {
    "kana": "じゅうねんいじょうぞく",
    "romaji": "juunen'ijou zoku"
  },
  "半導体関連": {
    "kana": "はんどうたいかんれん",
    "romaji": "handoutai kanren"
  },
  "危機管理上": {
    "kana": "ききかんりじょう",
    "romaji": "kiki kanrijou"
  },
  "双方向対話": {
    "kana": "そうほうこうたいわ",
    "romaji": "souhoukou taiwa"
  },
  "取りやめて": {
    "kana": "とりやめて",
    "romaji": "toriyamete"
  },
  "取り付ける": {
    "kana": "とりつける",
    "romaji": "toritsukeru"
  },
  "受け入れる": {
    "kana": "うけいれる",
    "romaji": "ukeireru"
  },
  "同時進出案": {
    "kana": "どうじしんしゅつあん",
    "romaji": "douji shinshutsu an"
  },
  "国内総生産": {
    "kana": "こくないふそうさん",
    "romaji": "kokunai fusou san"
  },
  "国立博物館": {
    "kana": "こくりつはくぶつかん",
    "romaji": "kokuritsu hakubutsukan"
  },
  "地方裁判所": {
    "kana": "ちほうさいばんしょ",
    "romaji": "chihou saibansho"
  },
  "声をかける": {
    "kana": "こえをかける",
    "romaji": "koe o kakeru"
  },
  "変わらない": {
    "kana": "かわらない",
    "romaji": "kawaranai"
  },
  "外交的手段": {
    "kana": "がいこうてきしゅだん",
    "romaji": "gaikouteki shudan"
  },
  "外国語学習": {
    "kana": "がいこくごがくしゅう",
    "romaji": "gaikokugo gakushuu"
  },
  "大規模停電": {
    "kana": "だいきぼていでん",
    "romaji": "daikibo teiden"
  },
  "失礼します": {
    "kana": "しつれいします",
    "romaji": "shitsureishimasu"
  },
  "妥当性一点": {
    "kana": "だとうせいいってん",
    "romaji": "datousei itten"
  },
  "始まります": {
    "kana": "はじまります",
    "romaji": "hajimarimasu"
  },
  "嬉しかった": {
    "kana": "うれしかった",
    "romaji": "ureshikatta"
  },
  "学校関係者": {
    "kana": "がっこうかんけいしゃ",
    "romaji": "gakkoukankeisha"
  },
  "安全性評価": {
    "kana": "あんぜんせいひょうか",
    "romaji": "anzensei hyouka"
  },
  "完全透明化": {
    "kana": "かんぜんとうめいか",
    "romaji": "kanzen toumei ka"
  },
  "実習します": {
    "kana": "じっしゅうします",
    "romaji": "jisshushimasu"
  },
  "実質的監督": {
    "kana": "じっしつてきかんとく",
    "romaji": "jisshitsuteki kantoku"
  },
  "実験施設内": {
    "kana": "じっけんしせつない",
    "romaji": "jikkenshisetsu nai"
  },
  "実験開始前": {
    "kana": "じっけんかいしまえ",
    "romaji": "jikkenkaishi mae"
  },
  "専門委員会": {
    "kana": "せんもんいいんかい",
    "romaji": "senmon'iinkai"
  },
  "専門用語集": {
    "kana": "せんもんようごしゅう",
    "romaji": "senmonyougo shuu"
  },
  "市民的自由": {
    "kana": "しみんてきじゆう",
    "romaji": "shimintekijiyuu"
  },
  "市立図書館": {
    "kana": "しりつとしょかん",
    "romaji": "shiritsutoshokan"
  },
  "引き上げる": {
    "kana": "ひきあげる",
    "romaji": "hikiageru"
  },
  "引っ越した": {
    "kana": "ひっこした",
    "romaji": "hikkoshita"
  },
  "引越しする": {
    "kana": "ひっこしする",
    "romaji": "hikkoshi suru"
  },
  "後継者不足": {
    "kana": "こうけいしゃぶそく",
    "romaji": "koukeishabusoku"
  },
  "微生物群集": {
    "kana": "びせいぶつぐんしゅう",
    "romaji": "biseibutsu gunshuu"
  },
  "心理的陰影": {
    "kana": "しんりてきいんえい",
    "romaji": "shinriteki in'ei"
  },
  "心配します": {
    "kana": "しんぱいします",
    "romaji": "shinpaishimasu"
  },
  "恥ずかしい": {
    "kana": "はずかしい",
    "romaji": "hazukashii"
  },
  "意思決定後": {
    "kana": "いしけっていご",
    "romaji": "ishi ketteigo"
  },
  "手伝います": {
    "kana": "てつだいます",
    "romaji": "tetsudaimasu"
  },
  "打ち明ける": {
    "kana": "うちあける",
    "romaji": "uchiakeru"
  },
  "抗菌薬開発": {
    "kana": "こうきんくすりかいはつ",
    "romaji": "koukin kusuri kaihatsu"
  },
  "持って来る": {
    "kana": "もってくる",
    "romaji": "mottekuru"
  },
  "持って行く": {
    "kana": "もっていく",
    "romaji": "motteiku"
  },
  "持続可能性": {
    "kana": "じぞくかのうせい",
    "romaji": "jizokukanousei"
  },
  "掃除します": {
    "kana": "そうじします",
    "romaji": "soujishimasu"
  },
  "揺るぎない": {
    "kana": "ゆるぎない",
    "romaji": "yuruginai"
  },
  "損なわれた": {
    "kana": "そこなわれた",
    "romaji": "sokonawareta"
  },
  "政策立案者": {
    "kana": "せいさくりつあんもの",
    "romaji": "seisaku ritsuan mono"
  },
  "故障します": {
    "kana": "こしょうします",
    "romaji": "koshoushimasu"
  },
  "散歩します": {
    "kana": "さんぽします",
    "romaji": "sanposhimasu"
  },
  "数十年単位": {
    "kana": "すうじゅうねんたんい",
    "romaji": "suujuunen tan'i"
  },
  "整えすぎた": {
    "kana": "ととのえすぎた",
    "romaji": "totonoesugita"
  },
  "文化的背景": {
    "kana": "ぶんかてきはいけい",
    "romaji": "bunkatekihaikei"
  },
  "新入生歓迎": {
    "kana": "しんにゅうせいかんげい",
    "romaji": "shinnyuusei kangei"
  },
  "日焼けする": {
    "kana": "ひやけする",
    "romaji": "hiyake suru"
  },
  "普遍的条件": {
    "kana": "ふへんてきじょうけん",
    "romaji": "fuhenteki jouken"
  },
  "曲がります": {
    "kana": "まがります",
    "romaji": "magarimasu"
  },
  "書き改める": {
    "kana": "かきあらためる",
    "romaji": "kakiaratameru"
  },
  "書き直して": {
    "kana": "かきなおして",
    "romaji": "kakinaoshite"
  },
  "机上の空論": {
    "kana": "きじょうのくうろん",
    "romaji": "kijou no kuuron"
  },
  "来週土曜日": {
    "kana": "らいしゅうどようび",
    "romaji": "raishuu doyoubi"
  },
  "植民地支配": {
    "kana": "しょくみんちしはい",
    "romaji": "shokuminchi shihai"
  },
  "検証可能性": {
    "kana": "けんしょうかのうせい",
    "romaji": "kenshoukanou sei"
  },
  "楽しかった": {
    "kana": "たのしかった",
    "romaji": "tanoshikatta"
  },
  "次世代以降": {
    "kana": "じせだいいこう",
    "romaji": "jisedaiikou"
  },
  "止まります": {
    "kana": "とまります",
    "romaji": "tomarimasu"
  },
  "歴史的経緯": {
    "kana": "れきしてきけいい",
    "romaji": "rekishitekikeii"
  },
  "歴史的記憶": {
    "kana": "れきしてききおく",
    "romaji": "rekishiteki kioku"
  },
  "毎日自転車": {
    "kana": "まいにちじてんしゃ",
    "romaji": "mainichi jitensha"
  },
  "毎朝七時半": {
    "kana": "まいあさしちじはん",
    "romaji": "maiasa shichiji han"
  },
  "毎朝十五分": {
    "kana": "まいあさじゅうごふん",
    "romaji": "maiasa juugo fun"
  },
  "毎週土曜日": {
    "kana": "まいしゅうどようび",
    "romaji": "maishuudoyoubi"
  },
  "民間事業者": {
    "kana": "みんかんじぎょうしゃ",
    "romaji": "minkan jigyousha"
  },
  "気をつける": {
    "kana": "きをつける",
    "romaji": "ki o tsukeru"
  },
  "沿線自治体": {
    "kana": "えんせんじちたい",
    "romaji": "ensen jichitai"
  },
  "法的安定性": {
    "kana": "ほうてきあんていせい",
    "romaji": "houteki anteisei"
  },
  "注意します": {
    "kana": "ちゅういします",
    "romaji": "chuuishimasu"
  },
  "洗濯します": {
    "kana": "せんたくします",
    "romaji": "sentakushimasu"
  },
  "海洋生態系": {
    "kana": "かいようせいたいけい",
    "romaji": "kaiyou seitaikei"
  },
  "消費時間帯": {
    "kana": "しょうひじかんたい",
    "romaji": "shouhi jikantai"
  },
  "無形文化財": {
    "kana": "むけいぶんかざい",
    "romaji": "mukei bunkazai"
  },
  "無理をする": {
    "kana": "むりをする",
    "romaji": "muri o suru"
  },
  "独占実施権": {
    "kana": "どくせんじっしけん",
    "romaji": "dokusen jisshi ken"
  },
  "生まれます": {
    "kana": "うまれます",
    "romaji": "umaremasu"
  },
  "生活満足度": {
    "kana": "せいかつまんぞくど",
    "romaji": "seikatsu manzokudo"
  },
  "生活習慣病": {
    "kana": "せいかつしゅうかんびょう",
    "romaji": "seikatsushuukan byou"
  },
  "生物多様性": {
    "kana": "せいぶつたようせい",
    "romaji": "seibutsu tayousei"
  },
  "生産性向上": {
    "kana": "せいさんせいこうじょう",
    "romaji": "seisansei koujou"
  },
  "申し出ます": {
    "kana": "もうしでます",
    "romaji": "moushidemasu"
  },
  "申請手続き": {
    "kana": "しんせいてつづき",
    "romaji": "shinsei tetsuzuki"
  },
  "異文化理解": {
    "kana": "いぶんかりかい",
    "romaji": "ibunka rikai"
  },
  "百年以上前": {
    "kana": "ひゃくねんいじょうまえ",
    "romaji": "hyakunen ijou mae"
  },
  "百年以上続": {
    "kana": "ひゃくねんいじょうぞく",
    "romaji": "hyakunen ijou zoku"
  },
  "盛り上がる": {
    "kana": "もりあがる",
    "romaji": "moriagaru"
  },
  "目立たない": {
    "kana": "めだたない",
    "romaji": "medatanai"
  },
  "相互運用性": {
    "kana": "そうごうんようせい",
    "romaji": "sougo unyousei"
  },
  "相続人全員": {
    "kana": "そうぞくにんぜんいん",
    "romaji": "souzokunin zen'in"
  },
  "着払い伝票": {
    "kana": "ちゃくばらいでんぴょう",
    "romaji": "chakubarai denpyou"
  },
  "知りません": {
    "kana": "しりません",
    "romaji": "shirimasen"
  },
  "短時間勤務": {
    "kana": "たんじかんきんむ",
    "romaji": "tanjikan kinmu"
  },
  "社外取締役": {
    "kana": "しゃがいとりしまりやく",
    "romaji": "shagai torishimariyaku"
  },
  "科学的知識": {
    "kana": "かがくてきちしき",
    "romaji": "kagakuteki chishiki"
  },
  "競争的資金": {
    "kana": "きょうそうてきしきん",
    "romaji": "kyousou teki shikin"
  },
  "第2査読者": {
    "kana": "だいにさどくしゃ",
    "romaji": "daini sadokusha"
  },
  "約二割減少": {
    "kana": "やくにわりげんしょう",
    "romaji": "yaku niwari genshou"
  },
  "素因数分解": {
    "kana": "そいんすうぶんかい",
    "romaji": "soinsuubunkai"
  },
  "素晴らしい": {
    "kana": "すばらしい",
    "romaji": "subarashii"
  },
  "終わります": {
    "kana": "おわります",
    "romaji": "owarimasu"
  },
  "組み立てる": {
    "kana": "くみたてる",
    "romaji": "kumitateru"
  },
  "経済的余裕": {
    "kana": "けいざいてきよゆう",
    "romaji": "keizaitekiyoyuu"
  },
  "結婚します": {
    "kana": "けっこんします",
    "romaji": "kekkonshimasu"
  },
  "結婚記念日": {
    "kana": "けっこんきねんび",
    "romaji": "kekkonkinenbi"
  },
  "維持管理費": {
    "kana": "いじかんりひ",
    "romaji": "ijikanri hi"
  },
  "美術修復家": {
    "kana": "びじゅつしゅうふくいえ",
    "romaji": "bijutsu shuufuku ie"
  },
  "耐量子暗号": {
    "kana": "たいりょうしあんごう",
    "romaji": "tai ryoushi angou"
  },
  "聞こえます": {
    "kana": "きこえます",
    "romaji": "kikoemasu"
  },
  "自由記述欄": {
    "kana": "じゆうきじゅつらん",
    "romaji": "jiyuu kijutsuran"
  },
  "自転車通学": {
    "kana": "じてんしゃつうがく",
    "romaji": "jitenshatsuugaku"
  },
  "薬剤耐性菌": {
    "kana": "やくざいたいせいきん",
    "romaji": "yakuzai taisei kin"
  },
  "行いました": {
    "kana": "おこないました",
    "romaji": "okonaimashita"
  },
  "行き届いて": {
    "kana": "いきとどいて",
    "romaji": "ikitodoite"
  },
  "行われます": {
    "kana": "おこなわれます",
    "romaji": "okonawaremasu"
  },
  "行動経済学": {
    "kana": "こうどうけいざいがく",
    "romaji": "koudou keizaigaku"
  },
  "補助金制度": {
    "kana": "ほじょきんせいど",
    "romaji": "hojokin seido"
  },
  "見学します": {
    "kana": "けんがくします",
    "romaji": "kengakushimasu"
  },
  "見物します": {
    "kana": "けんぶつします",
    "romaji": "kenbutsushimasu"
  },
  "観光案内所": {
    "kana": "かんこうあんないじょ",
    "romaji": "kankouannaijo"
  },
  "言語共同体": {
    "kana": "げんごきょうどうたい",
    "romaji": "gengo kyoudoutai"
  },
  "認知言語学": {
    "kana": "にんちげんごがく",
    "romaji": "ninchi gengogaku"
  },
  "説明します": {
    "kana": "せつめいします",
    "romaji": "setsumeishimasu"
  },
  "読みません": {
    "kana": "よみません",
    "romaji": "yomimasen"
  },
  "調節します": {
    "kana": "ちょうせつします",
    "romaji": "chousetsushimasu"
  },
  "買いすぎて": {
    "kana": "かいすぎて",
    "romaji": "kaisugite"
  },
  "買い物する": {
    "kana": "かいものする",
    "romaji": "kaimono suru"
  },
  "資格証明書": {
    "kana": "しかくしょうめいしょ",
    "romaji": "shikaku shoumeisho"
  },
  "質問します": {
    "kana": "しつもんします",
    "romaji": "shitsumonshimasu"
  },
  "逃げ遅れる": {
    "kana": "にげおくれる",
    "romaji": "nigeokureru"
  },
  "逐一可視化": {
    "kana": "ちくいちかしか",
    "romaji": "chikuichi kashika"
  },
  "運転します": {
    "kana": "うんてんします",
    "romaji": "untenshimasu"
  },
  "過去数十年": {
    "kana": "かこすうじゅうねん",
    "romaji": "kako suujuunen"
  },
  "野外音楽祭": {
    "kana": "やがいおんがくさい",
    "romaji": "yagai ongakusai"
  },
  "量子計算機": {
    "kana": "りょうしけいさんき",
    "romaji": "ryoushi keisanki"
  },
  "開発責任者": {
    "kana": "かいはつせきにんしゃ",
    "romaji": "kaihatsu sekininsha"
  },
  "間に合った": {
    "kana": "まにあった",
    "romaji": "maniatta"
  },
  "関係者以外": {
    "kana": "かんけいしゃいがい",
    "romaji": "kankeisha igai"
  },
  "集められる": {
    "kana": "あつめられる",
    "romaji": "atsumerareru"
  },
  "難治性疾患": {
    "kana": "なんじせいしっかん",
    "romaji": "nanji sei shikkan"
  },
  "青葉商事向": {
    "kana": "あおばしょうじこう",
    "romaji": "aoba shouji kou"
  },
  "非正規雇用": {
    "kana": "ひせいきこよう",
    "romaji": "hi seiki koyou"
  },
  "面白かった": {
    "kana": "おもしろかった",
    "romaji": "omoshirokatta"
  },
  "顧問弁理士": {
    "kana": "こもんべんりし",
    "romaji": "komon benrishi"
  },
  "食事します": {
    "kana": "しょくじします",
    "romaji": "shokujishimasu"
  },
  "飲みにくい": {
    "kana": "のみにくい",
    "romaji": "nominikui"
  },
  "高層建築群": {
    "kana": "こうそうけんちくぐん",
    "romaji": "kousou kenchiku gun"
  },
  "高度専門職": {
    "kana": "こうどせんもんしょく",
    "romaji": "koudo senmonshoku"
  },
  "100円": {
    "kana": "ひゃくえん",
    "romaji": "hyakuen"
  },
  "10か月": {
    "kana": "じゅっかげつ",
    "romaji": "jukkagetsu"
  },
  "10ヶ月": {
    "kana": "じゅっかげつ",
    "romaji": "jukkagetsu"
  },
  "10時半": {
    "kana": "じゅうじはん",
    "romaji": "juujihan"
  },
  "10時間": {
    "kana": "じゅうじかん",
    "romaji": "juujikan"
  },
  "10週間": {
    "kana": "じゅっしゅうかん",
    "romaji": "jusshuukan"
  },
  "11時半": {
    "kana": "じゅういちじはん",
    "romaji": "juuichijihan"
  },
  "12時半": {
    "kana": "じゅうにじはん",
    "romaji": "juunijihan"
  },
  "500円": {
    "kana": "ごひゃくえん",
    "romaji": "gohyakuen"
  },
  "アイロン": {
    "kana": "アイロン",
    "romaji": "airon"
  },
  "あげます": {
    "kana": "あげます",
    "romaji": "agemasu"
  },
  "アパート": {
    "kana": "アパート",
    "romaji": "apaato"
  },
  "アメリカ": {
    "kana": "アメリカ",
    "romaji": "amerika"
  },
  "あります": {
    "kana": "あります",
    "romaji": "arimasu"
  },
  "アンテナ": {
    "kana": "アンテナ",
    "romaji": "antena"
  },
  "いきます": {
    "kana": "いきます",
    "romaji": "ikimasu"
  },
  "イスラム": {
    "kana": "イスラム",
    "romaji": "isuramu"
  },
  "いためる": {
    "kana": "いためる",
    "romaji": "itameru"
  },
  "イヤホン": {
    "kana": "イヤホン",
    "romaji": "iahon"
  },
  "エアコン": {
    "kana": "エアコン",
    "romaji": "eakon"
  },
  "おはよう": {
    "kana": "おはよう",
    "romaji": "ohayou"
  },
  "おやすみ": {
    "kana": "おやすみ",
    "romaji": "oyasumi"
  },
  "オランダ": {
    "kana": "オランダ",
    "romaji": "oranda"
  },
  "オレンジ": {
    "kana": "オレンジ",
    "romaji": "orenji"
  },
  "お値引き": {
    "kana": "おねびき",
    "romaji": "onebiki"
  },
  "お兄さん": {
    "kana": "おにいさん",
    "romaji": "oniisan"
  },
  "お姉さん": {
    "kana": "おねえさん",
    "romaji": "oneesan"
  },
  "お手伝い": {
    "kana": "おてつだい",
    "romaji": "o-tetsudai"
  },
  "お母さん": {
    "kana": "おかあさん",
    "romaji": "okaasan"
  },
  "お父さん": {
    "kana": "おとうさん",
    "romaji": "otousan"
  },
  "お疲れ様": {
    "kana": "おつかれさま",
    "romaji": "otsukaresama"
  },
  "お目通し": {
    "kana": "おめとおし",
    "romaji": "ometooshi"
  },
  "カーテン": {
    "kana": "カーテン",
    "romaji": "kaaten"
  },
  "がくせい": {
    "kana": "がくせい",
    "romaji": "gakusei"
  },
  "ガソリン": {
    "kana": "ガソリン",
    "romaji": "gasorin"
  },
  "がっこう": {
    "kana": "がっこう",
    "romaji": "gakkou"
  },
  "かのじょ": {
    "kana": "かのじょ",
    "romaji": "kanojo"
  },
  "かぶせる": {
    "kana": "かぶせる",
    "romaji": "kabuseru"
  },
  "カラオケ": {
    "kana": "カラオケ",
    "romaji": "karaoke"
  },
  "きました": {
    "kana": "きました",
    "romaji": "kimashita"
  },
  "キャベツ": {
    "kana": "キャベツ",
    "romaji": "kyabetsu"
  },
  "キリスト": {
    "kana": "キリスト",
    "romaji": "kirisuto"
  },
  "クーラー": {
    "kana": "クーラー",
    "romaji": "kuuraa"
  },
  "ください": {
    "kana": "ください",
    "romaji": "kudasai"
  },
  "クリーム": {
    "kana": "クリーム",
    "romaji": "kuriimu"
  },
  "くり返す": {
    "kana": "くりかえす",
    "romaji": "kurikaesu"
  },
  "グループ": {
    "kana": "グループ",
    "romaji": "guruupu"
  },
  "コーヒー": {
    "kana": "こーひー",
    "romaji": "koohii"
  },
  "コンビニ": {
    "kana": "コンビニ",
    "romaji": "konbini"
  },
  "サッカー": {
    "kana": "サッカー",
    "romaji": "sakkaa"
  },
  "サンダル": {
    "kana": "サンダル",
    "romaji": "sandaru"
  },
  "ジーンズ": {
    "kana": "ジーンズ",
    "romaji": "jiinzu"
  },
  "しゃがむ": {
    "kana": "しゃがむ",
    "romaji": "shagamu"
  },
  "じゃが芋": {
    "kana": "じゃがいも",
    "romaji": "jagaimo"
  },
  "しゃべる": {
    "kana": "しゃべる",
    "romaji": "shaberu"
  },
  "シャワー": {
    "kana": "シャワー",
    "romaji": "shawaa"
  },
  "ジュース": {
    "kana": "じゅーす",
    "romaji": "juusu"
  },
  "しんぶん": {
    "kana": "しんぶん",
    "romaji": "shinbun"
  },
  "スーパー": {
    "kana": "スーパー",
    "romaji": "suupaa"
  },
  "スイッチ": {
    "kana": "すいっち",
    "romaji": "suitchi"
  },
  "スカート": {
    "kana": "スカート",
    "romaji": "sukaato"
  },
  "スタート": {
    "kana": "スタート",
    "romaji": "sutaato"
  },
  "ステレオ": {
    "kana": "ステレオ",
    "romaji": "sutereo"
  },
  "ストーブ": {
    "kana": "ストーブ",
    "romaji": "sutoopu"
  },
  "スピーチ": {
    "kana": "スピーチ",
    "romaji": "supiichi"
  },
  "スピード": {
    "kana": "スピード",
    "romaji": "supiido"
  },
  "スプーン": {
    "kana": "スプーン",
    "romaji": "supuun"
  },
  "スポーツ": {
    "kana": "スポーツ",
    "romaji": "supootsu"
  },
  "スマトラ": {
    "kana": "スマトラ",
    "romaji": "sumatora"
  },
  "スリッパ": {
    "kana": "スリッパ",
    "romaji": "surippa"
  },
  "セーター": {
    "kana": "セーター",
    "romaji": "seetaa"
  },
  "せんせい": {
    "kana": "せんせい",
    "romaji": "sensei"
  },
  "ソファー": {
    "kana": "ソファー",
    "romaji": "sofuaa"
  },
  "それから": {
    "kana": "それから",
    "romaji": "sorekara"
  },
  "だいすき": {
    "kana": "だいすき",
    "romaji": "daisuki"
  },
  "タクシー": {
    "kana": "タクシー",
    "romaji": "takusii"
  },
  "たずねる": {
    "kana": "たずねる",
    "romaji": "tazuneru"
  },
  "たべます": {
    "kana": "たべます",
    "romaji": "tabemasu"
  },
  "チケット": {
    "kana": "チケット",
    "romaji": "chiketto"
  },
  "ちょっと": {
    "kana": "ちょっと",
    "romaji": "chotto"
  },
  "つけます": {
    "kana": "つけます",
    "romaji": "tsukemasu"
  },
  "つながる": {
    "kana": "つながる",
    "romaji": "tsunagaru"
  },
  "テーブル": {
    "kana": "テーブル",
    "romaji": "teeburu"
  },
  "デザート": {
    "kana": "デザート",
    "romaji": "dezaato"
  },
  "デザイン": {
    "kana": "デザイン",
    "romaji": "dezain"
  },
  "でしょう": {
    "kana": "でしょう",
    "romaji": "deshou"
  },
  "デパート": {
    "kana": "デパート",
    "romaji": "depaato"
  },
  "ドーナツ": {
    "kana": "ドーナツ",
    "romaji": "doonatsu"
  },
  "どうして": {
    "kana": "どうして",
    "romaji": "doushite"
  },
  "ともだち": {
    "kana": "ともだち",
    "romaji": "tomodachi"
  },
  "トラック": {
    "kana": "トラック",
    "romaji": "torakku"
  },
  "ドリアン": {
    "kana": "ドリアン",
    "romaji": "dorian"
  },
  "なかった": {
    "kana": "なかった",
    "romaji": "nakatta"
  },
  "にほんご": {
    "kana": "にほんご",
    "romaji": "nihongo"
  },
  "ニュース": {
    "kana": "ニュース",
    "romaji": "nyuusu"
  },
  "ネクタイ": {
    "kana": "ネクタイ",
    "romaji": "nekutai"
  },
  "のみます": {
    "kana": "のみます",
    "romaji": "nomimasu"
  },
  "ばかする": {
    "kana": "ばかする",
    "romaji": "bakasuru"
  },
  "はずれる": {
    "kana": "はずれる",
    "romaji": "hazureru"
  },
  "パソコン": {
    "kana": "パソコン",
    "romaji": "pasokon"
  },
  "パチンコ": {
    "kana": "パチンコ",
    "romaji": "pachinko"
  },
  "パパイヤ": {
    "kana": "パパイヤ",
    "romaji": "papaiya"
  },
  "ハンカチ": {
    "kana": "ハンカチ",
    "romaji": "hankachi"
  },
  "ハンサム": {
    "kana": "ハンサム",
    "romaji": "hansamu"
  },
  "バンドン": {
    "kana": "バンドン",
    "romaji": "bandoun"
  },
  "ピーマン": {
    "kana": "ピーマン",
    "romaji": "piiman"
  },
  "ビニール": {
    "kana": "ビニール",
    "romaji": "biniiru"
  },
  "ヒンズー": {
    "kana": "ヒンズー",
    "romaji": "hinzuu"
  },
  "ピンポン": {
    "kana": "ピンポン",
    "romaji": "pinpon"
  },
  "ファンタ": {
    "kana": "ファンタ",
    "romaji": "fuanta"
  },
  "フィルム": {
    "kana": "フィルム",
    "romaji": "fuirimu"
  },
  "フォーク": {
    "kana": "フォーク",
    "romaji": "fuooku"
  },
  "ぶつかる": {
    "kana": "ぶつかる",
    "romaji": "butsukaru"
  },
  "ポケット": {
    "kana": "ポケット",
    "romaji": "poketto"
  },
  "ポップス": {
    "kana": "ポップス",
    "romaji": "poppusu"
  },
  "ましょう": {
    "kana": "ましょう",
    "romaji": "mashou"
  },
  "まとめる": {
    "kana": "まとめる",
    "romaji": "matomeru"
  },
  "マンゴー": {
    "kana": "マンゴー",
    "romaji": "mango"
  },
  "メートル": {
    "kana": "メートル",
    "romaji": "meetoru"
  },
  "メニュー": {
    "kana": "メニュー",
    "romaji": "menyuu"
  },
  "もう一度": {
    "kana": "もういちど",
    "romaji": "mou ichido"
  },
  "もたらす": {
    "kana": "もたらす",
    "romaji": "motarasu"
  },
  "やり直す": {
    "kana": "やりなおす",
    "romaji": "yarinaosu"
  },
  "ゆうがた": {
    "kana": "ゆうがた",
    "romaji": "yuugata"
  },
  "ゆっくり": {
    "kana": "ゆっくり",
    "romaji": "yukkuri"
  },
  "よみます": {
    "kana": "よみます",
    "romaji": "yomimasu"
  },
  "ラーメン": {
    "kana": "ラーメン",
    "romaji": "raamen"
  },
  "ライター": {
    "kana": "ライター",
    "romaji": "raitaa"
  },
  "ラジカセ": {
    "kana": "ラジカセ",
    "romaji": "rajikase"
  },
  "リットル": {
    "kana": "リットル",
    "romaji": "rittoru"
  },
  "レコード": {
    "kana": "レコード",
    "romaji": "rekoodo"
  },
  "レシート": {
    "kana": "レシート",
    "romaji": "resiito"
  },
  "レポート": {
    "kana": "レポート",
    "romaji": "repooto"
  },
  "レンバン": {
    "kana": "レンバン",
    "romaji": "renban"
  },
  "ロッカー": {
    "kana": "ロッカー",
    "romaji": "rokkaa"
  },
  "一人ずつ": {
    "kana": "ひとりずつ",
    "romaji": "hitorizutsu"
  },
  "一人三冊": {
    "kana": "ひとりさんさつ",
    "romaji": "hitori sansatsu"
  },
  "一切室内": {
    "kana": "いっさいしつない",
    "romaji": "issai shitsunai"
  },
  "一層利用": {
    "kana": "いっそうりよう",
    "romaji": "issou riyou"
  },
  "一度線路": {
    "kana": "いちどせんろ",
    "romaji": "ichido senro"
  },
  "一日中座": {
    "kana": "いちにちじゅうざ",
    "romaji": "ichinichijuu za"
  },
  "一日中晴": {
    "kana": "いちにちじゅうせい",
    "romaji": "ichinichijuu sei"
  },
  "一日中歩": {
    "kana": "いちにちじゅうほ",
    "romaji": "ichinichijuu ho"
  },
  "一日中空": {
    "kana": "いちにちじゅうそら",
    "romaji": "ichinichijuu sora"
  },
  "一日十個": {
    "kana": "ついたちじゅうこ",
    "romaji": "tsuitachi juu ko"
  },
  "一時間前": {
    "kana": "いちじかんまえ",
    "romaji": "ichijikanmae"
  },
  "一時間後": {
    "kana": "いちじかんご",
    "romaji": "ichijikango"
  },
  "一時間早": {
    "kana": "いちじかんそう",
    "romaji": "ichijikan sou"
  },
  "一次史料": {
    "kana": "いちじしりょう",
    "romaji": "ichiji shiryou"
  },
  "一段動詞": {
    "kana": "いちだんどうし",
    "romaji": "ichidan doushi"
  },
  "一気呵成": {
    "kana": "いっきかせい",
    "romaji": "ikkikasei"
  },
  "一生懸命": {
    "kana": "いっしょうけんめい",
    "romaji": "isshoukenmei"
  },
  "一般家庭": {
    "kana": "いっぱんかてい",
    "romaji": "ippankatei"
  },
  "一週間延": {
    "kana": "いっしゅうかんえん",
    "romaji": "isshuukan en"
  },
  "一週間泊": {
    "kana": "いっしゅうかんはく",
    "romaji": "isshuukan haku"
  },
  "七海先生": {
    "kana": "ななみせんせい",
    "romaji": "Nanami-sensei"
  },
  "三十分前": {
    "kana": "さんじゅうふんまえ",
    "romaji": "sanjuu funmae"
  },
  "三十分歩": {
    "kana": "さんじゅうふんほ",
    "romaji": "sanjuu fun ho"
  },
  "三十分遅": {
    "kana": "さんじゅうふんち",
    "romaji": "sanjuu fun chi"
  },
  "三月下旬": {
    "kana": "さんがつげじゅん",
    "romaji": "sangatsu gejun"
  },
  "上がって": {
    "kana": "あがって",
    "romaji": "agatte"
  },
  "上場企業": {
    "kana": "じょうじょうきぎょう",
    "romaji": "joujoukigyou"
  },
  "上陸する": {
    "kana": "じょうりくする",
    "romaji": "jouriku suru"
  },
  "不可逆的": {
    "kana": "ふかぎゃくてき",
    "romaji": "fukagyakuteki"
  },
  "不正行為": {
    "kana": "ふせいこうい",
    "romaji": "fuseikoui"
  },
  "不正資金": {
    "kana": "ふせいしきん",
    "romaji": "fusei shikin"
  },
  "不確実性": {
    "kana": "ふかくじつせい",
    "romaji": "fukakujitsusei"
  },
  "世界各地": {
    "kana": "せかいかくち",
    "romaji": "sekaikakuchi"
  },
  "両替する": {
    "kana": "りょうがえする",
    "romaji": "ryougae suru"
  },
  "中傷記事": {
    "kana": "ちゅうしょうきじ",
    "romaji": "chuushou kiji"
  },
  "中央銀行": {
    "kana": "ちゅうおうぎんこう",
    "romaji": "chuuou ginkou"
  },
  "中止する": {
    "kana": "ちゅうしする",
    "romaji": "chuushi suru"
  },
  "中途半端": {
    "kana": "ちゅうとはんぱ",
    "romaji": "chuutohanpa"
  },
  "乗っても": {
    "kana": "のっても",
    "romaji": "notte mo"
  },
  "乗ります": {
    "kana": "のります",
    "romaji": "norimasu"
  },
  "了承する": {
    "kana": "りょうしょうする",
    "romaji": "ryoushou suru"
  },
  "予備在庫": {
    "kana": "よびざいこ",
    "romaji": "yobi zaiko"
  },
  "予算規模": {
    "kana": "よさんきぼ",
    "romaji": "yosan kibo"
  },
  "予約する": {
    "kana": "よやくする",
    "romaji": "yoyakusuru"
  },
  "予防する": {
    "kana": "よぼうする",
    "romaji": "yobou suru"
  },
  "予防医療": {
    "kana": "よぼういりょう",
    "romaji": "yobouiryou"
  },
  "事業創出": {
    "kana": "じぎょうそうしゅつ",
    "romaji": "jigyou soushutsu"
  },
  "事業展開": {
    "kana": "じぎょうてんかい",
    "romaji": "jigyou tenkai"
  },
  "事業継続": {
    "kana": "じぎょうけいぞく",
    "romaji": "jigyou keizoku"
  },
  "二人手伝": {
    "kana": "ふたりてつだい",
    "romaji": "futari tetsudai"
  },
  "二十四日": {
    "kana": "にじゅうよっか",
    "romaji": "nijuuyokka"
  },
  "二律背反": {
    "kana": "にりつはいはん",
    "romaji": "niritsuhaihan"
  },
  "二時間前": {
    "kana": "にじかんまえ",
    "romaji": "nijikan mae"
  },
  "二重入力": {
    "kana": "にじゅうにゅうりょく",
    "romaji": "nijuu nyuuryoku"
  },
  "二重敬語": {
    "kana": "にじゅうけいご",
    "romaji": "nijuu keigo"
  },
  "二項対立": {
    "kana": "にこうたいりつ",
    "romaji": "nikou tairitsu"
  },
  "五段動詞": {
    "kana": "ごだんどうし",
    "romaji": "godan doushi"
  },
  "交換する": {
    "kana": "こうかんする",
    "romaji": "koukansuru"
  },
  "交渉妥結": {
    "kana": "こうしょうだけつ",
    "romaji": "koushou daketsu"
  },
  "交渉経験": {
    "kana": "こうしょうけいけん",
    "romaji": "koushou keiken"
  },
  "人事審査": {
    "kana": "じんじしんさ",
    "romaji": "jinji shinsa"
  },
  "人事異動": {
    "kana": "じんじいどう",
    "romaji": "jinjiidou"
  },
  "人員配置": {
    "kana": "じんいんはいち",
    "romaji": "jin'in haichi"
  },
  "人手不足": {
    "kana": "ひとでぶそく",
    "romaji": "hitodebusoku"
  },
  "人材育成": {
    "kana": "じんざいいくせい",
    "romaji": "jinzai ikusei"
  },
  "人権基準": {
    "kana": "じんけんきじゅん",
    "romaji": "jinken kijun"
  },
  "人的資本": {
    "kana": "じんてきしほん",
    "romaji": "jinteki shihon"
  },
  "人道上断": {
    "kana": "じんどううえだん",
    "romaji": "jindou ue dan"
  },
  "人道上決": {
    "kana": "じんどううえけつ",
    "romaji": "jindou ue ketsu"
  },
  "人間心理": {
    "kana": "にんげんしんり",
    "romaji": "ningen shinri"
  },
  "人類共通": {
    "kana": "じんるいきょうつう",
    "romaji": "jinruikyoutsuu"
  },
  "今回優勝": {
    "kana": "こんかいゆうしょう",
    "romaji": "konkai yuushou"
  },
  "今度発表": {
    "kana": "こんどはっぴょう",
    "romaji": "kondo happyou"
  },
  "仕事する": {
    "kana": "しごとする",
    "romaji": "shigotosuru"
  },
  "付加価値": {
    "kana": "ふかかち",
    "romaji": "fukakachi"
  },
  "代わりに": {
    "kana": "かわりに",
    "romaji": "kawari ni"
  },
  "代替可能": {
    "kana": "だいたいかのう",
    "romaji": "daitai kanou"
  },
  "仮想空間": {
    "kana": "かそうくうかん",
    "romaji": "kasoukuukan"
  },
  "仲介基盤": {
    "kana": "ちゅうかいきばん",
    "romaji": "chuukai kiban"
  },
  "企業価値": {
    "kana": "きぎょうかち",
    "romaji": "kigyou kachi"
  },
  "企業統治": {
    "kana": "きぎょうとうち",
    "romaji": "kigyou touchi"
  },
  "休みます": {
    "kana": "やすみます",
    "romaji": "yasumimasu"
  },
  "休憩する": {
    "kana": "きゅうけいする",
    "romaji": "kyuukeisuru"
  },
  "会います": {
    "kana": "あいます",
    "romaji": "aimasu"
  },
  "会員登録": {
    "kana": "かいいんとうろく",
    "romaji": "kaiin touroku"
  },
  "会場設営": {
    "kana": "かいじょうせつえい",
    "romaji": "kaijou setsuei"
  },
  "会議直前": {
    "kana": "かいぎちょくぜん",
    "romaji": "kaigi chokuzen"
  },
  "伝えます": {
    "kana": "つたえます",
    "romaji": "tsutaemasu"
  },
  "伝票番号": {
    "kana": "でんぴょうばんごう",
    "romaji": "denpyou bangou"
  },
  "伝統芸能": {
    "kana": "でんとうげいのう",
    "romaji": "dentougeinou"
  },
  "伝達以上": {
    "kana": "でんたついじょう",
    "romaji": "dentatsu ijou"
  },
  "位置関係": {
    "kana": "いちかんけい",
    "romaji": "ichikankei"
  },
  "住みます": {
    "kana": "すみます",
    "romaji": "sumimasu"
  },
  "住民有志": {
    "kana": "じゅうみんゆうし",
    "romaji": "juumin yuushi"
  },
  "体操する": {
    "kana": "たいそうする",
    "romaji": "taisou suru"
  },
  "体験する": {
    "kana": "たいけんする",
    "romaji": "taiken suru"
  },
  "何ですか": {
    "kana": "なんですか",
    "romaji": "nan desu ka"
  },
  "作ります": {
    "kana": "つくります",
    "romaji": "tsukurimasu"
  },
  "作品本来": {
    "kana": "さくひんほんらい",
    "romaji": "sakuhin honrai"
  },
  "作成する": {
    "kana": "さくせいする",
    "romaji": "sakuseisuru"
  },
  "使います": {
    "kana": "つかいます",
    "romaji": "tsukaimasu"
  },
  "使用する": {
    "kana": "しようする",
    "romaji": "shiyousuru"
  },
  "依頼する": {
    "kana": "いらいする",
    "romaji": "iraisuru"
  },
  "価値判断": {
    "kana": "かちはんだん",
    "romaji": "kachihandan"
  },
  "価格転嫁": {
    "kana": "かかくてんか",
    "romaji": "kakaku tenka"
  },
  "保存修復": {
    "kana": "ほぞんしゅうふく",
    "romaji": "hozon shuufuku"
  },
  "保存環境": {
    "kana": "ほぞんかんきょう",
    "romaji": "hozon kankyou"
  },
  "保存研究": {
    "kana": "ほぞんけんきゅう",
    "romaji": "hozon kenkyuu"
  },
  "保守費用": {
    "kana": "ほしゅひよう",
    "romaji": "hoshu hiyou"
  },
  "保証する": {
    "kana": "ほしょうする",
    "romaji": "hoshou suru"
  },
  "信用する": {
    "kana": "しんようする",
    "romaji": "shin'you suru"
  },
  "信用創造": {
    "kana": "しんようそうぞう",
    "romaji": "shinyou souzou"
  },
  "信用問題": {
    "kana": "しんようもんだい",
    "romaji": "shinyou mondai"
  },
  "修理する": {
    "kana": "しゅうりする",
    "romaji": "shuurisuru"
  },
  "個人情報": {
    "kana": "こじんじょうほう",
    "romaji": "kojinjouhou"
  },
  "借ります": {
    "kana": "かります",
    "romaji": "karimasu"
  },
  "値上がり": {
    "kana": "ねあがり",
    "romaji": "neagari"
  },
  "健太先輩": {
    "kana": "けんたせんぱい",
    "romaji": "Keita-senpai"
  },
  "健康指導": {
    "kana": "けんこうしどう",
    "romaji": "kenkou shidou"
  },
  "健康格差": {
    "kana": "けんこうかくさ",
    "romaji": "kenkou kakusa"
  },
  "健康診断": {
    "kana": "けんこうしんだん",
    "romaji": "kenkoushindan"
  },
  "傷つける": {
    "kana": "きずつける",
    "romaji": "kizutsukeru"
  },
  "働きます": {
    "kana": "はたらきます",
    "romaji": "hatarakimasu"
  },
  "優先する": {
    "kana": "ゆうせんする",
    "romaji": "yuusen suru"
  },
  "優先順位": {
    "kana": "ゆうせんじゅんい",
    "romaji": "yuusenjun'i"
  },
  "優勝する": {
    "kana": "ゆうしょうする",
    "romaji": "yuushou suru"
  },
  "充満する": {
    "kana": "じゅうまんする",
    "romaji": "juuman suru"
  },
  "先日提出": {
    "kana": "せんじつていしゅつ",
    "romaji": "senjitsu teishutsu"
  },
  "先月刊行": {
    "kana": "せんげつかんこう",
    "romaji": "sengetsu kankou"
  },
  "先月発売": {
    "kana": "せんげつはつばい",
    "romaji": "sengetsuhatsubai"
  },
  "先端技術": {
    "kana": "せんたんぎじゅつ",
    "romaji": "sentangijutsu"
  },
  "先行検証": {
    "kana": "せんこうけんしょう",
    "romaji": "senkou kenshou"
  },
  "先行研究": {
    "kana": "せんこうけんきゅう",
    "romaji": "senkou kenkyuu"
  },
  "入ります": {
    "kana": "はいります",
    "romaji": "hairimasu"
  },
  "入れます": {
    "kana": "いれます",
    "romaji": "iremasu"
  },
  "入力する": {
    "kana": "にゅうりょくする",
    "romaji": "nyuuryoku suru"
  },
  "入浴する": {
    "kana": "にゅうよくする",
    "romaji": "nyuuyokusuru"
  },
  "入院治療": {
    "kana": "にゅういんちりょう",
    "romaji": "nyuuin chiryou"
  },
  "全員参加": {
    "kana": "ぜんいんさんか",
    "romaji": "zen'insanka"
  },
  "全面公開": {
    "kana": "ぜんめんこうかい",
    "romaji": "zenmen koukai"
  },
  "公共政策": {
    "kana": "こうきょうせいさく",
    "romaji": "koukyou seisaku"
  },
  "公共空間": {
    "kana": "こうきょうくうかん",
    "romaji": "koukyou kuukan"
  },
  "公平無私": {
    "kana": "こうへいむし",
    "romaji": "kouhei mushi"
  },
  "公的資金": {
    "kana": "こうてきしきん",
    "romaji": "koutekishikin"
  },
  "共同研究": {
    "kana": "きょうどうけんきゅう",
    "romaji": "kyoudoukenkyuu"
  },
  "共同調査": {
    "kana": "きょうどうちょうさ",
    "romaji": "kyoudou chousa"
  },
  "共有財産": {
    "kana": "きょうゆうざいさん",
    "romaji": "kyouyuu zaisan"
  },
  "共通言語": {
    "kana": "きょうつうげんご",
    "romaji": "kyoutsuugengo"
  },
  "内包する": {
    "kana": "ないほうする",
    "romaji": "naihou suru"
  },
  "冊子付録": {
    "kana": "さっしふろく",
    "romaji": "sasshi furoku"
  },
  "再現精度": {
    "kana": "さいげんせいど",
    "romaji": "saigen seido"
  },
  "再生可能": {
    "kana": "さいせいかのう",
    "romaji": "saiseikanou"
  },
  "再編自体": {
    "kana": "さいへんじたい",
    "romaji": "saihen jitai"
  },
  "再資源化": {
    "kana": "さいしげんか",
    "romaji": "saishigenka"
  },
  "最低賃金": {
    "kana": "さいていちんぎん",
    "romaji": "saiteichingin"
  },
  "冗談する": {
    "kana": "じょうだんする",
    "romaji": "joudan suru"
  },
  "冷蔵設備": {
    "kana": "れいぞうせつび",
    "romaji": "reizou setsubi"
  },
  "冷静沈着": {
    "kana": "れいせいちんちゃく",
    "romaji": "reisei chinchaku"
  },
  "凌駕する": {
    "kana": "りょうがする",
    "romaji": "ryouga suru"
  },
  "処理する": {
    "kana": "しょりする",
    "romaji": "shori suru"
  },
  "出かける": {
    "kana": "でかける",
    "romaji": "dekakeru"
  },
  "出します": {
    "kana": "だします",
    "romaji": "dashimasu"
  },
  "出力制御": {
    "kana": "しゅつりょくせいぎょ",
    "romaji": "shutsuryoku seigyo"
  },
  "出力変動": {
    "kana": "しゅつりょくへんどう",
    "romaji": "shutsuryoku hendou"
  },
  "出勤時間": {
    "kana": "しゅっきんじかん",
    "romaji": "shukkin jikan"
  },
  "出来ます": {
    "kana": "できます",
    "romaji": "dekimasu"
  },
  "出版構造": {
    "kana": "しゅっぱんこうぞう",
    "romaji": "shuppan kouzou"
  },
  "出発する": {
    "kana": "しゅっぱつする",
    "romaji": "shuppatsu suru"
  },
  "分かった": {
    "kana": "わかった",
    "romaji": "wakatta"
  },
  "分別する": {
    "kana": "ぶんべつする",
    "romaji": "bunbetsu suru"
  },
  "分別意識": {
    "kana": "ふんべついしき",
    "romaji": "funbetsu ishiki"
  },
  "分析する": {
    "kana": "ぶんせきする",
    "romaji": "bunsekisuru"
  },
  "分析手法": {
    "kana": "ぶんせきしゅほう",
    "romaji": "bunseki shuhou"
  },
  "分解する": {
    "kana": "ぶんかいする",
    "romaji": "bunkaisuru"
  },
  "切ります": {
    "kana": "きります",
    "romaji": "kirimasu"
  },
  "初期段階": {
    "kana": "しょきだんかい",
    "romaji": "shoki dankai"
  },
  "初期登録": {
    "kana": "しょきとうろく",
    "romaji": "shokitouroku"
  },
  "初期研修": {
    "kana": "しょきけんしゅう",
    "romaji": "shoki kenshuu"
  },
  "初期設定": {
    "kana": "しょきせってい",
    "romaji": "shokisettei"
  },
  "判断する": {
    "kana": "はんだんする",
    "romaji": "handansuru"
  },
  "判断過程": {
    "kana": "はんだんかてい",
    "romaji": "handan katei"
  },
  "利害関係": {
    "kana": "りがいかんけい",
    "romaji": "rigaikankei"
  },
  "利用最中": {
    "kana": "りようさいちゅう",
    "romaji": "riyou saichuu"
  },
  "利用比率": {
    "kana": "りようひりつ",
    "romaji": "riyou hiritsu"
  },
  "利用者数": {
    "kana": "りようしゃすう",
    "romaji": "riyoushasuu"
  },
  "利用規約": {
    "kana": "りようきやく",
    "romaji": "riyou kiyaku"
  },
  "利益相反": {
    "kana": "りえきそうはん",
    "romaji": "riekisouhan"
  },
  "到着する": {
    "kana": "とうちゃくする",
    "romaji": "touchakusuru"
  },
  "到着時間": {
    "kana": "とうちゃくじかん",
    "romaji": "touchaku jikan"
  },
  "到着次第": {
    "kana": "とうちゃくしだい",
    "romaji": "touchakushidai"
  },
  "制度設計": {
    "kana": "せいどせっけい",
    "romaji": "seido sekkei"
  },
  "削られる": {
    "kana": "けずられる",
    "romaji": "kezurareru"
  },
  "創薬基盤": {
    "kana": "そうやくきばん",
    "romaji": "souyaku kiban"
  },
  "創薬支援": {
    "kana": "そうやくしえん",
    "romaji": "souyaku shien"
  },
  "加熱する": {
    "kana": "かねつする",
    "romaji": "kanetsu suru"
  },
  "努力する": {
    "kana": "どりょくする",
    "romaji": "doryoku suru"
  },
  "労働保護": {
    "kana": "ろうどうほご",
    "romaji": "roudou hogo"
  },
  "労働環境": {
    "kana": "ろうどうかんきょう",
    "romaji": "roudoukankyou"
  },
  "労務管理": {
    "kana": "ろうむかんり",
    "romaji": "roumu kanri"
  },
  "労災補償": {
    "kana": "ろうさいほしょう",
    "romaji": "rousai hoshou"
  },
  "効きます": {
    "kana": "ききます",
    "romaji": "kikimasu"
  },
  "勉強する": {
    "kana": "べんきょうする",
    "romaji": "benkyousuru"
  },
  "動きます": {
    "kana": "うごきます",
    "romaji": "ugokimasu"
  },
  "化学物質": {
    "kana": "かがくぶっしつ",
    "romaji": "kagakubusshitsu"
  },
  "医療倫理": {
    "kana": "いりょうりんり",
    "romaji": "iryou rinri"
  },
  "医療現場": {
    "kana": "いりょうげんば",
    "romaji": "iryougenba"
  },
  "医療記録": {
    "kana": "いりょうきろく",
    "romaji": "iryou kiroku"
  },
  "十一時半": {
    "kana": "じゅういちじはん",
    "romaji": "juuichijihan"
  },
  "十二時半": {
    "kana": "じゅうにじはん",
    "romaji": "juunijihan"
  },
  "千五百円": {
    "kana": "せんごひゃくえん",
    "romaji": "sen gohyaku en"
  },
  "午前十時": {
    "kana": "ごぜんととき",
    "romaji": "gozen totoki"
  },
  "午前零時": {
    "kana": "ごぜんれいじ",
    "romaji": "gozen reiji"
  },
  "午後二時": {
    "kana": "ごごにじ",
    "romaji": "gogo niji"
  },
  "半分以上": {
    "kana": "はんぶんいじょう",
    "romaji": "hanbun'ijou"
  },
  "半年以上": {
    "kana": "はんとしいじょう",
    "romaji": "hantoshiijou"
  },
  "卒業論文": {
    "kana": "そつぎょうろんぶん",
    "romaji": "sotsugyouronbun"
  },
  "協力する": {
    "kana": "きょうりょくする",
    "romaji": "kyouryoku suru"
  },
  "単一分野": {
    "kana": "たんいつぶんや",
    "romaji": "tan'itsu bunya"
  },
  "危機管理": {
    "kana": "ききかんり",
    "romaji": "kiki kanri"
  },
  "即時応答": {
    "kana": "そくじおうとう",
    "romaji": "sokuji outou"
  },
  "原価低減": {
    "kana": "げんかていげん",
    "romaji": "genka teigen"
  },
  "原材料費": {
    "kana": "げんざいりょうひ",
    "romaji": "genzairyouhi"
  },
  "参加する": {
    "kana": "さんかする",
    "romaji": "sanka suru"
  },
  "参加登録": {
    "kana": "さんかとうろく",
    "romaji": "sankatouroku"
  },
  "反対する": {
    "kana": "はんたいする",
    "romaji": "hantai suru"
  },
  "反省する": {
    "kana": "はんせいする",
    "romaji": "hansei suru"
  },
  "収斂する": {
    "kana": "しゅうれんする",
    "romaji": "shuuren suru"
  },
  "収益改善": {
    "kana": "しゅうえきかいぜん",
    "romaji": "shuueki kaizen"
  },
  "取ります": {
    "kana": "とります",
    "romaji": "torimasu"
  },
  "取り出す": {
    "kana": "とりだす",
    "romaji": "toridasu"
  },
  "取り組み": {
    "kana": "とりくみ",
    "romaji": "torikumi"
  },
  "取り込む": {
    "kana": "とりこむ",
    "romaji": "torikomu"
  },
  "取引履歴": {
    "kana": "とりひきりれき",
    "romaji": "torihiki rireki"
  },
  "受け取る": {
    "kana": "うけとる",
    "romaji": "uketoru"
  },
  "受診勧奨": {
    "kana": "じゅしんかんしょう",
    "romaji": "jushin kanshou"
  },
  "受験する": {
    "kana": "じゅけんする",
    "romaji": "juken suru"
  },
  "古典小説": {
    "kana": "こてんしょうせつ",
    "romaji": "koten shousetsu"
  },
  "古民家宿": {
    "kana": "こみんかやど",
    "romaji": "ko minka yado"
  },
  "可笑しい": {
    "kana": "おかしい",
    "romaji": "okashii"
  },
  "史料批判": {
    "kana": "しりょうひはん",
    "romaji": "shiryou hihan"
  },
  "司法判断": {
    "kana": "しほうはんだん",
    "romaji": "shihouhandan"
  },
  "吃驚する": {
    "kana": "びっくりする",
    "romaji": "bikkuri suru"
  },
  "合わせる": {
    "kana": "あわせる",
    "romaji": "awaseru"
  },
  "合わせろ": {
    "kana": "あわせろ",
    "romaji": "awasero"
  },
  "合意形成": {
    "kana": "ごういけいせい",
    "romaji": "gouikeisei"
  },
  "合格する": {
    "kana": "ごうかくする",
    "romaji": "goukaku suru"
  },
  "同時接続": {
    "kana": "どうじせつぞく",
    "romaji": "douji setsuzoku"
  },
  "向上する": {
    "kana": "こうじょうする",
    "romaji": "koujou suru"
  },
  "吸います": {
    "kana": "すいます",
    "romaji": "suimasu"
  },
  "呼びます": {
    "kana": "よびます",
    "romaji": "yobimasu"
  },
  "商売する": {
    "kana": "しょうばいする",
    "romaji": "shoubai suru"
  },
  "啓発活動": {
    "kana": "けいはつかつどう",
    "romaji": "keihatsu katsudou"
  },
  "喋ります": {
    "kana": "しゃべります",
    "romaji": "shaberimasu"
  },
  "喚起する": {
    "kana": "かんきする",
    "romaji": "kanki suru"
  },
  "喧嘩する": {
    "kana": "けんかする",
    "romaji": "kenka suru"
  },
  "噴射する": {
    "kana": "ふんしゃする",
    "romaji": "funsha suru"
  },
  "四十五分": {
    "kana": "よんじゅうごふん",
    "romaji": "yonjuugofun"
  },
  "四十年前": {
    "kana": "しじゅうねんまえ",
    "romaji": "shijuu nenmae"
  },
  "回目以降": {
    "kana": "かいめいこう",
    "romaji": "kaime ikou"
  },
  "回転する": {
    "kana": "かいてんする",
    "romaji": "kaitensuru"
  },
  "因果関係": {
    "kana": "いんがかんけい",
    "romaji": "ingakankei"
  },
  "困ります": {
    "kana": "こまります",
    "romaji": "komarimasu"
  },
  "囲炉裏端": {
    "kana": "いろりばた",
    "romaji": "iroribata"
  },
  "図らずも": {
    "kana": "はからずも",
    "romaji": "hakarazumo"
  },
  "図書館側": {
    "kana": "としょかんがわ",
    "romaji": "toshokan gawa"
  },
  "国内企業": {
    "kana": "こくないきぎょう",
    "romaji": "kokunai kigyou"
  },
  "国内回帰": {
    "kana": "こくないかいき",
    "romaji": "kokunai kaiki"
  },
  "国際分業": {
    "kana": "こくさいぶんぎょう",
    "romaji": "kokusai bungyou"
  },
  "国際協調": {
    "kana": "こくさいきょうちょう",
    "romaji": "kokusai kyouchou"
  },
  "国際大会": {
    "kana": "こくさいたいかい",
    "romaji": "kokusaitaikai"
  },
  "在宅勤務": {
    "kana": "ざいたくきんむ",
    "romaji": "zaitakukinmu"
  },
  "在庫管理": {
    "kana": "ざいこかんり",
    "romaji": "zaikokanri"
  },
  "地元店主": {
    "kana": "じもとてんしゅ",
    "romaji": "jimoto tenshu"
  },
  "地域清掃": {
    "kana": "ちいきせいそう",
    "romaji": "chiiki seisou"
  },
  "地域社会": {
    "kana": "ちいきしゃかい",
    "romaji": "chiikishakai"
  },
  "地方鉄道": {
    "kana": "ちほうてつどう",
    "romaji": "chihoutetsudou"
  },
  "地震避難": {
    "kana": "じしんひなん",
    "romaji": "jishin hinan"
  },
  "基調講演": {
    "kana": "きちょうこうえん",
    "romaji": "kichoukouen"
  },
  "報告する": {
    "kana": "ほうこくする",
    "romaji": "houkoku suru"
  },
  "報道資料": {
    "kana": "ほうどうしりょう",
    "romaji": "houdou shiryou"
  },
  "報酬制度": {
    "kana": "ほうしゅうせいど",
    "romaji": "houshuu seido"
  },
  "報酬単価": {
    "kana": "ほうしゅうたんか",
    "romaji": "houshuu tanka"
  },
  "境界領域": {
    "kana": "きょうかいりょういき",
    "romaji": "kyoukairyouiki"
  },
  "壊れます": {
    "kana": "こわれます",
    "romaji": "kowarimasu"
  },
  "売ります": {
    "kana": "うります",
    "romaji": "urimasu"
  },
  "外交機密": {
    "kana": "がいこうきみつ",
    "romaji": "gaikou kimitsu"
  },
  "外科手術": {
    "kana": "げかしゅじゅつ",
    "romaji": "geka shujutsu"
  },
  "外観検査": {
    "kana": "がいかんけんさ",
    "romaji": "gaikan kensa"
  },
  "外部人材": {
    "kana": "がいぶじんざい",
    "romaji": "gaibu jinzai"
  },
  "多忙中恐": {
    "kana": "たぼうなかきょう",
    "romaji": "tabou naka kyou"
  },
  "多数出席": {
    "kana": "たすうしゅっせき",
    "romaji": "tasuu shusseki"
  },
  "夜間勤務": {
    "kana": "やかんきんむ",
    "romaji": "yakan kinmu"
  },
  "夜間講座": {
    "kana": "やかんこうざ",
    "romaji": "yakan kouza"
  },
  "大学二年": {
    "kana": "だいがくにねん",
    "romaji": "daigaku ninen"
  },
  "大学全体": {
    "kana": "だいがくぜんたい",
    "romaji": "daigakuzentai"
  },
  "大量発注": {
    "kana": "たいりょうはっちゅう",
    "romaji": "tairyouhatchuu"
  },
  "天気予報": {
    "kana": "てんきよほう",
    "romaji": "tenkiyohou"
  },
  "失敗する": {
    "kana": "しっぱいする",
    "romaji": "shippai suru"
  },
  "失業する": {
    "kana": "しつぎょうする",
    "romaji": "shitsugyou suru"
  },
  "失礼する": {
    "kana": "しつれいする",
    "romaji": "shitsurei suru"
  },
  "女子学生": {
    "kana": "じょしがくせい",
    "romaji": "joshi gakusei"
  },
  "妊娠する": {
    "kana": "にんしんする",
    "romaji": "ninshin suru"
  },
  "始めます": {
    "kana": "はじめます",
    "romaji": "hajimemasu"
  },
  "姿勢自体": {
    "kana": "しせいじたい",
    "romaji": "shisei jitai"
  },
  "嫌になる": {
    "kana": "いやになる",
    "romaji": "iya ni naru"
  },
  "子育て中": {
    "kana": "こそだてちゅう",
    "romaji": "kosodatechuu"
  },
  "学会単位": {
    "kana": "がっかいたんい",
    "romaji": "gakkai tan'i"
  },
  "学生時代": {
    "kana": "がくせいじだい",
    "romaji": "gakuseijidai"
  },
  "学術研究": {
    "kana": "がくじゅつけんきゅう",
    "romaji": "gakujutsu kenkyuu"
  },
  "学際研究": {
    "kana": "がくさいけんきゅう",
    "romaji": "gakusai kenkyuu"
  },
  "安全対策": {
    "kana": "あんぜんたいさく",
    "romaji": "anzen taisaku"
  },
  "安全研修": {
    "kana": "あんぜんけんおさむ",
    "romaji": "anzenken osamu"
  },
  "安定稼働": {
    "kana": "あんていかどう",
    "romaji": "anteikadou"
  },
  "実務経験": {
    "kana": "じつむけいけん",
    "romaji": "jitsumukeiken"
  },
  "実施する": {
    "kana": "じっしする",
    "romaji": "jisshi suru"
  },
  "実用段階": {
    "kana": "じつようだんかい",
    "romaji": "jitsuyou dankai"
  },
  "実習する": {
    "kana": "じっしゅうする",
    "romaji": "jisshuu suru"
  },
  "実行する": {
    "kana": "じっこうする",
    "romaji": "jikkou suru"
  },
  "実証実験": {
    "kana": "じっしょうじっけん",
    "romaji": "jisshou jikken"
  },
  "実証研究": {
    "kana": "じっしょうけんきゅう",
    "romaji": "jisshou kenkyuu"
  },
  "実証科学": {
    "kana": "じっしょうかがく",
    "romaji": "jisshou kagaku"
  },
  "実験結果": {
    "kana": "じっけんけっか",
    "romaji": "jikkenkekka"
  },
  "密室政治": {
    "kana": "みっしつせいじ",
    "romaji": "misshitsu seiji"
  },
  "寝坊する": {
    "kana": "ねぼうする",
    "romaji": "nebou suru"
  },
  "対症療法": {
    "kana": "たいしょうりょうほう",
    "romaji": "taishouryouhou"
  },
  "対策する": {
    "kana": "たいさくする",
    "romaji": "taisakusuru"
  },
  "専門分化": {
    "kana": "せんもんぶんか",
    "romaji": "senmon bunka"
  },
  "専門技能": {
    "kana": "せんもんぎのう",
    "romaji": "senmon ginou"
  },
  "専門知識": {
    "kana": "せんもんちしき",
    "romaji": "senmonchishiki"
  },
  "専門辞書": {
    "kana": "せんもんじしょ",
    "romaji": "senmon jisho"
  },
  "将来自分": {
    "kana": "しょうらいじぶん",
    "romaji": "shourai jibun"
  },
  "尊敬する": {
    "kana": "そんけいする",
    "romaji": "sonkei suru"
  },
  "就労形態": {
    "kana": "しゅうろうけいたい",
    "romaji": "shuurou keitai"
  },
  "就職する": {
    "kana": "しゅうしょくする",
    "romaji": "shuushoku suru"
  },
  "展示する": {
    "kana": "てんじする",
    "romaji": "tenji suru"
  },
  "展示会場": {
    "kana": "てんじかいじょう",
    "romaji": "tenjikaijou"
  },
  "工場設備": {
    "kana": "こうじょうせつび",
    "romaji": "koujou setsubi"
  },
  "工程する": {
    "kana": "こうていする",
    "romaji": "kouteisuru"
  },
  "工芸技術": {
    "kana": "こうげいぎじゅつ",
    "romaji": "kougei gijutsu"
  },
  "市場原理": {
    "kana": "しじょうげんり",
    "romaji": "shijougenri"
  },
  "市場変動": {
    "kana": "しじょうへんどう",
    "romaji": "shijou hendou"
  },
  "市民健康": {
    "kana": "しみんけんこう",
    "romaji": "shimin kenkou"
  },
  "市民団体": {
    "kana": "しみんだんたい",
    "romaji": "shimindantai"
  },
  "師弟関係": {
    "kana": "していかんけい",
    "romaji": "shitei kankei"
  },
  "帰ります": {
    "kana": "かえります",
    "romaji": "kaerimasu"
  },
  "帰属する": {
    "kana": "きぞくする",
    "romaji": "kizoku suru"
  },
  "広報部門": {
    "kana": "こうほうぶもん",
    "romaji": "kouhoubu mon"
  },
  "座ります": {
    "kana": "すわります",
    "romaji": "suwarimasu"
  },
  "廃棄段階": {
    "kana": "はいきだんかい",
    "romaji": "haiki dankai"
  },
  "延伸区間": {
    "kana": "えんしんくかん",
    "romaji": "enshin kukan"
  },
  "延期する": {
    "kana": "えんきする",
    "romaji": "enki suru"
  },
  "建物内部": {
    "kana": "たてものないぶ",
    "romaji": "tatemononai bu"
  },
  "建築設計": {
    "kana": "けんちくせっけい",
    "romaji": "kenchiku sekkei"
  },
  "建設用地": {
    "kana": "けんせつようち",
    "romaji": "kensetsuyou chi"
  },
  "引きます": {
    "kana": "ひきます",
    "romaji": "hikimasu"
  },
  "引き出し": {
    "kana": "ひきだし",
    "romaji": "hikidashi"
  },
  "引っ張る": {
    "kana": "ひっぱる",
    "romaji": "hipparu"
  },
  "引退する": {
    "kana": "いんたいする",
    "romaji": "intai suru"
  },
  "強すぎて": {
    "kana": "つよすぎて",
    "romaji": "tsuyosugite"
  },
  "強制調査": {
    "kana": "きょうせいちょうさ",
    "romaji": "kyousei chousa"
  },
  "当初見込": {
    "kana": "とうしょみこみ",
    "romaji": "tousho mikomi"
  },
  "待ちます": {
    "kana": "まちます",
    "romaji": "machimasu"
  },
  "復元展示": {
    "kana": "ふくげんてんじ",
    "romaji": "fukugen tenji"
  },
  "復元映像": {
    "kana": "ふくげんえいぞう",
    "romaji": "fukugen eizou"
  },
  "復旧工事": {
    "kana": "ふっきゅうこうじ",
    "romaji": "fukkyuu kouji"
  },
  "循環論法": {
    "kana": "じゅんかんろんぽう",
    "romaji": "junkanronpou"
  },
  "心配する": {
    "kana": "しんぱいする",
    "romaji": "shinpai suru"
  },
  "必要する": {
    "kana": "ひつようする",
    "romaji": "hitsuyou suru"
  },
  "忘れます": {
    "kana": "わすれます",
    "romaji": "wasuremasu"
  },
  "応じます": {
    "kana": "おうじます",
    "romaji": "oujimasu"
  },
  "応募する": {
    "kana": "おうぼする",
    "romaji": "oubo suru"
  },
  "怒られる": {
    "kana": "おこられる",
    "romaji": "okorareru"
  },
  "怒ります": {
    "kana": "おこります",
    "romaji": "okorimasu"
  },
  "思います": {
    "kana": "おもいます",
    "romaji": "omoimasu"
  },
  "思い出す": {
    "kana": "おもいだす",
    "romaji": "omoidasu"
  },
  "思考様式": {
    "kana": "しこうようしき",
    "romaji": "shikou youshiki"
  },
  "急ぎます": {
    "kana": "いそぎます",
    "romaji": "isogimasu"
  },
  "急行電車": {
    "kana": "きゅうこうでんしゃ",
    "romaji": "kyuukoudensha"
  },
  "怪我する": {
    "kana": "けがする",
    "romaji": "kega suru"
  },
  "患者本人": {
    "kana": "かんじゃほんにん",
    "romaji": "kanja honnin"
  },
  "情報保安": {
    "kana": "じょうほうほあん",
    "romaji": "jouhou hoan"
  },
  "情報提供": {
    "kana": "じょうほうていきょう",
    "romaji": "jouhouteikyou"
  },
  "情報摂取": {
    "kana": "じょうほうせっしゅ",
    "romaji": "jouhou sesshu"
  },
  "情報環境": {
    "kana": "じょうほうかんきょう",
    "romaji": "jouhou kankyou"
  },
  "想像以上": {
    "kana": "そうぞういじょう",
    "romaji": "souzouijou"
  },
  "意思決定": {
    "kana": "いしけってい",
    "romaji": "ishi kettei"
  },
  "意思表示": {
    "kana": "いしひょうじ",
    "romaji": "ishihyouji"
  },
  "意識変化": {
    "kana": "いしきへんか",
    "romaji": "ishiki henka"
  },
  "感動する": {
    "kana": "かんどうする",
    "romaji": "kandou suru"
  },
  "感染する": {
    "kana": "かんせんする",
    "romaji": "kansen suru"
  },
  "感謝する": {
    "kana": "かんしゃする",
    "romaji": "kansha suru"
  },
  "懐かしい": {
    "kana": "なつかしい",
    "romaji": "natsukashii"
  },
  "成功する": {
    "kana": "せいこうする",
    "romaji": "seikou suru"
  },
  "成熟経済": {
    "kana": "せいじゅくけいざい",
    "romaji": "seijuku keizai"
  },
  "我慢する": {
    "kana": "がまんする",
    "romaji": "gaman suru"
  },
  "手洗い場": {
    "kana": "てあらいば",
    "romaji": "teareiba"
  },
  "払います": {
    "kana": "はらいます",
    "romaji": "haraimasu"
  },
  "扱われる": {
    "kana": "あつかわれる",
    "romaji": "atsukawareru"
  },
  "承認する": {
    "kana": "しょうにんする",
    "romaji": "shounin suru"
  },
  "技術水準": {
    "kana": "ぎじゅつすいじゅん",
    "romaji": "gijutsusuijun"
  },
  "投稿論文": {
    "kana": "とうこうろんぶん",
    "romaji": "toukou ronbun"
  },
  "抗生物質": {
    "kana": "こうせいぶっしつ",
    "romaji": "kouseibusshitsu"
  },
  "押します": {
    "kana": "おします",
    "romaji": "oshimasu"
  },
  "担保する": {
    "kana": "たんぽする",
    "romaji": "tanpo suru"
  },
  "招待する": {
    "kana": "しょうたいする",
    "romaji": "shoutai suru"
  },
  "拠点同時": {
    "kana": "きょてんどうじ",
    "romaji": "kyoten douji"
  },
  "持ちます": {
    "kana": "もちます",
    "romaji": "mochimasu"
  },
  "持ち出す": {
    "kana": "もちだす",
    "romaji": "mochidasu"
  },
  "持ち帰り": {
    "kana": "もちかえり",
    "romaji": "mochikaeri"
  },
  "持ち込む": {
    "kana": "もちこむ",
    "romaji": "mochikomu"
  },
  "持ち運び": {
    "kana": "もちはこび",
    "romaji": "mochihakobi"
  },
  "指導教員": {
    "kana": "しどうきょういん",
    "romaji": "shidou kyouin"
  },
  "指揮監督": {
    "kana": "しきかんとく",
    "romaji": "shikikantoku"
  },
  "振り向く": {
    "kana": "ふりむく",
    "romaji": "furimuku"
  },
  "掃除する": {
    "kana": "そうじする",
    "romaji": "soujisuru"
  },
  "排水設備": {
    "kana": "はいすいせつび",
    "romaji": "haisui setsubi"
  },
  "掛けます": {
    "kana": "かけます",
    "romaji": "kakemasu"
  },
  "採択推奨": {
    "kana": "さいたくすいしょう",
    "romaji": "saitaku suishou"
  },
  "提示方法": {
    "kana": "ていじほうほう",
    "romaji": "teiji houhou"
  },
  "換えます": {
    "kana": "かえます",
    "romaji": "kaemasu"
  },
  "操作する": {
    "kana": "そうさする",
    "romaji": "sousasuru"
  },
  "操作研修": {
    "kana": "そうさけんしゅう",
    "romaji": "sousa kenshuu"
  },
  "支給可否": {
    "kana": "しきゅうかひ",
    "romaji": "shikyuu kahi"
  },
  "改修費用": {
    "kana": "かいしゅうひよう",
    "romaji": "kaishuu hiyou"
  },
  "改正する": {
    "kana": "かいせいする",
    "romaji": "kaisei suru"
  },
  "改装工事": {
    "kana": "かいそうこうじ",
    "romaji": "kaisoukouji"
  },
  "改造する": {
    "kana": "かいぞうする",
    "romaji": "kaizou suru"
  },
  "政策指標": {
    "kana": "せいさくしひょう",
    "romaji": "seisaku shihyou"
  },
  "政策立案": {
    "kana": "せいさくりつあん",
    "romaji": "seisaku ritsuan"
  },
  "故障する": {
    "kana": "こしょうする",
    "romaji": "koshousuru"
  },
  "救出活動": {
    "kana": "きゅうしゅつかつどう",
    "romaji": "kyuushutsu katsudou"
  },
  "教えます": {
    "kana": "おしえます",
    "romaji": "oshiemasu"
  },
  "教育する": {
    "kana": "きょういくする",
    "romaji": "kyouiku suru"
  },
  "散歩する": {
    "kana": "さんぽする",
    "romaji": "sanposuru"
  },
  "数十年前": {
    "kana": "すうじゅうねんまえ",
    "romaji": "suujuunenmae"
  },
  "文化遺産": {
    "kana": "ぶんかいさん",
    "romaji": "bunka isan"
  },
  "文字記録": {
    "kana": "もじきろく",
    "romaji": "moji kiroku"
  },
  "文献史料": {
    "kana": "ぶんけんしりょう",
    "romaji": "bunken shiryou"
  },
  "料理教室": {
    "kana": "りょうりきょうしつ",
    "romaji": "ryourikyoushitsu"
  },
  "料理道具": {
    "kana": "りょうりどうぐ",
    "romaji": "ryouridougu"
  },
  "料理配達": {
    "kana": "りょうりはいたつ",
    "romaji": "ryouri haitatsu"
  },
  "断れます": {
    "kana": "ことわれます",
    "romaji": "kotowaremasu"
  },
  "断水する": {
    "kana": "だんすいする",
    "romaji": "dansui suru"
  },
  "断熱性能": {
    "kana": "だんねつせいのう",
    "romaji": "dannetsuseinou"
  },
  "新入社員": {
    "kana": "しんにゅうしゃいん",
    "romaji": "shinnyuushain"
  },
  "新大阪駅": {
    "kana": "しんおおさかえき",
    "romaji": "shinoosakaeki"
  },
  "方言変容": {
    "kana": "ほうげんへんよう",
    "romaji": "hougen henyou"
  },
  "旅行する": {
    "kana": "りょこうする",
    "romaji": "ryokousuru"
  },
  "既得権益": {
    "kana": "きとくけんえき",
    "romaji": "kitokukeneki"
  },
  "日程変更": {
    "kana": "にっていへんこう",
    "romaji": "nitteihenkou"
  },
  "早退する": {
    "kana": "そうたいする",
    "romaji": "soutai suru"
  },
  "明治文学": {
    "kana": "めいじぶんがく",
    "romaji": "meiji bungaku"
  },
  "時代考証": {
    "kana": "じだいこうしょう",
    "romaji": "jidaikoushou"
  },
  "時代背景": {
    "kana": "じだいはいけい",
    "romaji": "jidai haikei"
  },
  "時半集合": {
    "kana": "じはんしゅうごう",
    "romaji": "jihan shuugou"
  },
  "暗記する": {
    "kana": "あんきする",
    "romaji": "anki suru"
  },
  "更新費用": {
    "kana": "こうしんひよう",
    "romaji": "koushin hiyou"
  },
  "書きます": {
    "kana": "かきます",
    "romaji": "kakimasu"
  },
  "有形資産": {
    "kana": "ゆうけいしさん",
    "romaji": "yuukei shisan"
  },
  "期待する": {
    "kana": "きたいする",
    "romaji": "kitai suru"
  },
  "木造住宅": {
    "kana": "もくぞうじゅうたく",
    "romaji": "mokuzou juutaku"
  },
  "本末転倒": {
    "kana": "ほんまつてんとう",
    "romaji": "honmatsu tentou"
  },
  "条項削除": {
    "kana": "じょうこうさくじょ",
    "romaji": "joukou sakujo"
  },
  "東西南北": {
    "kana": "とうざいなんぼく",
    "romaji": "touzainanboku"
  },
  "枝葉末節": {
    "kana": "しようまっせつ",
    "romaji": "shiyoumassetsu"
  },
  "柔らかい": {
    "kana": "やわらかい",
    "romaji": "yawarakai"
  },
  "査読結果": {
    "kana": "さどくけっか",
    "romaji": "sadokukekka"
  },
  "株式市場": {
    "kana": "かぶしきしじょう",
    "romaji": "kabushikishijou"
  },
  "案内する": {
    "kana": "あんないする",
    "romaji": "annai suru"
  },
  "植林事業": {
    "kana": "しょくりんじぎょう",
    "romaji": "shokurin jigyou"
  },
  "検品速度": {
    "kana": "けんぴんそくど",
    "romaji": "kenpin sokudo"
  },
  "検査する": {
    "kana": "けんさする",
    "romaji": "kensa suru"
  },
  "検査導入": {
    "kana": "けんさどうにゅう",
    "romaji": "kensa dounyuu"
  },
  "検索結果": {
    "kana": "けんさくけっか",
    "romaji": "kensakukekka"
  },
  "検証する": {
    "kana": "けんしょうする",
    "romaji": "kenshou suru"
  },
  "検証結果": {
    "kana": "けんしょうけっか",
    "romaji": "kenshoukekka"
  },
  "業務手順": {
    "kana": "ぎょうむてじゅん",
    "romaji": "gyoumu tejun"
  },
  "業績評価": {
    "kana": "ぎょうせきひょうか",
    "romaji": "gyouseki hyouka"
  },
  "極限環境": {
    "kana": "きょくげんかんきょう",
    "romaji": "kyokugen kankyou"
  },
  "権利擁護": {
    "kana": "けんりようご",
    "romaji": "kenri yougo"
  },
  "権利関係": {
    "kana": "けんりかんけい",
    "romaji": "kenri kankei"
  },
  "機密資料": {
    "kana": "きみつしりょう",
    "romaji": "kimitsu shiryou"
  },
  "欠勤する": {
    "kana": "けっきんする",
    "romaji": "kekkinsuru"
  },
  "欠席する": {
    "kana": "けっせきする",
    "romaji": "kessekisuru"
  },
  "歌います": {
    "kana": "うたいます",
    "romaji": "utaimasu"
  },
  "歓迎する": {
    "kana": "かんげいする",
    "romaji": "kangei suru"
  },
  "止まって": {
    "kana": "とまって",
    "romaji": "tomatte"
  },
  "止めます": {
    "kana": "とめます",
    "romaji": "tomemasu"
  },
  "止めよう": {
    "kana": "とめよう",
    "romaji": "tomeyou"
  },
  "歩いても": {
    "kana": "あるいても",
    "romaji": "aruite mo"
  },
  "歩きます": {
    "kana": "あるきます",
    "romaji": "arukimasu"
  },
  "歯ブラシ": {
    "kana": "はブラシ",
    "romaji": "haburashi"
  },
  "歴史叙述": {
    "kana": "れきしじょじゅつ",
    "romaji": "rekishi jojutsu"
  },
  "歴史研究": {
    "kana": "れきしけんきゅう",
    "romaji": "rekishi kenkyuu"
  },
  "残されて": {
    "kana": "のこされて",
    "romaji": "nokosarete"
  },
  "残業する": {
    "kana": "ざんぎょうする",
    "romaji": "zangyou suru"
  },
  "毎年八月": {
    "kana": "まいとしはちがつ",
    "romaji": "maitoshi hachigatsu"
  },
  "毎年見直": {
    "kana": "まいとしみなおし",
    "romaji": "maitoshi minaoshi"
  },
  "毎年記録": {
    "kana": "まいとしきろく",
    "romaji": "maitoshi kiroku"
  },
  "毎日公園": {
    "kana": "まいにちこうえん",
    "romaji": "mainichi kouen"
  },
  "毎日自炊": {
    "kana": "まいにちじすい",
    "romaji": "mainichi jisui"
  },
  "毎朝公園": {
    "kana": "まいあさこうえん",
    "romaji": "maiasa kouen"
  },
  "毎朝六時": {
    "kana": "まいあさろくとき",
    "romaji": "maiasa roku toki"
  },
  "毎朝自分": {
    "kana": "まいあさじぶん",
    "romaji": "maiasa jibun"
  },
  "毎朝駅前": {
    "kana": "まいあさえきまえ",
    "romaji": "maiasa ekimae"
  },
  "民主社会": {
    "kana": "みんしゅしゃかい",
    "romaji": "minshu shakai"
  },
  "民俗慣行": {
    "kana": "みんぞくかんこう",
    "romaji": "minzoku kankou"
  },
  "民間決済": {
    "kana": "みんかんけっさい",
    "romaji": "minkan kessai"
  },
  "民間管理": {
    "kana": "みんかんかんり",
    "romaji": "minkan kanri"
  },
  "民間銀行": {
    "kana": "みんかんぎんこう",
    "romaji": "minkan ginkou"
  },
  "気にする": {
    "kana": "きにする",
    "romaji": "ki ni suru"
  },
  "気に入る": {
    "kana": "きにいる",
    "romaji": "ki ni iru"
  },
  "気候変動": {
    "kana": "きこうへんどう",
    "romaji": "kikou hendou"
  },
  "気温上昇": {
    "kana": "きおんじょうしょう",
    "romaji": "kion joushou"
  },
  "気象条件": {
    "kana": "きしょうじょうけん",
    "romaji": "kishoujouken"
  },
  "水が濁る": {
    "kana": "みずがにごる",
    "romaji": "mizu ga nigoru"
  },
  "水を出す": {
    "kana": "みずをだす",
    "romaji": "mizu o dasu"
  },
  "水を切る": {
    "kana": "みずをきる",
    "romaji": "mizu o kiru"
  },
  "水没する": {
    "kana": "すいぼつする",
    "romaji": "suibotsu suru"
  },
  "水深数千": {
    "kana": "すいしんすうせん",
    "romaji": "suishin suusen"
  },
  "求めます": {
    "kana": "もとめます",
    "romaji": "motomemasu"
  },
  "汚染する": {
    "kana": "おせんする",
    "romaji": "osen suru"
  },
  "江戸時代": {
    "kana": "えどじだい",
    "romaji": "edojidai"
  },
  "決済基盤": {
    "kana": "けっさいきばん",
    "romaji": "kessai kiban"
  },
  "油を差す": {
    "kana": "あぶらをさす",
    "romaji": "abura o sasu"
  },
  "治療する": {
    "kana": "ちりょうする",
    "romaji": "chiryou suru"
  },
  "法令用語": {
    "kana": "ほうれいようご",
    "romaji": "hourei yougo"
  },
  "法務審査": {
    "kana": "ほうむしんさ",
    "romaji": "houmu shinsa"
  },
  "法務部門": {
    "kana": "ほうむぶもん",
    "romaji": "houmu bumon"
  },
  "法的手続": {
    "kana": "ほうてきてつづき",
    "romaji": "houteki tetsuzuki"
  },
  "注意する": {
    "kana": "ちゅういする",
    "romaji": "chuuisuru"
  },
  "注意事項": {
    "kana": "ちゅういじこう",
    "romaji": "chuuijikou"
  },
  "注文する": {
    "kana": "ちゅうもんする",
    "romaji": "chuumonsuru"
  },
  "泳ぎます": {
    "kana": "およぎます",
    "romaji": "oyogimasu"
  },
  "洗います": {
    "kana": "あらいます",
    "romaji": "araimasu"
  },
  "洗濯する": {
    "kana": "せんたくする",
    "romaji": "sentakusuru"
  },
  "津波警報": {
    "kana": "つなみけいほう",
    "romaji": "tsunami keihou"
  },
  "派生特許": {
    "kana": "はせいとっきょ",
    "romaji": "hasei tokkyo"
  },
  "流体解析": {
    "kana": "りゅうたいかいせき",
    "romaji": "ryuutaikaiseki"
  },
  "流域全体": {
    "kana": "りゅういきぜんたい",
    "romaji": "ryuuiki zentai"
  },
  "浴びます": {
    "kana": "あびます",
    "romaji": "abimasu"
  },
  "海外企業": {
    "kana": "かいがいきぎょう",
    "romaji": "kaigai kigyou"
  },
  "海外出張": {
    "kana": "かいがいしゅっちょう",
    "romaji": "kaigaishutchou"
  },
  "消えます": {
    "kana": "きえます",
    "romaji": "kiemasu"
  },
  "消しゴム": {
    "kana": "けしゴム",
    "romaji": "keshigomu"
  },
  "消します": {
    "kana": "けします",
    "romaji": "keshimasu"
  },
  "消火する": {
    "kana": "しょうかする",
    "romaji": "shouka suru"
  },
  "消費能力": {
    "kana": "しょうひのうりょく",
    "romaji": "shouhi nouryoku"
  },
  "添付する": {
    "kana": "てんぷする",
    "romaji": "tenpu suru"
  },
  "清掃活動": {
    "kana": "せいそうかつどう",
    "romaji": "seisoukatsudou"
  },
  "渡ります": {
    "kana": "わたります",
    "romaji": "watarimasu"
  },
  "温室効果": {
    "kana": "おんしつこうか",
    "romaji": "onshitsukouka"
  },
  "測定機器": {
    "kana": "そくていきうつわ",
    "romaji": "sokuteiki utsuwa"
  },
  "湿度管理": {
    "kana": "しつどかんり",
    "romaji": "shitsudo kanri"
  },
  "満足する": {
    "kana": "まんぞくする",
    "romaji": "manzoku suru"
  },
  "準備する": {
    "kana": "じゅんびする",
    "romaji": "junbisuru"
  },
  "演奏する": {
    "kana": "えんそうする",
    "romaji": "ensou suru"
  },
  "点きます": {
    "kana": "つきます",
    "romaji": "tsukimasu"
  },
  "点呼する": {
    "kana": "てんこする",
    "romaji": "tenko suru"
  },
  "点灯する": {
    "kana": "てんとうする",
    "romaji": "tentou suru"
  },
  "無くなる": {
    "kana": "なくなる",
    "romaji": "nakunaru"
  },
  "無償労働": {
    "kana": "むしょうろうどう",
    "romaji": "mushou roudou"
  },
  "蒸し暑い": {
    "kana": "むしあつい",
    "romaji": "mushiatsui"
  },
  "熟練職人": {
    "kana": "じゅくれんしょくにん",
    "romaji": "jukuren shokunin"
  },
  "片付ける": {
    "kana": "かたづける",
    "romaji": "katazukeru"
  },
  "特急列車": {
    "kana": "とっきゅうれっしゃ",
    "romaji": "tokkyuuressha"
  },
  "牽引する": {
    "kana": "けんいんする",
    "romaji": "kenin suru"
  },
  "独自路線": {
    "kana": "どくじろせん",
    "romaji": "dokujirosen"
  },
  "現代医療": {
    "kana": "げんだいいりょう",
    "romaji": "gendai iryou"
  },
  "環境汚染": {
    "kana": "かんきょうおせん",
    "romaji": "kankyouosen"
  },
  "甚だしい": {
    "kana": "はなはだしい",
    "romaji": "hanahadashii"
  },
  "生まれる": {
    "kana": "うまれる",
    "romaji": "umareru"
  },
  "生命倫理": {
    "kana": "せいめいりんり",
    "romaji": "seimei rinri"
  },
  "生徒会長": {
    "kana": "せいとかいちょう",
    "romaji": "seitokaichou"
  },
  "生態学的": {
    "kana": "せいたいがくてき",
    "romaji": "seitaigaku teki"
  },
  "生殖細胞": {
    "kana": "せいしょくさいぼう",
    "romaji": "seishoku saibou"
  },
  "生活実感": {
    "kana": "せいかつじっかん",
    "romaji": "seikatsu jikkan"
  },
  "生活条件": {
    "kana": "せいかつじょうけん",
    "romaji": "seikatsu jouken"
  },
  "生産する": {
    "kana": "せいさんする",
    "romaji": "seisan suru"
  },
  "生産停止": {
    "kana": "せいさんていし",
    "romaji": "seisan teishi"
  },
  "用意する": {
    "kana": "よういする",
    "romaji": "youisuru"
  },
  "田中さん": {
    "kana": "たなかさん",
    "romaji": "Tanaka-san"
  },
  "申し込む": {
    "kana": "もうしこむ",
    "romaji": "moushikomu"
  },
  "申請する": {
    "kana": "しんせいする",
    "romaji": "shinsei suru"
  },
  "申請手続": {
    "kana": "しんせいてつづき",
    "romaji": "shinsei tetsuzuki"
  },
  "申請書類": {
    "kana": "しんせいしょるい",
    "romaji": "shinseishorui"
  },
  "申請要項": {
    "kana": "しんせいようこう",
    "romaji": "shinsei youkou"
  },
  "申込用紙": {
    "kana": "もうしこみようし",
    "romaji": "moushikomi youshi"
  },
  "男子学生": {
    "kana": "だんしがくせい",
    "romaji": "danshi gakusei"
  },
  "異分野間": {
    "kana": "いぶんやかん",
    "romaji": "i bunya kan"
  },
  "発展する": {
    "kana": "はってんする",
    "romaji": "hatten suru"
  },
  "発明する": {
    "kana": "はつめいする",
    "romaji": "hatsumei suru"
  },
  "発生する": {
    "kana": "はっせいする",
    "romaji": "hassei suru"
  },
  "発生時刻": {
    "kana": "はっせいじこく",
    "romaji": "hasseiji koku"
  },
  "発表する": {
    "kana": "はっぴょうする",
    "romaji": "happyou suru"
  },
  "発見する": {
    "kana": "はっけんする",
    "romaji": "hakkensuru"
  },
  "発話表現": {
    "kana": "はつわひょうげん",
    "romaji": "hatsuwa hyougen"
  },
  "発車する": {
    "kana": "はっしゃする",
    "romaji": "hassha suru"
  },
  "発酵食品": {
    "kana": "はっこうしょくひん",
    "romaji": "hakkou shokuhin"
  },
  "発電設備": {
    "kana": "はつでんせつび",
    "romaji": "hatsudensetsubi"
  },
  "登録する": {
    "kana": "とうろくする",
    "romaji": "touroku suru"
  },
  "登録上限": {
    "kana": "とうろくじょうげん",
    "romaji": "touroku jougen"
  },
  "百戦錬磨": {
    "kana": "ひゃくせんれんま",
    "romaji": "hyakusenrenma"
  },
  "監査機関": {
    "kana": "かんさきかん",
    "romaji": "kansa kikan"
  },
  "目覚まし": {
    "kana": "めざまし",
    "romaji": "mezamashi"
  },
  "目覚める": {
    "kana": "めざめる",
    "romaji": "mezameru"
  },
  "直します": {
    "kana": "なおします",
    "romaji": "naoshimasu"
  },
  "直ったら": {
    "kana": "なおったら",
    "romaji": "naottara"
  },
  "直接仕入": {
    "kana": "ちょくせつしいれ",
    "romaji": "chokusetsu shiire"
  },
  "直接建物": {
    "kana": "ちょくせつたてもの",
    "romaji": "chokusetsu tatemono"
  },
  "相乗効果": {
    "kana": "そうじょうこうか",
    "romaji": "soujoukouka"
  },
  "相談する": {
    "kana": "そうだんする",
    "romaji": "soudan suru"
  },
  "真っ直ぐ": {
    "kana": "まっすぐ",
    "romaji": "massugu"
  },
  "着きます": {
    "kana": "つきます",
    "romaji": "tsukimasu"
  },
  "着替える": {
    "kana": "きがえる",
    "romaji": "kigaeru"
  },
  "知らせる": {
    "kana": "しらせる",
    "romaji": "shiraseru"
  },
  "知らない": {
    "kana": "しらない",
    "romaji": "shiranai"
  },
  "知られて": {
    "kana": "しられて",
    "romaji": "shirarete"
  },
  "知りたい": {
    "kana": "しりたい",
    "romaji": "shiritai"
  },
  "知ります": {
    "kana": "しります",
    "romaji": "shirimasu"
  },
  "知り合う": {
    "kana": "しりあう",
    "romaji": "shiriau"
  },
  "短縮する": {
    "kana": "たんしゅくする",
    "romaji": "tanshuku suru"
  },
  "研修手当": {
    "kana": "けんしゅうてあて",
    "romaji": "kenshuuteate"
  },
  "研究倫理": {
    "kana": "けんきゅうりんり",
    "romaji": "kenkyuu rinri"
  },
  "研究時間": {
    "kana": "けんきゅうじかん",
    "romaji": "kenkyuu jikan"
  },
  "研究機関": {
    "kana": "けんきゅうきかん",
    "romaji": "kenkyuukikan"
  },
  "研究開発": {
    "kana": "けんきゅうかいはつ",
    "romaji": "kenkyuukaihatsu"
  },
  "硫化水素": {
    "kana": "りゅうかすいそ",
    "romaji": "ryuuka suiso"
  },
  "確認する": {
    "kana": "かくにんする",
    "romaji": "kakuninsuru"
  },
  "社会保障": {
    "kana": "しゃかいほしょう",
    "romaji": "shakaihoshou"
  },
  "社会全体": {
    "kana": "しゃかいぜんたい",
    "romaji": "shakaizentai"
  },
  "社会基盤": {
    "kana": "しゃかいきばん",
    "romaji": "shakai kiban"
  },
  "社会課題": {
    "kana": "しゃかいかだい",
    "romaji": "shakai kadai"
  },
  "社会調査": {
    "kana": "しゃかいちょうさ",
    "romaji": "shakai chousa"
  },
  "社会通念": {
    "kana": "しゃかいつうねん",
    "romaji": "shakaitsuunen"
  },
  "社内出身": {
    "kana": "しゃないしゅっしん",
    "romaji": "shanai shusshin"
  },
  "社員食堂": {
    "kana": "しゃいんしょくどう",
    "romaji": "shainshokudou"
  },
  "禁止事項": {
    "kana": "きんしじこう",
    "romaji": "kinshijikou"
  },
  "福祉団体": {
    "kana": "ふくしだんたい",
    "romaji": "fukushidantai"
  },
  "科学技術": {
    "kana": "かがくぎじゅつ",
    "romaji": "kagakugijutsu"
  },
  "科学研究": {
    "kana": "かがくけんきゅう",
    "romaji": "kagakukenkyuu"
  },
  "秘密保持": {
    "kana": "ひみつほじ",
    "romaji": "himitsu hoji"
  },
  "移動する": {
    "kana": "いどうする",
    "romaji": "idou suru"
  },
  "税込表記": {
    "kana": "ぜいこみひょうき",
    "romaji": "zeikomi hyouki"
  },
  "空調効率": {
    "kana": "くうちょうこうりつ",
    "romaji": "kuuchou kouritsu"
  },
  "空間認知": {
    "kana": "くうかんにんち",
    "romaji": "kuukan ninchi"
  },
  "突然大雨": {
    "kana": "とつぜんおおあめ",
    "romaji": "totsuzen ooame"
  },
  "立たない": {
    "kana": "たたない",
    "romaji": "tatanai"
  },
  "立ちます": {
    "kana": "たちます",
    "romaji": "tachimasu"
  },
  "競争環境": {
    "kana": "きょうそうかんきょう",
    "romaji": "kyousou kankyou"
  },
  "競合他社": {
    "kana": "きょうごうたしゃ",
    "romaji": "kyougoutasha"
  },
  "笑います": {
    "kana": "わらいます",
    "romaji": "waraimasu"
  },
  "第2開発": {
    "kana": "だいにかいはつ",
    "romaji": "daini kaihatsu"
  },
  "第一志望": {
    "kana": "だいいちしぼう",
    "romaji": "daiichi shibou"
  },
  "等価交換": {
    "kana": "とうかこうかん",
    "romaji": "toukakoukan"
  },
  "答えます": {
    "kana": "こたえます",
    "romaji": "kotaemasu"
  },
  "節水する": {
    "kana": "せっすいする",
    "romaji": "sessui suru"
  },
  "節約する": {
    "kana": "せつやくする",
    "romaji": "setsuyaku suru"
  },
  "管理する": {
    "kana": "かんりする",
    "romaji": "kanri suru"
  },
  "精査する": {
    "kana": "せいさする",
    "romaji": "seisa suru"
  },
  "系統安定": {
    "kana": "けいとうあんてい",
    "romaji": "keitou antei"
  },
  "約束する": {
    "kana": "やくそくする",
    "romaji": "yakusoku suru"
  },
  "紹介する": {
    "kana": "しょうかいする",
    "romaji": "shoukai suru"
  },
  "終了する": {
    "kana": "しゅうりょうする",
    "romaji": "shuuryou suru"
  },
  "終日予定": {
    "kana": "しゅうじつよてい",
    "romaji": "shuujitsu yotei"
  },
  "終身雇用": {
    "kana": "しゅうしんこよう",
    "romaji": "shuushinkoyou"
  },
  "組み込む": {
    "kana": "くみこむ",
    "romaji": "kumikomu"
  },
  "組織慣行": {
    "kana": "そしきかんこう",
    "romaji": "soshiki kankou"
  },
  "組織改革": {
    "kana": "そしきかいかく",
    "romaji": "soshiki kaikaku"
  },
  "組織文化": {
    "kana": "そしきぶんか",
    "romaji": "soshiki bunka"
  },
  "経営判断": {
    "kana": "けいえいはんだん",
    "romaji": "keiei handan"
  },
  "経営戦略": {
    "kana": "けいえいせんりゃく",
    "romaji": "keiei senryaku"
  },
  "経営統合": {
    "kana": "けいえいとうごう",
    "romaji": "keiei tougou"
  },
  "経済学者": {
    "kana": "けいざいがくしゃ",
    "romaji": "keizaigakusha"
  },
  "経済成長": {
    "kana": "けいざいせいちょう",
    "romaji": "keizaiseichou"
  },
  "経済理論": {
    "kana": "けいざいりろん",
    "romaji": "keizai riron"
  },
  "経済規模": {
    "kana": "けいざいきぼ",
    "romaji": "keizaikibo"
  },
  "経済評価": {
    "kana": "けいざいひょうか",
    "romaji": "keizai hyouka"
  },
  "経験する": {
    "kana": "けいけんする",
    "romaji": "keiken suru"
  },
  "経験不足": {
    "kana": "けいけんぶそく",
    "romaji": "keikenbusoku"
  },
  "経験豊富": {
    "kana": "けいけんほうふ",
    "romaji": "keikenhoufu"
  },
  "結婚する": {
    "kana": "けっこんする",
    "romaji": "kekkon suru"
  },
  "結論部分": {
    "kana": "けつろんぶぶん",
    "romaji": "ketsuron bubun"
  },
  "統計指標": {
    "kana": "とうけいしひょう",
    "romaji": "toukei shihyou"
  },
  "統計解析": {
    "kana": "とうけいかいせき",
    "romaji": "toukeikaiseki"
  },
  "絵を描く": {
    "kana": "えをかく",
    "romaji": "e o kaku"
  },
  "絶対内緒": {
    "kana": "ぜったいないしょ",
    "romaji": "zettai naisho"
  },
  "緊張する": {
    "kana": "きんちょうする",
    "romaji": "kinchou suru"
  },
  "緊張関係": {
    "kana": "きんちょうかんけい",
    "romaji": "kinchoukankei"
  },
  "緊急事態": {
    "kana": "きんきゅうじたい",
    "romaji": "kinkyuujitai"
  },
  "緊急連絡": {
    "kana": "きんきゅうれんらく",
    "romaji": "kinkyuu renraku"
  },
  "編集委員": {
    "kana": "へんしゅういいん",
    "romaji": "henshuu iin"
  },
  "編集技術": {
    "kana": "へんしゅうぎじゅつ",
    "romaji": "henshuu gijutsu"
  },
  "練り直す": {
    "kana": "ねりなおす",
    "romaji": "nerinaosu"
  },
  "練習する": {
    "kana": "れんしゅうする",
    "romaji": "renshuusuru"
  },
  "置きます": {
    "kana": "おきます",
    "romaji": "okimasu"
  },
  "署名する": {
    "kana": "しょめいする",
    "romaji": "shomei suru"
  },
  "美味しい": {
    "kana": "おいしい",
    "romaji": "oishii"
  },
  "習います": {
    "kana": "ならいます",
    "romaji": "naraimasu"
  },
  "翻訳する": {
    "kana": "ほんやくする",
    "romaji": "hon'yaku suru"
  },
  "老舗旅館": {
    "kana": "しにせりょかん",
    "romaji": "shinise ryokan"
  },
  "考えます": {
    "kana": "かんがえます",
    "romaji": "kangaemasu"
  },
  "考古遺物": {
    "kana": "こうこいぶつ",
    "romaji": "kouko ibutsu"
  },
  "聞きます": {
    "kana": "ききます",
    "romaji": "kikimasu"
  },
  "聞き取る": {
    "kana": "ききとる",
    "romaji": "kikitoru"
  },
  "聞こえる": {
    "kana": "きこえる",
    "romaji": "kikoeru"
  },
  "職場全体": {
    "kana": "しょくばぜんたい",
    "romaji": "shokuba zentai"
  },
  "育たない": {
    "kana": "そだたない",
    "romaji": "sodatanai"
  },
  "背が低い": {
    "kana": "せがひくい",
    "romaji": "segahikui"
  },
  "背が高い": {
    "kana": "せがたかい",
    "romaji": "segatakai"
  },
  "能力強化": {
    "kana": "のうりょくきょうか",
    "romaji": "nouryoku kyouka"
  },
  "脱ぎます": {
    "kana": "ぬぎます",
    "romaji": "nugimasu"
  },
  "脱炭素化": {
    "kana": "だったんもとか",
    "romaji": "dattan moto ka"
  },
  "臓器提供": {
    "kana": "ぞうきていきょう",
    "romaji": "zouki teikyou"
  },
  "臨床応用": {
    "kana": "りんしょうおうよう",
    "romaji": "rinshou ouyou"
  },
  "自動運転": {
    "kana": "じどううんてん",
    "romaji": "jidouunten"
  },
  "自己中心": {
    "kana": "じこちゅうしん",
    "romaji": "jiko chuushin"
  },
  "自己責任": {
    "kana": "じこせきにん",
    "romaji": "jikosekinin"
  },
  "自殺する": {
    "kana": "じさつする",
    "romaji": "jisatsu suru"
  },
  "自然科学": {
    "kana": "しぜんかがく",
    "romaji": "shizenkagaku"
  },
  "自然資源": {
    "kana": "しぜんしげん",
    "romaji": "shizen shigen"
  },
  "自然電力": {
    "kana": "しぜんでんりょく",
    "romaji": "shizen denryoku"
  },
  "興味する": {
    "kana": "きょうみする",
    "romaji": "kyoumi suru"
  },
  "良かった": {
    "kana": "よかった",
    "romaji": "yokatta"
  },
  "苦労する": {
    "kana": "くろうする",
    "romaji": "kurou suru"
  },
  "融資審査": {
    "kana": "ゆうししんさ",
    "romaji": "yuushi shinsa"
  },
  "行います": {
    "kana": "おこないます",
    "romaji": "okonaimasu"
  },
  "行きます": {
    "kana": "いきます",
    "romaji": "ikimasu"
  },
  "行われる": {
    "kana": "おこなわれる",
    "romaji": "okonawareru"
  },
  "行動する": {
    "kana": "こうどうする",
    "romaji": "koudou suru"
  },
  "行動変容": {
    "kana": "こうどうへんよう",
    "romaji": "koudou henyou"
  },
  "行政手続": {
    "kana": "ぎょうせいてつづき",
    "romaji": "gyousei tetsuzuki"
  },
  "街区全体": {
    "kana": "がいくぜんたい",
    "romaji": "gaiku zentai"
  },
  "表現形式": {
    "kana": "ひょうげんけいしき",
    "romaji": "hyougenkeishiki"
  },
  "表示する": {
    "kana": "ひょうじする",
    "romaji": "hyouji suru"
  },
  "表面温度": {
    "kana": "ひょうめんおんど",
    "romaji": "hyoumen'ondo"
  },
  "補完する": {
    "kana": "ほかんする",
    "romaji": "hokan suru"
  },
  "製品設計": {
    "kana": "せいひんせっけい",
    "romaji": "seihin sekkei"
  },
  "製薬企業": {
    "kana": "せいやくきぎょう",
    "romaji": "seiyaku kigyou"
  },
  "製造業者": {
    "kana": "せいぞうぎょうしゃ",
    "romaji": "seizougyousha"
  },
  "製造現場": {
    "kana": "せいぞうげんば",
    "romaji": "seizou genba"
  },
  "複合素材": {
    "kana": "ふくごうそざい",
    "romaji": "fukugou sozai"
  },
  "複数選任": {
    "kana": "ふくすうせんにん",
    "romaji": "fukusuu sennin"
  },
  "複数領域": {
    "kana": "ふくすうりょういき",
    "romaji": "fukusuu ryouiki"
  },
  "要ります": {
    "kana": "いります",
    "romaji": "irimasu"
  },
  "要約動画": {
    "kana": "ようやくどうが",
    "romaji": "youyaku douga"
  },
  "要配慮者": {
    "kana": "ようはいりょもの",
    "romaji": "you hairyo mono"
  },
  "見えます": {
    "kana": "みえます",
    "romaji": "miemasu"
  },
  "見せます": {
    "kana": "みせます",
    "romaji": "misemasu"
  },
  "見つかる": {
    "kana": "みつかる",
    "romaji": "mitsukaru"
  },
  "見つける": {
    "kana": "みつける",
    "romaji": "mitsukeru"
  },
  "見てみる": {
    "kana": "みてみる",
    "romaji": "mite miru"
  },
  "見て回る": {
    "kana": "みてまわる",
    "romaji": "mite mawaru"
  },
  "見やすい": {
    "kana": "みやすい",
    "romaji": "miyasui"
  },
  "見られて": {
    "kana": "みられて",
    "romaji": "mirarete"
  },
  "見据える": {
    "kana": "みすえる",
    "romaji": "misueru"
  },
  "見舞する": {
    "kana": "みまいする",
    "romaji": "mimai suru"
  },
  "規約改定": {
    "kana": "きやくかいてい",
    "romaji": "kiyaku kaitei"
  },
  "覚えます": {
    "kana": "おぼえます",
    "romaji": "oboemasu"
  },
  "観光誘致": {
    "kana": "かんこうゆうち",
    "romaji": "kankou yuuchi"
  },
  "解説動画": {
    "kana": "かいせつどうが",
    "romaji": "kaisetsu douga"
  },
  "解説論文": {
    "kana": "かいせつろんぶん",
    "romaji": "kaisetsu ronbun"
  },
  "触ります": {
    "kana": "さわります",
    "romaji": "sawarimasu"
  },
  "言いたい": {
    "kana": "いいたい",
    "romaji": "iitai"
  },
  "言います": {
    "kana": "いいます",
    "romaji": "iimasu"
  },
  "言語習慣": {
    "kana": "げんごしゅうかん",
    "romaji": "gengo shuukan"
  },
  "言語表現": {
    "kana": "げんごひょうげん",
    "romaji": "gengohyougen"
  },
  "言語道断": {
    "kana": "ごんごどうだん",
    "romaji": "gongodoudan"
  },
  "計画する": {
    "kana": "けいかくする",
    "romaji": "keikaku suru"
  },
  "計算する": {
    "kana": "けいさんする",
    "romaji": "keisan suru"
  },
  "計算結果": {
    "kana": "けいさんけっか",
    "romaji": "keisankekka"
  },
  "記入する": {
    "kana": "きにゅうする",
    "romaji": "kinyuu suru"
  },
  "記念式典": {
    "kana": "きねんしきてん",
    "romaji": "kinenshikiten"
  },
  "記録映像": {
    "kana": "きろくえいぞう",
    "romaji": "kiroku eizou"
  },
  "設備投資": {
    "kana": "せつびとうし",
    "romaji": "setsubi toushi"
  },
  "設定する": {
    "kana": "せっていする",
    "romaji": "setteisuru"
  },
  "設置費用": {
    "kana": "せっちひよう",
    "romaji": "setchi hiyou"
  },
  "設計手法": {
    "kana": "せっけいしゅほう",
    "romaji": "sekkeishuhou"
  },
  "設計段階": {
    "kana": "せっけいだんかい",
    "romaji": "sekkeidankai"
  },
  "許可する": {
    "kana": "きょかする",
    "romaji": "kyoka suru"
  },
  "訴えたい": {
    "kana": "うったえたい",
    "romaji": "uttaetai"
  },
  "証拠書類": {
    "kana": "しょうこしょるい",
    "romaji": "shouko shorui"
  },
  "評価制度": {
    "kana": "ひょうかせいど",
    "romaji": "hyouka seido"
  },
  "試着する": {
    "kana": "しちゃくする",
    "romaji": "shichaku suru"
  },
  "試行錯誤": {
    "kana": "しこうさくご",
    "romaji": "shikousakugo"
  },
  "試験導入": {
    "kana": "しけんどうにゅう",
    "romaji": "shiken dounyuu"
  },
  "話します": {
    "kana": "はなします",
    "romaji": "hanashimasu"
  },
  "話者自身": {
    "kana": "わしゃじしん",
    "romaji": "washa jishin"
  },
  "誘拐する": {
    "kana": "ゆうかいする",
    "romaji": "yuukai suru"
  },
  "語彙体系": {
    "kana": "ごいたいけい",
    "romaji": "goi taikei"
  },
  "説明する": {
    "kana": "せつめいする",
    "romaji": "setsumeisuru"
  },
  "説明責任": {
    "kana": "せつめいせきにん",
    "romaji": "setsumei sekinin"
  },
  "読ました": {
    "kana": "よみました",
    "romaji": "yomimashita"
  },
  "読みます": {
    "kana": "よみます",
    "romaji": "yomimasu"
  },
  "課題理解": {
    "kana": "かだいりかい",
    "romaji": "kadai rikai"
  },
  "調べます": {
    "kana": "しらべます",
    "romaji": "shirabemasu"
  },
  "調整する": {
    "kana": "ちょうせいする",
    "romaji": "chouseisuru"
  },
  "調査機材": {
    "kana": "ちょうさきざい",
    "romaji": "chousa kizai"
  },
  "調理する": {
    "kana": "ちょうりする",
    "romaji": "chouri suru"
  },
  "請求する": {
    "kana": "せいきゅうする",
    "romaji": "seikyuu suru"
  },
  "論文草稿": {
    "kana": "ろんぶんそうこう",
    "romaji": "ronbun soukou"
  },
  "警戒する": {
    "kana": "けいかいする",
    "romaji": "keikai suru"
  },
  "豪雨浸水": {
    "kana": "ごううしんすい",
    "romaji": "gouu shinsui"
  },
  "負荷試験": {
    "kana": "ふかしけん",
    "romaji": "fuka shiken"
  },
  "財務体質": {
    "kana": "ざいむたいしつ",
    "romaji": "zaimu taishitsu"
  },
  "財務指標": {
    "kana": "ざいむしひょう",
    "romaji": "zaimu shihyou"
  },
  "貢献する": {
    "kana": "こうけんする",
    "romaji": "kouken suru"
  },
  "販売する": {
    "kana": "はんばいする",
    "romaji": "hanbai suru"
  },
  "販売部数": {
    "kana": "はんばいぶかず",
    "romaji": "hanbaibu kazu"
  },
  "貯金する": {
    "kana": "ちょきんする",
    "romaji": "chokin suru"
  },
  "貴社益々": {
    "kana": "きしゃますます",
    "romaji": "kisha masumasu"
  },
  "買います": {
    "kana": "かいます",
    "romaji": "kaimasu"
  },
  "貸します": {
    "kana": "かします",
    "romaji": "kashimasu"
  },
  "貸出期間": {
    "kana": "かしだしきかん",
    "romaji": "kashidashi kikan"
  },
  "費用分担": {
    "kana": "ひようぶんたん",
    "romaji": "hiyou buntan"
  },
  "資格試験": {
    "kana": "しかくしけん",
    "romaji": "shikaku shiken"
  },
  "資源循環": {
    "kana": "しげんじゅんかん",
    "romaji": "shigen junkan"
  },
  "賑やかな": {
    "kana": "にぎやかな",
    "romaji": "nigiyakana"
  },
  "賞味期限": {
    "kana": "しょうみきげん",
    "romaji": "shoumikigen"
  },
  "質問する": {
    "kana": "しつもんする",
    "romaji": "shitsumonsuru"
  },
  "購入する": {
    "kana": "こうにゅうする",
    "romaji": "kounyuu suru"
  },
  "赤ちゃん": {
    "kana": "あかちゃん",
    "romaji": "akachan"
  },
  "起きます": {
    "kana": "おきます",
    "romaji": "okimasu"
  },
  "身を守る": {
    "kana": "みをまもる",
    "romaji": "mi o mamoru"
  },
  "輪になる": {
    "kana": "わになる",
    "romaji": "wa ni naru"
  },
  "辛うじて": {
    "kana": "かろうじて",
    "romaji": "karoujite"
  },
  "巡回展示": {
    "kana": "じゅんかいてんじ",
    "romaji": "junkai tenji"
  },
  "返します": {
    "kana": "かえします",
    "romaji": "kaeshimasu"
  },
  "返還議論": {
    "kana": "へんかんぎろん",
    "romaji": "henkan giron"
  },
  "追われて": {
    "kana": "おわれて",
    "romaji": "owarete"
  },
  "追加調査": {
    "kana": "ついかちょうさ",
    "romaji": "tsuika chousa"
  },
  "追認機関": {
    "kana": "ついにんきかん",
    "romaji": "tsuinin kikan"
  },
  "送ります": {
    "kana": "おくります",
    "romaji": "okurimasu"
  },
  "途中経過": {
    "kana": "とちゅうけいか",
    "romaji": "tochuukeika"
  },
  "通信保安": {
    "kana": "つうしんほあん",
    "romaji": "tsuushin hoan"
  },
  "通勤時間": {
    "kana": "つうきんじかん",
    "romaji": "tsuukinjikan"
  },
  "通訳する": {
    "kana": "つうやくする",
    "romaji": "tsuuyaku suru"
  },
  "通話する": {
    "kana": "つうわする",
    "romaji": "tsuuwa suru"
  },
  "速やかに": {
    "kana": "すみやかに",
    "romaji": "sumiyaka ni"
  },
  "速報端末": {
    "kana": "そくほうたんまつ",
    "romaji": "sokuhou tanmatsu"
  },
  "連絡する": {
    "kana": "れんらくする",
    "romaji": "renraku suru"
  },
  "進みます": {
    "kana": "すすみます",
    "romaji": "susumimasu"
  },
  "進めたい": {
    "kana": "すすめたい",
    "romaji": "susumetai"
  },
  "進学する": {
    "kana": "しんがくする",
    "romaji": "shingaku suru"
  },
  "遅刻する": {
    "kana": "ちこくする",
    "romaji": "chikoku suru"
  },
  "遊びます": {
    "kana": "あそびます",
    "romaji": "asobimasu"
  },
  "運動する": {
    "kana": "うんどうする",
    "romaji": "undou suru"
  },
  "運転する": {
    "kana": "うんてんする",
    "romaji": "untensuru"
  },
  "道に迷う": {
    "kana": "みちにまよう",
    "romaji": "michi ni mayou"
  },
  "道路工事": {
    "kana": "どうろこうじ",
    "romaji": "dourokouji"
  },
  "違反する": {
    "kana": "いはんする",
    "romaji": "ihan suru"
  },
  "遠慮する": {
    "kana": "えんりょする",
    "romaji": "enryo suru"
  },
  "選別経験": {
    "kana": "せんべつけいけん",
    "romaji": "senbetsu keiken"
  },
  "避難する": {
    "kana": "ひなんする",
    "romaji": "hinan suru"
  },
  "避難経路": {
    "kana": "ひなんけいろ",
    "romaji": "hinan keiro"
  },
  "都市内部": {
    "kana": "としないぶ",
    "romaji": "toshinai bu"
  },
  "都市政策": {
    "kana": "としせいさく",
    "romaji": "toshi seisaku"
  },
  "都市環境": {
    "kana": "としかんきょう",
    "romaji": "toshikankyou"
  },
  "都市計画": {
    "kana": "としけいかく",
    "romaji": "toshikeikaku"
  },
  "配置転換": {
    "kana": "はいちてんかん",
    "romaji": "haichitenkan"
  },
  "配送拠点": {
    "kana": "はいそうきょてん",
    "romaji": "haisou kyoten"
  },
  "酔っ払う": {
    "kana": "よっぱらう",
    "romaji": "yopparau"
  },
  "酸っぱい": {
    "kana": "すっぱい",
    "romaji": "suppai"
  },
  "重要物資": {
    "kana": "じゅうようぶっし",
    "romaji": "juuyou busshi"
  },
  "量子暗号": {
    "kana": "りょうしあんごう",
    "romaji": "ryoushi angou"
  },
  "録り直す": {
    "kana": "とりなおす",
    "romaji": "torinaosu"
  },
  "長年手塩": {
    "kana": "ながねんてしお",
    "romaji": "naganen teshio"
  },
  "閉めます": {
    "kana": "しめます",
    "romaji": "shimemasu"
  },
  "閉店時間": {
    "kana": "へいてんじかん",
    "romaji": "heitenji kan"
  },
  "閉館時間": {
    "kana": "へいかんじかん",
    "romaji": "heikan jikan"
  },
  "開けます": {
    "kana": "あけます",
    "romaji": "akemasu"
  },
  "開催する": {
    "kana": "かいさいする",
    "romaji": "kaisai suru"
  },
  "開始する": {
    "kana": "かいしする",
    "romaji": "kaishi suru"
  },
  "開設準備": {
    "kana": "かいせつじゅんび",
    "romaji": "kaisetsu junbi"
  },
  "開館時間": {
    "kana": "かいかんじかん",
    "romaji": "kaikan jikan"
  },
  "間に合う": {
    "kana": "まにあう",
    "romaji": "maniau"
  },
  "間違える": {
    "kana": "まちがえる",
    "romaji": "machigaeru"
  },
  "間違って": {
    "kana": "まちがって",
    "romaji": "machigatte"
  },
  "関連する": {
    "kana": "かんれんする",
    "romaji": "kanren suru"
  },
  "防災対策": {
    "kana": "ぼうさいたいさく",
    "romaji": "bousai taisaku"
  },
  "防災計画": {
    "kana": "ぼうさいけいかく",
    "romaji": "bousai keikaku"
  },
  "阻害する": {
    "kana": "そがいする",
    "romaji": "sogai suru"
  },
  "降ります": {
    "kana": "おります",
    "romaji": "orimasu"
  },
  "集中する": {
    "kana": "しゅうちゅうする",
    "romaji": "shuuchuu suru"
  },
  "集合する": {
    "kana": "しゅうごうする",
    "romaji": "shuugou suru"
  },
  "雇用喪失": {
    "kana": "こようそうしつ",
    "romaji": "koyou soushitsu"
  },
  "雇用慣行": {
    "kana": "こようかんこう",
    "romaji": "koyou kankou"
  },
  "電子書籍": {
    "kana": "でんししょせき",
    "romaji": "denshi shoseki"
  },
  "電子機器": {
    "kana": "でんしきき",
    "romaji": "denshikiki"
  },
  "電話対応": {
    "kana": "でんわたいおう",
    "romaji": "denwa taiou"
  },
  "電話番号": {
    "kana": "でんわばんごう",
    "romaji": "denwabangou"
  },
  "非西洋圏": {
    "kana": "ひせいようけん",
    "romaji": "hi seiyou ken"
  },
  "面接最中": {
    "kana": "めんせつさいちゅう",
    "romaji": "mensetsu saichuu"
  },
  "面接日程": {
    "kana": "めんせつびほど",
    "romaji": "mensetsubi hodo"
  },
  "面接次第": {
    "kana": "めんせつしだい",
    "romaji": "mensetsu shidai"
  },
  "頂上付近": {
    "kana": "ちょうじょうふきん",
    "romaji": "choujoufukin"
  },
  "頑張って": {
    "kana": "がんばって",
    "romaji": "ganbatte"
  },
  "願います": {
    "kana": "ねがいます",
    "romaji": "negaimasu"
  },
  "食べます": {
    "kana": "たべます",
    "romaji": "tabemasu"
  },
  "食事する": {
    "kana": "しょくじする",
    "romaji": "shokujisuru"
  },
  "食品会社": {
    "kana": "しょくひんかいしゃ",
    "romaji": "shokuhin kaisha"
  },
  "食物連鎖": {
    "kana": "しょくもつれんさ",
    "romaji": "shokumotsurensa"
  },
  "飲みます": {
    "kana": "のみます",
    "romaji": "nomimasu"
  },
  "駄目です": {
    "kana": "だめです",
    "romaji": "dame desu"
  },
  "駅前広場": {
    "kana": "えきまえひろば",
    "romaji": "ekimaehiroba"
  },
  "骨を折る": {
    "kana": "ほねをおる",
    "romaji": "hone o oru"
  },
  "高すぎる": {
    "kana": "たかすぎる",
    "romaji": "takasugiru"
  },
  "高等教育": {
    "kana": "こうとうきょういく",
    "romaji": "koutoukyouiku"
  },
  "10人": {
    "kana": "じゅうにん",
    "romaji": "juunin"
  },
  "10個": {
    "kana": "じゅっこ",
    "romaji": "jukko"
  },
  "10冊": {
    "kana": "じゅっさつ",
    "romaji": "jussatsu"
  },
  "10分": {
    "kana": "じゅっぷん",
    "romaji": "juppun"
  },
  "10匹": {
    "kana": "じゅっぴき",
    "romaji": "juppiki"
  },
  "10回": {
    "kana": "じゅっかい",
    "romaji": "jukkai"
  },
  "10年": {
    "kana": "じゅうねん",
    "romaji": "juunen"
  },
  "10才": {
    "kana": "じゅっさい",
    "romaji": "jussai"
  },
  "10日": {
    "kana": "とおか",
    "romaji": "tooka"
  },
  "10時": {
    "kana": "じゅうじ",
    "romaji": "juuji"
  },
  "10月": {
    "kana": "じゅうがつ",
    "romaji": "juugatsu"
  },
  "10本": {
    "kana": "じゅっぽん",
    "romaji": "juppon"
  },
  "10歳": {
    "kana": "じゅっさい",
    "romaji": "jussai"
  },
  "10階": {
    "kana": "じゅっかい",
    "romaji": "jukkai"
  },
  "11時": {
    "kana": "じゅういちじ",
    "romaji": "juuichiji"
  },
  "11月": {
    "kana": "じゅういちがつ",
    "romaji": "juuichigatsu"
  },
  "12時": {
    "kana": "じゅうにじ",
    "romaji": "juuniji"
  },
  "12月": {
    "kana": "じゅうにがつ",
    "romaji": "juunigatsu"
  },
  "14日": {
    "kana": "じゅうよっか",
    "romaji": "juuyokka"
  },
  "14時": {
    "kana": "じゅうよじ",
    "romaji": "juuyoji"
  },
  "15分": {
    "kana": "じゅうごふん",
    "romaji": "juugofun"
  },
  "15部": {
    "kana": "じゅうごぶ",
    "romaji": "juugobu"
  },
  "1か月": {
    "kana": "いっかげつ",
    "romaji": "ikkagetsu"
  },
  "1ヶ月": {
    "kana": "いっかげつ",
    "romaji": "ikkagetsu"
  },
  "1拠点": {
    "kana": "いっきょてん",
    "romaji": "ikkyoten"
  },
  "1時半": {
    "kana": "いちじはん",
    "romaji": "ichijihan"
  },
  "1時間": {
    "kana": "いちじかん",
    "romaji": "ichijikan"
  },
  "1週間": {
    "kana": "いっしゅうかん",
    "romaji": "isshuukan"
  },
  "20分": {
    "kana": "にじゅっぷん",
    "romaji": "nijuppun"
  },
  "20才": {
    "kana": "はたち",
    "romaji": "hatachi"
  },
  "20日": {
    "kana": "はつか",
    "romaji": "hatsuka"
  },
  "20歳": {
    "kana": "はたち",
    "romaji": "hatachi"
  },
  "20部": {
    "kana": "にじゅうぶ",
    "romaji": "nijuubu"
  },
  "24日": {
    "kana": "にじゅうよっか",
    "romaji": "nijuuyokka"
  },
  "2か月": {
    "kana": "にかげつ",
    "romaji": "nikagetsu"
  },
  "2ヶ月": {
    "kana": "にかげつ",
    "romaji": "nikagetsu"
  },
  "2時半": {
    "kana": "にじはん",
    "romaji": "nijihan"
  },
  "2時間": {
    "kana": "にじかん",
    "romaji": "nijikan"
  },
  "2週間": {
    "kana": "にしゅうかん",
    "romaji": "nishuukan"
  },
  "30分": {
    "kana": "さんじゅっぷん",
    "romaji": "sanjuppun"
  },
  "3か月": {
    "kana": "さんかげつ",
    "romaji": "sankagetsu"
  },
  "3ヶ月": {
    "kana": "さんかげつ",
    "romaji": "sankagetsu"
  },
  "3拠点": {
    "kana": "さんきょてん",
    "romaji": "sankyoten"
  },
  "3時半": {
    "kana": "さんじはん",
    "romaji": "sanjihan"
  },
  "3時間": {
    "kana": "さんじかん",
    "romaji": "sanjikan"
  },
  "3週間": {
    "kana": "さんしゅうかん",
    "romaji": "sanshuukan"
  },
  "45分": {
    "kana": "よんじゅうごふん",
    "romaji": "yonjuugofun"
  },
  "4か月": {
    "kana": "よんかげつ",
    "romaji": "yonkagetsu"
  },
  "4ヶ月": {
    "kana": "よんかげつ",
    "romaji": "yonkagetsu"
  },
  "4時半": {
    "kana": "よじはん",
    "romaji": "yojihan"
  },
  "4時間": {
    "kana": "よじかん",
    "romaji": "yojikan"
  },
  "4週間": {
    "kana": "よんしゅうかん",
    "romaji": "yonshuukan"
  },
  "5か月": {
    "kana": "ごかげつ",
    "romaji": "gokagetsu"
  },
  "5ヶ月": {
    "kana": "ごかげつ",
    "romaji": "gokagetsu"
  },
  "5分前": {
    "kana": "ごふんまえ",
    "romaji": "gofun mae"
  },
  "5時半": {
    "kana": "ごじはん",
    "romaji": "gojihan"
  },
  "5時間": {
    "kana": "ごじかん",
    "romaji": "gojikan"
  },
  "5週間": {
    "kana": "ごしゅうかん",
    "romaji": "goshuukan"
  },
  "6か月": {
    "kana": "ろっかげつ",
    "romaji": "rokkagetsu"
  },
  "6ヶ月": {
    "kana": "ろっかげつ",
    "romaji": "rokkagetsu"
  },
  "6時半": {
    "kana": "ろくじはん",
    "romaji": "rokujihan"
  },
  "6時間": {
    "kana": "ろくじかん",
    "romaji": "rokujikan"
  },
  "6週間": {
    "kana": "ろくしゅうかん",
    "romaji": "rokushuukan"
  },
  "7か月": {
    "kana": "ななかげつ",
    "romaji": "nanakagetsu"
  },
  "7ヶ月": {
    "kana": "ななかげつ",
    "romaji": "nanakagetsu"
  },
  "7時半": {
    "kana": "しちじはん",
    "romaji": "shichijihan"
  },
  "7時間": {
    "kana": "しちじかん",
    "romaji": "shichijikan"
  },
  "7週間": {
    "kana": "ななしゅうかん",
    "romaji": "nanashuukan"
  },
  "8か月": {
    "kana": "はっかげつ",
    "romaji": "hakkagetsu"
  },
  "8ヶ月": {
    "kana": "はっかげつ",
    "romaji": "hakkagetsu"
  },
  "8時半": {
    "kana": "はちじはん",
    "romaji": "hachijihan"
  },
  "8時間": {
    "kana": "はちじかん",
    "romaji": "hachijikan"
  },
  "8週間": {
    "kana": "はっしゅうかん",
    "romaji": "hasshuukan"
  },
  "9か月": {
    "kana": "きゅうかげつ",
    "romaji": "kyuukagetsu"
  },
  "9ヶ月": {
    "kana": "きゅうかげつ",
    "romaji": "kyuukagetsu"
  },
  "9時半": {
    "kana": "くじはん",
    "romaji": "kujihan"
  },
  "9時間": {
    "kana": "くじかん",
    "romaji": "kujikan"
  },
  "9週間": {
    "kana": "きゅうしゅうかん",
    "romaji": "kyuushuukan"
  },
  "あいつ": {
    "kana": "あいつ",
    "romaji": "aitsu"
  },
  "あける": {
    "kana": "あける",
    "romaji": "akeru"
  },
  "あげる": {
    "kana": "あげる",
    "romaji": "ageru"
  },
  "アジア": {
    "kana": "アジア",
    "romaji": "azia"
  },
  "あした": {
    "kana": "あした",
    "romaji": "ashita"
  },
  "あそこ": {
    "kana": "あそこ",
    "romaji": "asoko"
  },
  "あちら": {
    "kana": "あちら",
    "romaji": "achira"
  },
  "あっち": {
    "kana": "あっち",
    "romaji": "acchi"
  },
  "あなた": {
    "kana": "あなた",
    "romaji": "anata"
  },
  "あまり": {
    "kana": "あまり",
    "romaji": "amari"
  },
  "いいえ": {
    "kana": "いいえ",
    "romaji": "iie"
  },
  "いかが": {
    "kana": "いかが",
    "romaji": "ikaga"
  },
  "いつも": {
    "kana": "いつも",
    "romaji": "itsumo"
  },
  "います": {
    "kana": "います",
    "romaji": "imasu"
  },
  "イラン": {
    "kana": "イラン",
    "romaji": "iran"
  },
  "インド": {
    "kana": "インド",
    "romaji": "indo"
  },
  "うつす": {
    "kana": "うつす",
    "romaji": "utsusu"
  },
  "お世話": {
    "kana": "おせわ",
    "romaji": "o-sewa"
  },
  "お仕事": {
    "kana": "おしごと",
    "romaji": "o-shigoto"
  },
  "お伺い": {
    "kana": "おうかがい",
    "romaji": "oukagai"
  },
  "お刺身": {
    "kana": "おさしみ",
    "romaji": "o-sashimi"
  },
  "お喋り": {
    "kana": "おしゃべり",
    "romaji": "o-shaberi"
  },
  "お土産": {
    "kana": "おみやげ",
    "romaji": "omiyage"
  },
  "お客様": {
    "kana": "おきゃくさま",
    "romaji": "okyakusama"
  },
  "お手元": {
    "kana": "おてもと",
    "romaji": "otemoto"
  },
  "お持ち": {
    "kana": "おもち",
    "romaji": "omochi"
  },
  "お断り": {
    "kana": "おことわり",
    "romaji": "okotowari"
  },
  "お疲れ": {
    "kana": "おつかれ",
    "romaji": "otsukare"
  },
  "お菓子": {
    "kana": "おかし",
    "romaji": "okashi"
  },
  "お話し": {
    "kana": "おはなし",
    "romaji": "o-hanashi"
  },
  "お返事": {
    "kana": "おへんじ",
    "romaji": "o-henji"
  },
  "お釣り": {
    "kana": "おつり",
    "romaji": "otsuri"
  },
  "お願い": {
    "kana": "おねがい",
    "romaji": "onegai"
  },
  "カード": {
    "kana": "カード",
    "romaji": "kaado"
  },
  "かかる": {
    "kana": "かかる",
    "romaji": "kakaru"
  },
  "かける": {
    "kana": "かける",
    "romaji": "kakeru"
  },
  "かぶる": {
    "kana": "かぶる",
    "romaji": "kaburu"
  },
  "カメラ": {
    "kana": "カメラ",
    "romaji": "kamera"
  },
  "がめん": {
    "kana": "がめん",
    "romaji": "gamen"
  },
  "カラー": {
    "kana": "カラー",
    "romaji": "karaa"
  },
  "ガラス": {
    "kana": "ガラス",
    "romaji": "garasu"
  },
  "ギター": {
    "kana": "ギター",
    "romaji": "gitaa"
  },
  "きっと": {
    "kana": "きっと",
    "romaji": "kitto"
  },
  "きのう": {
    "kana": "きのう",
    "romaji": "kinou"
  },
  "きます": {
    "kana": "きます",
    "romaji": "kimasu"
  },
  "きょう": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "きれい": {
    "kana": "きれい",
    "romaji": "kirei"
  },
  "クラス": {
    "kana": "クラス",
    "romaji": "kurasu"
  },
  "グラス": {
    "kana": "グラス",
    "romaji": "gurasu"
  },
  "クラブ": {
    "kana": "クラブ",
    "romaji": "gurabu"
  },
  "グラム": {
    "kana": "グラム",
    "romaji": "guramu"
  },
  "くれる": {
    "kana": "くれる",
    "romaji": "kureru"
  },
  "ケーキ": {
    "kana": "ケーキ",
    "romaji": "keeki"
  },
  "ケース": {
    "kana": "ケース",
    "romaji": "keesu"
  },
  "ゲーム": {
    "kana": "ゲーム",
    "romaji": "geemu"
  },
  "コート": {
    "kana": "コート",
    "romaji": "kooto"
  },
  "コード": {
    "kana": "コード",
    "romaji": "koodo"
  },
  "コーラ": {
    "kana": "コーラ",
    "romaji": "koora"
  },
  "こいつ": {
    "kana": "こいつ",
    "romaji": "koitsu"
  },
  "コイン": {
    "kana": "コイン",
    "romaji": "koin"
  },
  "こちら": {
    "kana": "こちら",
    "romaji": "kochira"
  },
  "こっち": {
    "kana": "こっち",
    "romaji": "kotchi"
  },
  "コップ": {
    "kana": "コップ",
    "romaji": "koppu"
  },
  "ごはん": {
    "kana": "ごはん",
    "romaji": "gohan"
  },
  "コピー": {
    "kana": "コピー",
    "romaji": "kopii"
  },
  "ごみ箱": {
    "kana": "ごみばこ",
    "romaji": "gomibako"
  },
  "コンロ": {
    "kana": "コンロ",
    "romaji": "konro"
  },
  "ご依頼": {
    "kana": "ごいらい",
    "romaji": "goirai"
  },
  "ご参照": {
    "kana": "ごさんしょう",
    "romaji": "gosanshou"
  },
  "ご存じ": {
    "kana": "ごぞんじ",
    "romaji": "gozonji"
  },
  "ご希望": {
    "kana": "ごきぼう",
    "romaji": "gokibou"
  },
  "ご提供": {
    "kana": "ごていきょう",
    "romaji": "goteikyou"
  },
  "ご提案": {
    "kana": "ごていあん",
    "romaji": "goteian"
  },
  "ご提言": {
    "kana": "ごていげん",
    "romaji": "goteigen"
  },
  "ご期待": {
    "kana": "ごきたい",
    "romaji": "gokitai"
  },
  "ご示唆": {
    "kana": "ごしさ",
    "romaji": "goshisa"
  },
  "ご謙遜": {
    "kana": "ごけんそん",
    "romaji": "gokenson"
  },
  "ご都合": {
    "kana": "ごつごう",
    "romaji": "gotsugou"
  },
  "サイズ": {
    "kana": "サイズ",
    "romaji": "saizu"
  },
  "サイン": {
    "kana": "サイン",
    "romaji": "sain"
  },
  "サラダ": {
    "kana": "サラダ",
    "romaji": "sarada"
  },
  "シーツ": {
    "kana": "シーツ",
    "romaji": "shiitsu"
  },
  "しかし": {
    "kana": "しかし",
    "romaji": "shikashi"
  },
  "しかる": {
    "kana": "しかる",
    "romaji": "shikaru"
  },
  "じかん": {
    "kana": "じかん",
    "romaji": "jikan"
  },
  "じゃあ": {
    "kana": "じゃあ",
    "romaji": "jaa"
  },
  "ジャズ": {
    "kana": "ジャズ",
    "romaji": "jyazu"
  },
  "シャツ": {
    "kana": "シャツ",
    "romaji": "shatsu"
  },
  "ジャワ": {
    "kana": "ジャワ",
    "romaji": "jyawa"
  },
  "スープ": {
    "kana": "スープ",
    "romaji": "suupu"
  },
  "すすぐ": {
    "kana": "すすぐ",
    "romaji": "susugu"
  },
  "ずっと": {
    "kana": "ずっと",
    "romaji": "zutto"
  },
  "ズボン": {
    "kana": "ズボン",
    "romaji": "zubon"
  },
  "スマホ": {
    "kana": "すまほ",
    "romaji": "sumaho"
  },
  "ずれる": {
    "kana": "ずれる",
    "romaji": "zureru"
  },
  "スンダ": {
    "kana": "スンダ",
    "romaji": "sunda"
  },
  "セット": {
    "kana": "セット",
    "romaji": "setto"
  },
  "ソース": {
    "kana": "ソース",
    "romaji": "soosu"
  },
  "そいつ": {
    "kana": "そいつ",
    "romaji": "soitsu"
  },
  "そして": {
    "kana": "そして",
    "romaji": "soshite"
  },
  "そちら": {
    "kana": "そちら",
    "romaji": "sochira"
  },
  "ソニー": {
    "kana": "ソニー",
    "romaji": "sonii"
  },
  "ダース": {
    "kana": "ダース",
    "romaji": "daasu"
  },
  "タイヤ": {
    "kana": "タイヤ",
    "romaji": "taiya"
  },
  "タオル": {
    "kana": "タオル",
    "romaji": "taoru"
  },
  "だから": {
    "kana": "だから",
    "romaji": "dakara"
  },
  "タバコ": {
    "kana": "タバコ",
    "romaji": "tabako"
  },
  "たべる": {
    "kana": "たべる",
    "romaji": "taberu"
  },
  "チーズ": {
    "kana": "チーズ",
    "romaji": "chiizu"
  },
  "チーム": {
    "kana": "チーム",
    "romaji": "chiimu"
  },
  "チキン": {
    "kana": "チキン",
    "romaji": "chikin"
  },
  "つくる": {
    "kana": "つくる",
    "romaji": "tsukuru"
  },
  "つける": {
    "kana": "つける",
    "romaji": "tsukeru"
  },
  "テープ": {
    "kana": "テープ",
    "romaji": "teepu"
  },
  "でした": {
    "kana": "でした",
    "romaji": "deshita"
  },
  "テスト": {
    "kana": "テスト",
    "romaji": "tesuto"
  },
  "テニス": {
    "kana": "テニス",
    "romaji": "tenisu"
  },
  "テレビ": {
    "kana": "テレビ",
    "romaji": "terebi"
  },
  "てんき": {
    "kana": "てんき",
    "romaji": "tenki"
  },
  "トイレ": {
    "kana": "トイレ",
    "romaji": "toire"
  },
  "どうぞ": {
    "kana": "どうぞ",
    "romaji": "douzo"
  },
  "どうも": {
    "kana": "どうも",
    "romaji": "doumo"
  },
  "どちら": {
    "kana": "どちら",
    "romaji": "dochira"
  },
  "とても": {
    "kana": "とても",
    "romaji": "totemo"
  },
  "トマト": {
    "kana": "トマト",
    "romaji": "tomato"
  },
  "とれる": {
    "kana": "とれる",
    "romaji": "toreru"
  },
  "どんな": {
    "kana": "どんな",
    "romaji": "donna"
  },
  "ナイフ": {
    "kana": "ナイフ",
    "romaji": "naifu"
  },
  "ノート": {
    "kana": "ノート",
    "romaji": "nootoo"
  },
  "のせる": {
    "kana": "のせる",
    "romaji": "noseru"
  },
  "ノック": {
    "kana": "ノック",
    "romaji": "nokku"
  },
  "バイク": {
    "kana": "バイク",
    "romaji": "baiku"
  },
  "バケツ": {
    "kana": "バケツ",
    "romaji": "baketsu"
  },
  "はずす": {
    "kana": "はずす",
    "romaji": "hazusu"
  },
  "バス停": {
    "kana": "バスてい",
    "romaji": "basutei"
  },
  "バター": {
    "kana": "バター",
    "romaji": "bataa"
  },
  "バナナ": {
    "kana": "バナナ",
    "romaji": "banana"
  },
  "はめる": {
    "kana": "はめる",
    "romaji": "hameru"
  },
  "パンツ": {
    "kana": "パンツ",
    "romaji": "pantsu"
  },
  "パン屋": {
    "kana": "パンや",
    "romaji": "pan-ya"
  },
  "ビーフ": {
    "kana": "ビーフ",
    "romaji": "biifu"
  },
  "ビール": {
    "kana": "ビール",
    "romaji": "biiru"
  },
  "ピアノ": {
    "kana": "ピアノ",
    "romaji": "piano"
  },
  "ビデオ": {
    "kana": "ビデオ",
    "romaji": "bideo"
  },
  "ピンク": {
    "kana": "ピンク",
    "romaji": "pinku"
  },
  "ブラシ": {
    "kana": "ブラシ",
    "romaji": "burasi"
  },
  "ページ": {
    "kana": "ページ",
    "romaji": "peeji"
  },
  "ベッド": {
    "kana": "べっど",
    "romaji": "beddo"
  },
  "ベルト": {
    "kana": "ベルト",
    "romaji": "beruto"
  },
  "ペンキ": {
    "kana": "ペンキ",
    "romaji": "penki"
  },
  "ペンチ": {
    "kana": "ペンチ",
    "romaji": "penchi"
  },
  "ポーク": {
    "kana": "ポーク",
    "romaji": "pooku"
  },
  "ボール": {
    "kana": "ボール",
    "romaji": "booru"
  },
  "ポスト": {
    "kana": "ポスト",
    "romaji": "posuto"
  },
  "ボタン": {
    "kana": "ボタン",
    "romaji": "botan"
  },
  "ポット": {
    "kana": "ポット",
    "romaji": "potto"
  },
  "ホテル": {
    "kana": "ホテル",
    "romaji": "hoteru"
  },
  "ました": {
    "kana": "ました",
    "romaji": "mashita"
  },
  "ません": {
    "kana": "ません",
    "romaji": "masen"
  },
  "マッチ": {
    "kana": "まっち",
    "romaji": "matchi"
  },
  "ミルク": {
    "kana": "ミルク",
    "romaji": "miruku"
  },
  "メール": {
    "kana": "メール",
    "romaji": "meeru"
  },
  "めぐる": {
    "kana": "めぐる",
    "romaji": "meguru"
  },
  "メロン": {
    "kana": "メロン",
    "romaji": "meron"
  },
  "モスク": {
    "kana": "モスク",
    "romaji": "mosuku"
  },
  "もっと": {
    "kana": "もっと",
    "romaji": "motto"
  },
  "ゆがむ": {
    "kana": "ゆがむ",
    "romaji": "yugamu"
  },
  "ゆでる": {
    "kana": "ゆでる",
    "romaji": "yuderu"
  },
  "ラジオ": {
    "kana": "ラジオ",
    "romaji": "rajio"
  },
  "ルピア": {
    "kana": "ルピア",
    "romaji": "rupia"
  },
  "レモン": {
    "kana": "レモン",
    "romaji": "remon"
  },
  "ロック": {
    "kana": "ロック",
    "romaji": "rokku"
  },
  "ワイン": {
    "kana": "ワイン",
    "romaji": "wain"
  },
  "わざと": {
    "kana": "わざと",
    "romaji": "wazato"
  },
  "わたし": {
    "kana": "わたし",
    "romaji": "watashi"
  },
  "一か月": {
    "kana": "いっかげつ",
    "romaji": "ikkagetsu"
  },
  "一ヶ月": {
    "kana": "いっかげつ",
    "romaji": "ikkagetsu"
  },
  "一万円": {
    "kana": "いちまんえん",
    "romaji": "ichiman'en"
  },
  "一人当": {
    "kana": "ひとりあたり",
    "romaji": "hitoriatari"
  },
  "一人暮": {
    "kana": "ひとりぐらし",
    "romaji": "hitorigurashi"
  },
  "一元的": {
    "kana": "いちげんてき",
    "romaji": "ichigenteki"
  },
  "一冊置": {
    "kana": "いっさつち",
    "romaji": "issatsu chi"
  },
  "一切届": {
    "kana": "いっさいとどけ",
    "romaji": "issai todoke"
  },
  "一回作": {
    "kana": "いっかいさく",
    "romaji": "ikkai saku"
  },
  "一度借": {
    "kana": "いちどしゃく",
    "romaji": "ichido shaku"
  },
  "一度失": {
    "kana": "いちどしつ",
    "romaji": "ichido shitsu"
  },
  "一方的": {
    "kana": "いっぽうてき",
    "romaji": "ippouteki"
  },
  "一日中": {
    "kana": "いちにちじゅう",
    "romaji": "ichinichijuu"
  },
  "一昨日": {
    "kana": "おととい",
    "romaji": "ototoi"
  },
  "一時半": {
    "kana": "いちじはん",
    "romaji": "ichijihan"
  },
  "一時的": {
    "kana": "いちじてき",
    "romaji": "ichijiteki"
  },
  "一時間": {
    "kana": "いちじかん",
    "romaji": "ichijikan"
  },
  "一曲歌": {
    "kana": "いっきょくうた",
    "romaji": "ikkyoku uta"
  },
  "一本送": {
    "kana": "いっぽんそう",
    "romaji": "ippon sou"
  },
  "一杯飲": {
    "kana": "いっぱいいん",
    "romaji": "ippai in"
  },
  "一番多": {
    "kana": "いちばんた",
    "romaji": "ichiban ta"
  },
  "一番好": {
    "kana": "いちばんこう",
    "romaji": "ichiban kou"
  },
  "一箇所": {
    "kana": "いっかしょ",
    "romaji": "ikkasho"
  },
  "一般化": {
    "kana": "いっぱんか",
    "romaji": "ippanka"
  },
  "一週間": {
    "kana": "いっしゅうかん",
    "romaji": "isshuukan"
  },
  "七か月": {
    "kana": "ななかげつ",
    "romaji": "nanakagetsu"
  },
  "七ヶ月": {
    "kana": "ななかげつ",
    "romaji": "nanakagetsu"
  },
  "七時半": {
    "kana": "しちじはん",
    "romaji": "shichiji han"
  },
  "七時間": {
    "kana": "しちじかん",
    "romaji": "shichijikan"
  },
  "七週間": {
    "kana": "ななしゅうかん",
    "romaji": "nanashuukan"
  },
  "三か月": {
    "kana": "さんかげつ",
    "romaji": "sankagetsu"
  },
  "三ヶ月": {
    "kana": "さんかげつ",
    "romaji": "sankagetsu"
  },
  "三冊借": {
    "kana": "さんさつしゃく",
    "romaji": "sansatsu shaku"
  },
  "三十分": {
    "kana": "さんじゅうふん",
    "romaji": "sanjuu fun"
  },
  "三十日": {
    "kana": "さんじゅうにち",
    "romaji": "sanjuu nichi"
  },
  "三千円": {
    "kana": "さんぜんえん",
    "romaji": "sanzen'en"
  },
  "三日働": {
    "kana": "みっかどう",
    "romaji": "mikka dou"
  },
  "三日後": {
    "kana": "みっかのち",
    "romaji": "mikka nochi"
  },
  "三時半": {
    "kana": "さんじはん",
    "romaji": "sanjihan"
  },
  "三時間": {
    "kana": "さんじかん",
    "romaji": "sanji kan"
  },
  "三本買": {
    "kana": "さんぼんばい",
    "romaji": "sanbon bai"
  },
  "三週間": {
    "kana": "さんしゅうかん",
    "romaji": "sanshuukan"
  },
  "上がる": {
    "kana": "あがる",
    "romaji": "agaru"
  },
  "上げる": {
    "kana": "あげる",
    "romaji": "ageru"
  },
  "上手な": {
    "kana": "じょうずな",
    "romaji": "jyouzuna"
  },
  "上昇分": {
    "kana": "じょうしょうぶん",
    "romaji": "joushoubun"
  },
  "上限額": {
    "kana": "じょうげんがく",
    "romaji": "jougengaku"
  },
  "下がる": {
    "kana": "さがる",
    "romaji": "sagaru"
  },
  "下げる": {
    "kana": "さげる",
    "romaji": "sageru"
  },
  "下げろ": {
    "kana": "さげろ",
    "romaji": "sagero"
  },
  "下ろす": {
    "kana": "おろす",
    "romaji": "orosu"
  },
  "下ろせ": {
    "kana": "おろせ",
    "romaji": "orose"
  },
  "下手な": {
    "kana": "へたな",
    "romaji": "hetana"
  },
  "不便な": {
    "kana": "ふべんな",
    "romaji": "fubenna"
  },
  "不具合": {
    "kana": "ふぐあい",
    "romaji": "fuguai"
  },
  "不利益": {
    "kana": "ふりえき",
    "romaji": "furieki"
  },
  "不十分": {
    "kana": "ふじゅうぶん",
    "romaji": "fujuubun"
  },
  "不可欠": {
    "kana": "ふかけつ",
    "romaji": "fukaketsu"
  },
  "不可能": {
    "kana": "ふかのう",
    "romaji": "fukanou"
  },
  "不味い": {
    "kana": "まずい",
    "romaji": "mazui"
  },
  "不安定": {
    "kana": "ふあんてい",
    "romaji": "fuantei"
  },
  "不平等": {
    "kana": "ふびょうどう",
    "romaji": "fubyoudou"
  },
  "不思議": {
    "kana": "ふしぎ",
    "romaji": "fushigi"
  },
  "不手際": {
    "kana": "ふてぎわ",
    "romaji": "futegiwa"
  },
  "不採択": {
    "kana": "ふさいたく",
    "romaji": "fusaitaku"
  },
  "不正義": {
    "kana": "ふせいぎ",
    "romaji": "fusei gi"
  },
  "不気味": {
    "kana": "ぶきみ",
    "romaji": "bukimi"
  },
  "不祥事": {
    "kana": "ふしょうじ",
    "romaji": "fushouji"
  },
  "不良品": {
    "kana": "ふりょうひん",
    "romaji": "furyouhin"
  },
  "与える": {
    "kana": "あたえる",
    "romaji": "ataeru"
  },
  "世代間": {
    "kana": "せだいかん",
    "romaji": "sedaikan"
  },
  "世界中": {
    "kana": "せかいじゅう",
    "romaji": "sekaijuu"
  },
  "世界的": {
    "kana": "せかいてき",
    "romaji": "sekaiteki"
  },
  "中国人": {
    "kana": "ちゅうごくじん",
    "romaji": "chuugokujin"
  },
  "中国語": {
    "kana": "ちゅうごくご",
    "romaji": "chuugokugo"
  },
  "中学生": {
    "kana": "ちゅうがくせい",
    "romaji": "chuugakusei"
  },
  "主人公": {
    "kana": "しゅじんこう",
    "romaji": "shujinkou"
  },
  "主観的": {
    "kana": "しゅかんてき",
    "romaji": "shukanteki"
  },
  "乗せる": {
    "kana": "のせる",
    "romaji": "noseru"
  },
  "乗せろ": {
    "kana": "のせろ",
    "romaji": "nosero"
  },
  "乗り場": {
    "kana": "のりば",
    "romaji": "noriba"
  },
  "乗合車": {
    "kana": "のりあいくるま",
    "romaji": "noriai kuruma"
  },
  "乗車率": {
    "kana": "じょうしゃりつ",
    "romaji": "jousharitsu"
  },
  "九か月": {
    "kana": "きゅうかげつ",
    "romaji": "kyuukagetsu"
  },
  "九ヶ月": {
    "kana": "きゅうかげつ",
    "romaji": "kyuukagetsu"
  },
  "九時半": {
    "kana": "くじはん",
    "romaji": "kujihan"
  },
  "九時過": {
    "kana": "くじか",
    "romaji": "kuji ka"
  },
  "九時間": {
    "kana": "くじかん",
    "romaji": "kujikan"
  },
  "九週間": {
    "kana": "きゅうしゅうかん",
    "romaji": "kyuushuukan"
  },
  "予定表": {
    "kana": "よていひょう",
    "romaji": "yotei-hyou"
  },
  "予算難": {
    "kana": "よさんなん",
    "romaji": "yosan nan"
  },
  "事務局": {
    "kana": "じむきょく",
    "romaji": "jimukyoku"
  },
  "事務所": {
    "kana": "じむしょ",
    "romaji": "jimusho"
  },
  "事実上": {
    "kana": "じじつじょう",
    "romaji": "jijitsujou"
  },
  "事後的": {
    "kana": "じごてき",
    "romaji": "jigoteki"
  },
  "事業者": {
    "kana": "じぎょうしゃ",
    "romaji": "jigyousha"
  },
  "二か月": {
    "kana": "にかげつ",
    "romaji": "nikagetsu"
  },
  "二ヶ月": {
    "kana": "にかげつ",
    "romaji": "nikagetsu"
  },
  "二十分": {
    "kana": "にじゅっぷん",
    "romaji": "nijuppun"
  },
  "二十才": {
    "kana": "はたち",
    "romaji": "hatachi"
  },
  "二十日": {
    "kana": "はつか",
    "romaji": "hatsuka"
  },
  "二十歳": {
    "kana": "はたち",
    "romaji": "hatachi"
  },
  "二回乗": {
    "kana": "にかいじょう",
    "romaji": "nikai jou"
  },
  "二時半": {
    "kana": "にじはん",
    "romaji": "nijihan"
  },
  "二時間": {
    "kana": "にじかん",
    "romaji": "nijikan"
  },
  "二週間": {
    "kana": "にしゅうかん",
    "romaji": "nishuukan"
  },
  "五か月": {
    "kana": "ごかげつ",
    "romaji": "gokagetsu"
  },
  "五ヶ月": {
    "kana": "ごかげつ",
    "romaji": "gokagetsu"
  },
  "五代目": {
    "kana": "ごだいめ",
    "romaji": "godai me"
  },
  "五千円": {
    "kana": "ごせんえん",
    "romaji": "gosen'en"
  },
  "五年前": {
    "kana": "ごねんまえ",
    "romaji": "gonen mae"
  },
  "五時半": {
    "kana": "ごじはん",
    "romaji": "gojihan"
  },
  "五時間": {
    "kana": "ごじかん",
    "romaji": "gojikan"
  },
  "五百円": {
    "kana": "ごひゃくえん",
    "romaji": "gohyakuen"
  },
  "五週間": {
    "kana": "ごしゅうかん",
    "romaji": "goshuukan"
  },
  "交差点": {
    "kana": "こうさてん",
    "romaji": "kousaten"
  },
  "交流会": {
    "kana": "こうりゅうかい",
    "romaji": "kouryuukai"
  },
  "交通網": {
    "kana": "こうつうもう",
    "romaji": "koutsuumou"
  },
  "交通量": {
    "kana": "こうつうりょう",
    "romaji": "koutsuuryou"
  },
  "人件費": {
    "kana": "じんけんひ",
    "romaji": "jinkenhi"
  },
  "人参加": {
    "kana": "にんじんか",
    "romaji": "ninjin ka"
  },
  "人同士": {
    "kana": "ひとどうし",
    "romaji": "hitodoushi"
  },
  "人工林": {
    "kana": "じんこうりん",
    "romaji": "jinkourin"
  },
  "今修理": {
    "kana": "いましゅうり",
    "romaji": "ima shuuri"
  },
  "今度会": {
    "kana": "こんどかい",
    "romaji": "kondo kai"
  },
  "今日中": {
    "kana": "きょうじゅう",
    "romaji": "kyoujuu"
  },
  "今週末": {
    "kana": "こんしゅうまつ",
    "romaji": "konshuumatsu"
  },
  "仕事終": {
    "kana": "しごとおわり",
    "romaji": "shigoto owari"
  },
  "仕組み": {
    "kana": "しくみ",
    "romaji": "shikumi"
  },
  "仕舞う": {
    "kana": "しまう",
    "romaji": "shimau"
  },
  "他社様": {
    "kana": "たしゃさま",
    "romaji": "tashasama"
  },
  "他者性": {
    "kana": "たしゃせい",
    "romaji": "tashasei"
  },
  "代々受": {
    "kana": "だいだいじゅ",
    "romaji": "daidai ju"
  },
  "代替品": {
    "kana": "だいたいひん",
    "romaji": "daitaihin"
  },
  "代替案": {
    "kana": "だいたいあん",
    "romaji": "daitaian"
  },
  "代表者": {
    "kana": "だいひょうしゃ",
    "romaji": "daihyousha"
  },
  "仮説通": {
    "kana": "かせつとおり",
    "romaji": "kasetsu toori"
  },
  "仰げば": {
    "kana": "あおげば",
    "romaji": "aogeba"
  },
  "任せる": {
    "kana": "まかせる",
    "romaji": "makaseru"
  },
  "企画書": {
    "kana": "きかくしょ",
    "romaji": "kikakusho"
  },
  "休んだ": {
    "kana": "やすんだ",
    "romaji": "yasunda"
  },
  "休んで": {
    "kana": "やすんで",
    "romaji": "yasunde"
  },
  "会った": {
    "kana": "あった",
    "romaji": "atta"
  },
  "会社員": {
    "kana": "かいしゃいん",
    "romaji": "kaishain"
  },
  "会話文": {
    "kana": "かいわぶん",
    "romaji": "kaiwabun"
  },
  "会議室": {
    "kana": "かいぎしつ",
    "romaji": "kaigishitsu"
  },
  "伝える": {
    "kana": "つたえる",
    "romaji": "tsutaeru"
  },
  "伝統的": {
    "kana": "でんとうてき",
    "romaji": "dentouteki"
  },
  "住宅地": {
    "kana": "じゅうたくち",
    "romaji": "juutakuchi"
  },
  "住宅街": {
    "kana": "じゅうたくがい",
    "romaji": "juutakugai"
  },
  "体細胞": {
    "kana": "たいさいぼう",
    "romaji": "taisaibou"
  },
  "体育館": {
    "kana": "たいいくかん",
    "romaji": "taiikukan"
  },
  "何だと": {
    "kana": "なんだと",
    "romaji": "nan da to"
  },
  "何十冊": {
    "kana": "なんじゅうさつ",
    "romaji": "nanjuu satsu"
  },
  "何千個": {
    "kana": "なんぜんこ",
    "romaji": "nanzen ko"
  },
  "何時間": {
    "kana": "なんじかん",
    "romaji": "nanjikan"
  },
  "何曜日": {
    "kana": "なんようび",
    "romaji": "nanyoubi"
  },
  "作って": {
    "kana": "つくって",
    "romaji": "tsukutte"
  },
  "作ろう": {
    "kana": "つくろう",
    "romaji": "tsukurou"
  },
  "併せて": {
    "kana": "あわせて",
    "romaji": "awasete"
  },
  "使用量": {
    "kana": "しようりょう",
    "romaji": "shiyouryou"
  },
  "例えば": {
    "kana": "たとえば",
    "romaji": "tatoeba"
  },
  "供給網": {
    "kana": "きょうきゅうあみ",
    "romaji": "kyoukyuu ami"
  },
  "価値観": {
    "kana": "かちかん",
    "romaji": "kachikan"
  },
  "便利な": {
    "kana": "べんりな",
    "romaji": "benrina"
  },
  "保存食": {
    "kana": "ほぞんしょく",
    "romaji": "hozonshoku"
  },
  "保育園": {
    "kana": "ほいくえん",
    "romaji": "hoikuen"
  },
  "信じる": {
    "kana": "しんじる",
    "romaji": "shinjiru"
  },
  "信頼性": {
    "kana": "しんらいせい",
    "romaji": "shinraisei"
  },
  "借りる": {
    "kana": "かりる",
    "romaji": "kariru"
  },
  "停める": {
    "kana": "とめる",
    "romaji": "tomeru"
  },
  "傍聴席": {
    "kana": "ぼうちょうせき",
    "romaji": "bouchouseki"
  },
  "傷んで": {
    "kana": "いたんで",
    "romaji": "itande"
  },
  "傷付く": {
    "kana": "きずつく",
    "romaji": "kizutsuku"
  },
  "傾ける": {
    "kana": "かたむける",
    "romaji": "katamukeru"
  },
  "働いて": {
    "kana": "はたらいて",
    "romaji": "hataraite"
  },
  "優しい": {
    "kana": "やさしい",
    "romaji": "yasashii"
  },
  "元気な": {
    "kana": "げんきな",
    "romaji": "genkina"
  },
  "先月引": {
    "kana": "せんげつひき",
    "romaji": "sengetsu hiki"
  },
  "先見性": {
    "kana": "せんけんせい",
    "romaji": "senkensei"
  },
  "先週買": {
    "kana": "せんしゅうばい",
    "romaji": "senshuu bai"
  },
  "光合成": {
    "kana": "こうごうせい",
    "romaji": "kougousei"
  },
  "入れた": {
    "kana": "いれた",
    "romaji": "ireta"
  },
  "入れる": {
    "kana": "いれる",
    "romaji": "ireru"
  },
  "全員宛": {
    "kana": "ぜんいんあて",
    "romaji": "zen'in ate"
  },
  "全然知": {
    "kana": "ぜんぜんち",
    "romaji": "zenzen chi"
  },
  "全然通": {
    "kana": "ぜんぜんとおり",
    "romaji": "zenzen toori"
  },
  "全社員": {
    "kana": "ぜんしゃいん",
    "romaji": "zensha in"
  },
  "全部見": {
    "kana": "ぜんぶけん",
    "romaji": "zenbu ken"
  },
  "全面的": {
    "kana": "ぜんめんてき",
    "romaji": "zenmenteki"
  },
  "八か月": {
    "kana": "はっかげつ",
    "romaji": "hakkagetsu"
  },
  "八ヶ月": {
    "kana": "はっかげつ",
    "romaji": "hakkagetsu"
  },
  "八時半": {
    "kana": "はちじはん",
    "romaji": "hachijihan"
  },
  "八時間": {
    "kana": "はちじかん",
    "romaji": "hachijikan"
  },
  "八百屋": {
    "kana": "やおや",
    "romaji": "yaoya"
  },
  "八週間": {
    "kana": "はっしゅうかん",
    "romaji": "hasshuukan"
  },
  "公共財": {
    "kana": "こうきょうざい",
    "romaji": "koukyouzai"
  },
  "公文書": {
    "kana": "こうぶんしょ",
    "romaji": "koubunsho"
  },
  "公民館": {
    "kana": "こうみんかん",
    "romaji": "kouminkan"
  },
  "公開日": {
    "kana": "こうかいび",
    "romaji": "koukaibi"
  },
  "六か月": {
    "kana": "ろっかげつ",
    "romaji": "rokkagetsu"
  },
  "六ヶ月": {
    "kana": "ろっかげつ",
    "romaji": "rokkagetsu"
  },
  "六十人": {
    "kana": "ろくじゅうにん",
    "romaji": "rokujuu nin"
  },
  "六時半": {
    "kana": "ろくじはん",
    "romaji": "rokujihan"
  },
  "六時間": {
    "kana": "ろくじかん",
    "romaji": "rokujikan"
  },
  "六百語": {
    "kana": "ろっぴゃくご",
    "romaji": "roppyaku go"
  },
  "六週間": {
    "kana": "ろくしゅうかん",
    "romaji": "rokushuukan"
  },
  "共有知": {
    "kana": "きょうゆうち",
    "romaji": "kyouyuu chi"
  },
  "具体的": {
    "kana": "ぐたいてき",
    "romaji": "gutaiteki"
  },
  "内陸側": {
    "kana": "ないりくがわ",
    "romaji": "nairiku gawa"
  },
  "再交渉": {
    "kana": "さいこうしょう",
    "romaji": "sai koushou"
  },
  "再定義": {
    "kana": "さいていぎ",
    "romaji": "saiteigi"
  },
  "再審査": {
    "kana": "さいしんさ",
    "romaji": "saishinsa"
  },
  "再検討": {
    "kana": "さいけんとう",
    "romaji": "saikentou"
  },
  "再構築": {
    "kana": "さいこうちく",
    "romaji": "saikouchiku"
  },
  "再現性": {
    "kana": "さいげんせい",
    "romaji": "saigensei"
  },
  "再集計": {
    "kana": "さいしゅうけい",
    "romaji": "saishuukei"
  },
  "最優先": {
    "kana": "さいゆうせん",
    "romaji": "saiyuusen"
  },
  "最大限": {
    "kana": "さいだいげん",
    "romaji": "saidaigen"
  },
  "最盛期": {
    "kana": "さいせいき",
    "romaji": "saiseiki"
  },
  "最終版": {
    "kana": "さいしゅうばん",
    "romaji": "saishuuban"
  },
  "最終的": {
    "kana": "さいしゅうてき",
    "romaji": "saishuuteki"
  },
  "最適解": {
    "kana": "さいてきかい",
    "romaji": "saitekikai"
  },
  "冷たい": {
    "kana": "つめたい",
    "romaji": "tsumetai"
  },
  "冷やす": {
    "kana": "ひやす",
    "romaji": "hiyasu"
  },
  "冷蔵庫": {
    "kana": "れいぞうこ",
    "romaji": "reizouko"
  },
  "出ます": {
    "kana": "でます",
    "romaji": "demasu"
  },
  "出勤前": {
    "kana": "しゅっきんまえ",
    "romaji": "shukkinmae"
  },
  "出張中": {
    "kana": "しゅっちょうちゅう",
    "romaji": "shutchouchuu"
  },
  "出来る": {
    "kana": "できる",
    "romaji": "dekiru"
  },
  "出発点": {
    "kana": "しゅっぱつてん",
    "romaji": "shuppatsuten"
  },
  "分かる": {
    "kana": "わかる",
    "romaji": "wakaru"
  },
  "分ける": {
    "kana": "わける",
    "romaji": "wakeru"
  },
  "初心者": {
    "kana": "しょしんしゃ",
    "romaji": "shoshinsha"
  },
  "判断力": {
    "kana": "はんだんりょく",
    "romaji": "handanryoku"
  },
  "別れる": {
    "kana": "わかれる",
    "romaji": "wakareru"
  },
  "利便性": {
    "kana": "りべんせい",
    "romaji": "ribensei"
  },
  "利用者": {
    "kana": "りようしゃ",
    "romaji": "riyousha"
  },
  "到底読": {
    "kana": "とうていどく",
    "romaji": "toutei doku"
  },
  "到底通": {
    "kana": "とうていとおり",
    "romaji": "toutei toori"
  },
  "削れば": {
    "kana": "けずれば",
    "romaji": "kezureba"
  },
  "前向き": {
    "kana": "まえむき",
    "romaji": "maemuki"
  },
  "割れた": {
    "kana": "われた",
    "romaji": "wareta"
  },
  "割以上": {
    "kana": "わりいじょう",
    "romaji": "wari ijou"
  },
  "助かる": {
    "kana": "たすかる",
    "romaji": "tasukaru"
  },
  "助ける": {
    "kana": "たすける",
    "romaji": "tasukeru"
  },
  "労働省": {
    "kana": "ろうどうしょう",
    "romaji": "roudoushou"
  },
  "労働者": {
    "kana": "ろうどうしゃ",
    "romaji": "roudousha"
  },
  "効いて": {
    "kana": "きいて",
    "romaji": "kiite"
  },
  "効率性": {
    "kana": "こうりつせい",
    "romaji": "kouritsusei"
  },
  "効率観": {
    "kana": "こうりつかん",
    "romaji": "kouritsu kan"
  },
  "動かす": {
    "kana": "うごかす",
    "romaji": "ugokasu"
  },
  "動植物": {
    "kana": "どうしょくぶつ",
    "romaji": "doushokubutsu"
  },
  "勤める": {
    "kana": "つとめる",
    "romaji": "tsutomeru"
  },
  "勤務日": {
    "kana": "きんむび",
    "romaji": "kinmubi"
  },
  "勧める": {
    "kana": "すすめる",
    "romaji": "susumeru"
  },
  "包括的": {
    "kana": "ほうかつてき",
    "romaji": "houkatsuteki"
  },
  "包摂性": {
    "kana": "ほうせつせい",
    "romaji": "housetsu sei"
  },
  "包装用": {
    "kana": "ほうそうよう",
    "romaji": "housou you"
  },
  "北海道": {
    "kana": "ほっかいどう",
    "romaji": "hokkaidou"
  },
  "医療費": {
    "kana": "いりょうひ",
    "romaji": "iryouhi"
  },
  "十か月": {
    "kana": "じゅっかげつ",
    "romaji": "jukkagetsu"
  },
  "十ヶ月": {
    "kana": "じゅっかげつ",
    "romaji": "jukkagetsu"
  },
  "十一時": {
    "kana": "じゅういちじ",
    "romaji": "juuichiji"
  },
  "十一月": {
    "kana": "じゅういちがつ",
    "romaji": "juuichigatsu"
  },
  "十二時": {
    "kana": "じゅうにとき",
    "romaji": "juuni toki"
  },
  "十二月": {
    "kana": "じゅうにがつ",
    "romaji": "juunigatsu"
  },
  "十五分": {
    "kana": "じゅうごふん",
    "romaji": "juugo fun"
  },
  "十八時": {
    "kana": "じゅうはちとき",
    "romaji": "juuhachi toki"
  },
  "十分間": {
    "kana": "じゅっぷんかん",
    "romaji": "juppunkan"
  },
  "十四日": {
    "kana": "じゅうよっか",
    "romaji": "juuyokka"
  },
  "十年前": {
    "kana": "じゅうねんまえ",
    "romaji": "juunenmae"
  },
  "十時半": {
    "kana": "じゅうじはん",
    "romaji": "juujihan"
  },
  "十時間": {
    "kana": "じゅうじかん",
    "romaji": "juujikan"
  },
  "十週間": {
    "kana": "じゅっしゅうかん",
    "romaji": "jusshuukan"
  },
  "午前中": {
    "kana": "ごぜんちゅう",
    "romaji": "gozenchuu"
  },
  "午後遅": {
    "kana": "ごごち",
    "romaji": "gogo chi"
  },
  "半分近": {
    "kana": "はんぶんきん",
    "romaji": "hanbun kin"
  },
  "半分運": {
    "kana": "はんぶんうん",
    "romaji": "hanbun un"
  },
  "半年前": {
    "kana": "はんとしまえ",
    "romaji": "hantoshimae"
  },
  "半年後": {
    "kana": "はんとしご",
    "romaji": "hantoshigo"
  },
  "半年間": {
    "kana": "はんとしかん",
    "romaji": "hantoshikan"
  },
  "博物館": {
    "kana": "はくぶつかん",
    "romaji": "hakubutsukan"
  },
  "危ない": {
    "kana": "あぶない",
    "romaji": "abunai"
  },
  "去年入": {
    "kana": "きょねんにゅう",
    "romaji": "kyonen nyuu"
  },
  "参加率": {
    "kana": "さんかりつ",
    "romaji": "sankaritsu"
  },
  "参加者": {
    "kana": "さんかしゃ",
    "romaji": "sankasha"
  },
  "友だち": {
    "kana": "ともだち",
    "romaji": "tomodachi"
  },
  "双方向": {
    "kana": "そうほうこう",
    "romaji": "souhoukou"
  },
  "反省文": {
    "kana": "はんせいぶん",
    "romaji": "hansei bun"
  },
  "反論書": {
    "kana": "はんろんしょ",
    "romaji": "hanronsho"
  },
  "収益性": {
    "kana": "しゅうえきせい",
    "romaji": "shuuekisei"
  },
  "収蔵側": {
    "kana": "しゅうぞうがわ",
    "romaji": "shuuzou gawa"
  },
  "収蔵庫": {
    "kana": "しゅうぞうこ",
    "romaji": "shuuzou ko"
  },
  "取りに": {
    "kana": "とりに",
    "romaji": "tori ni"
  },
  "取れる": {
    "kana": "とれる",
    "romaji": "toreru"
  },
  "取引先": {
    "kana": "とりひきさき",
    "romaji": "torihikisaki"
  },
  "受けて": {
    "kana": "うけて",
    "romaji": "ukete"
  },
  "受ける": {
    "kana": "うける",
    "romaji": "ukeru"
  },
  "受精卵": {
    "kana": "じゅせいらん",
    "romaji": "juseiran"
  },
  "受話器": {
    "kana": "じゅわき",
    "romaji": "juwaki"
  },
  "古くて": {
    "kana": "ふるくて",
    "romaji": "furukute"
  },
  "古本屋": {
    "kana": "ふるほんや",
    "romaji": "furuhonya"
  },
  "古民家": {
    "kana": "こみんか",
    "romaji": "kominka"
  },
  "句読点": {
    "kana": "くとうてん",
    "romaji": "kutouten"
  },
  "可能性": {
    "kana": "かのうせい",
    "romaji": "kanousei"
  },
  "司会者": {
    "kana": "しかいしゃ",
    "romaji": "shikaisha"
  },
  "合わせ": {
    "kana": "あわせ",
    "romaji": "awase"
  },
  "合併症": {
    "kana": "がっぺいしょう",
    "romaji": "gappeishou"
  },
  "合理的": {
    "kana": "ごうりてき",
    "romaji": "gouriteki"
  },
  "同意書": {
    "kana": "どういしょ",
    "romaji": "douisho"
  },
  "同質的": {
    "kana": "どうしつてき",
    "romaji": "doushitsu teki"
  },
  "名目上": {
    "kana": "めいもくじょう",
    "romaji": "meimokujou"
  },
  "向かう": {
    "kana": "むかう",
    "romaji": "mukau"
  },
  "向ける": {
    "kana": "むける",
    "romaji": "mukeru"
  },
  "向こう": {
    "kana": "むこう",
    "romaji": "mukou"
  },
  "含めて": {
    "kana": "ふくめて",
    "romaji": "fukumete"
  },
  "吸収源": {
    "kana": "きゅうしゅうげん",
    "romaji": "kyuushuu gen"
  },
  "周波数": {
    "kana": "しゅうはすう",
    "romaji": "shuuhasuu"
  },
  "周縁化": {
    "kana": "しゅうえんか",
    "romaji": "shuuen ka"
  },
  "商店街": {
    "kana": "しょうてんがい",
    "romaji": "shoutengai"
  },
  "商業的": {
    "kana": "しょうぎょうてき",
    "romaji": "shougyouteki"
  },
  "問題化": {
    "kana": "もんだいか",
    "romaji": "mondaika"
  },
  "喋って": {
    "kana": "しゃべって",
    "romaji": "shabette"
  },
  "喫茶店": {
    "kana": "きっさてん",
    "romaji": "kissaten"
  },
  "噴出孔": {
    "kana": "ふんしゅつあな",
    "romaji": "funshutsu ana"
  },
  "四か月": {
    "kana": "よんかげつ",
    "romaji": "yonkagetsu"
  },
  "四ヶ月": {
    "kana": "よんかげつ",
    "romaji": "yonkagetsu"
  },
  "四割減": {
    "kana": "しわりげん",
    "romaji": "shi wari gen"
  },
  "四十二": {
    "kana": "しじゅうに",
    "romaji": "shijuu ni"
  },
  "四十人": {
    "kana": "しじゅうにん",
    "romaji": "shijuu nin"
  },
  "四十分": {
    "kana": "しじゅうふん",
    "romaji": "shijuu fun"
  },
  "四名様": {
    "kana": "しめいさま",
    "romaji": "shi meisama"
  },
  "四時半": {
    "kana": "よじはん",
    "romaji": "yojihan"
  },
  "四時間": {
    "kana": "よじかん",
    "romaji": "yojikan"
  },
  "四週間": {
    "kana": "よんしゅうかん",
    "romaji": "yonshuukan"
  },
  "困窮者": {
    "kana": "こんきゅうもの",
    "romaji": "konkyuu mono"
  },
  "図書室": {
    "kana": "としょしつ",
    "romaji": "toshoshitsu"
  },
  "図書館": {
    "kana": "としょかん",
    "romaji": "toshokan"
  },
  "固める": {
    "kana": "かためる",
    "romaji": "katameru"
  },
  "固定化": {
    "kana": "こていか",
    "romaji": "koteika"
  },
  "国際的": {
    "kana": "こくさいてき",
    "romaji": "kokusaiteki"
  },
  "土下座": {
    "kana": "どげざ",
    "romaji": "dogeza"
  },
  "土壇場": {
    "kana": "どたんば",
    "romaji": "dotanba"
  },
  "土壌中": {
    "kana": "どじょうなか",
    "romaji": "dojou naka"
  },
  "土曜日": {
    "kana": "どようび",
    "romaji": "doyoubi"
  },
  "在庫数": {
    "kana": "ざいこすう",
    "romaji": "zaikosuu"
  },
  "在校生": {
    "kana": "ざいこうなま",
    "romaji": "zaikou nama"
  },
  "地下海": {
    "kana": "ちかうみ",
    "romaji": "chika umi"
  },
  "地下鉄": {
    "kana": "ちかてつ",
    "romaji": "chikatetsu"
  },
  "地図的": {
    "kana": "ちずてき",
    "romaji": "chizuteki"
  },
  "地域間": {
    "kana": "ちいきかん",
    "romaji": "chiikikan"
  },
  "地球上": {
    "kana": "ちきゅうじょう",
    "romaji": "chikyuujou"
  },
  "基づく": {
    "kana": "もとづく",
    "romaji": "motozuku"
  },
  "増えた": {
    "kana": "ふえた",
    "romaji": "fueta"
  },
  "増やす": {
    "kana": "ふやす",
    "romaji": "fuyasu"
  },
  "壊れる": {
    "kana": "こわれる",
    "romaji": "kowareru"
  },
  "変える": {
    "kana": "かえる",
    "romaji": "kaeru"
  },
  "変わる": {
    "kana": "かわる",
    "romaji": "kawaru"
  },
  "外国人": {
    "kana": "がいこくじん",
    "romaji": "gaikokujin"
  },
  "外国語": {
    "kana": "がいこくご",
    "romaji": "gaikokugo"
  },
  "外形的": {
    "kana": "がいけいてき",
    "romaji": "gaikeiteki"
  },
  "外科医": {
    "kana": "げかい",
    "romaji": "gekai"
  },
  "多面的": {
    "kana": "ためんてき",
    "romaji": "tamenteki"
  },
  "夜八時": {
    "kana": "よるはちとき",
    "romaji": "yoru hachi toki"
  },
  "夜行性": {
    "kana": "やこうせい",
    "romaji": "yakousei"
  },
  "大きい": {
    "kana": "おおきい",
    "romaji": "ookii"
  },
  "大丈夫": {
    "kana": "だいじょうぶ",
    "romaji": "daijoubu"
  },
  "大切な": {
    "kana": "たいせつな",
    "romaji": "taisetsuna"
  },
  "大前提": {
    "kana": "だいぜんてい",
    "romaji": "daizentei"
  },
  "大好き": {
    "kana": "だいすき",
    "romaji": "daisuki"
  },
  "大学生": {
    "kana": "だいがくせい",
    "romaji": "daigakusei"
  },
  "大学院": {
    "kana": "だいがくいん",
    "romaji": "daigakuin"
  },
  "大局的": {
    "kana": "たいきょくてき",
    "romaji": "taikyokuteki"
  },
  "大規模": {
    "kana": "だいきぼ",
    "romaji": "daikibo"
  },
  "大都市": {
    "kana": "だいとし",
    "romaji": "daitoshi"
  },
  "天ぷら": {
    "kana": "てんぷら",
    "romaji": "tenpura"
  },
  "太陽光": {
    "kana": "たいようこう",
    "romaji": "taiyoukou"
  },
  "失われ": {
    "kana": "うしなわれ",
    "romaji": "ushinaware"
  },
  "失敗談": {
    "kana": "しっぱいだん",
    "romaji": "shippaidan"
  },
  "契約上": {
    "kana": "けいやくじょう",
    "romaji": "keiyakujou"
  },
  "契約書": {
    "kana": "けいやくしょ",
    "romaji": "keiyakusho"
  },
  "奥さん": {
    "kana": "おくさん",
    "romaji": "okusan"
  },
  "奨学金": {
    "kana": "しょうがくきん",
    "romaji": "shougakukin"
  },
  "女の人": {
    "kana": "おんなのひと",
    "romaji": "onna no hito"
  },
  "女の子": {
    "kana": "おんなのこ",
    "romaji": "onnanoko"
  },
  "好きな": {
    "kana": "すきな",
    "romaji": "sukina"
  },
  "妥当性": {
    "kana": "だとうせい",
    "romaji": "datousei"
  },
  "妹さん": {
    "kana": "いもうとさん",
    "romaji": "imoutosan"
  },
  "始める": {
    "kana": "はじめる",
    "romaji": "hajimeru"
  },
  "委ねる": {
    "kana": "ゆだねる",
    "romaji": "yudaneru"
  },
  "嫌いな": {
    "kana": "きらいな",
    "romaji": "kiraina"
  },
  "嬉しい": {
    "kana": "うれしい",
    "romaji": "ureshii"
  },
  "嬉しく": {
    "kana": "うれしく",
    "romaji": "ureshiku"
  },
  "子ども": {
    "kana": "こども",
    "romaji": "kodomo"
  },
  "子育て": {
    "kana": "こそだて",
    "romaji": "kosodate"
  },
  "孤児院": {
    "kana": "こじいん",
    "romaji": "koji in"
  },
  "学会賞": {
    "kana": "がっかいしょう",
    "romaji": "gakkai shou"
  },
  "学生寮": {
    "kana": "がくせいりょう",
    "romaji": "gakuseiryou"
  },
  "学術的": {
    "kana": "がくじゅつてき",
    "romaji": "gakujutsuteki"
  },
  "学術誌": {
    "kana": "がくじゅつし",
    "romaji": "gakujutsushi"
  },
  "学部生": {
    "kana": "がくぶせい",
    "romaji": "gakubusei"
  },
  "宅配便": {
    "kana": "たくはいびん",
    "romaji": "takuhaibin"
  },
  "安全性": {
    "kana": "あんぜんせい",
    "romaji": "anzensei"
  },
  "安定度": {
    "kana": "あんていど",
    "romaji": "anteido"
  },
  "宗教上": {
    "kana": "しゅうきょうじょう",
    "romaji": "shuukyoujou"
  },
  "定型的": {
    "kana": "ていけいてき",
    "romaji": "teikeiteki"
  },
  "定期券": {
    "kana": "ていきけん",
    "romaji": "teikiken"
  },
  "実効性": {
    "kana": "じっこうせい",
    "romaji": "jikkousei"
  },
  "実務上": {
    "kana": "じつむうえ",
    "romaji": "jitsumu ue"
  },
  "実務家": {
    "kana": "じつむか",
    "romaji": "jitsumuka"
  },
  "実用化": {
    "kana": "じつようか",
    "romaji": "jitsuyouka"
  },
  "実証的": {
    "kana": "じっしょうてき",
    "romaji": "jisshouteki"
  },
  "実質的": {
    "kana": "じっしつてき",
    "romaji": "jisshitsuteki"
  },
  "実践的": {
    "kana": "じっせんてき",
    "romaji": "jissenteki"
  },
  "客観的": {
    "kana": "きゃっかんてき",
    "romaji": "kyakkanteki"
  },
  "宮大工": {
    "kana": "みやだいく",
    "romaji": "miyadaiku"
  },
  "家庭内": {
    "kana": "かていない",
    "romaji": "kateinai"
  },
  "家族観": {
    "kana": "かぞくかん",
    "romaji": "kazoku kan"
  },
  "寂しい": {
    "kana": "さびしい",
    "romaji": "sabishii"
  },
  "寄せる": {
    "kana": "よせる",
    "romaji": "yoseru"
  },
  "富士山": {
    "kana": "ふじさん",
    "romaji": "fujisan"
  },
  "寝ます": {
    "kana": "ねます",
    "romaji": "nemasu"
  },
  "対して": {
    "kana": "たいして",
    "romaji": "taishite"
  },
  "対外的": {
    "kana": "たいがいてき",
    "romaji": "taigaiteki"
  },
  "専門家": {
    "kana": "せんもんか",
    "romaji": "senmonka"
  },
  "専門性": {
    "kana": "せんもんせい",
    "romaji": "senmonsei"
  },
  "専門誌": {
    "kana": "せんもんし",
    "romaji": "senmonshi"
  },
  "将来的": {
    "kana": "しょうらいてき",
    "romaji": "shouraiteki"
  },
  "尊敬語": {
    "kana": "そんけいご",
    "romaji": "sonkeigo"
  },
  "導入前": {
    "kana": "どうにゅうまえ",
    "romaji": "dounyuumae"
  },
  "導入時": {
    "kana": "どうにゅうじ",
    "romaji": "dounyuuji"
  },
  "小さい": {
    "kana": "ちいさい",
    "romaji": "chiisai"
  },
  "小児科": {
    "kana": "しょうにか",
    "romaji": "shounika"
  },
  "小学校": {
    "kana": "しょうがっこう",
    "romaji": "shougakkou"
  },
  "小学生": {
    "kana": "しょうがくせい",
    "romaji": "shougakusei"
  },
  "少ない": {
    "kana": "すくない",
    "romaji": "sukunai"
  },
  "少数者": {
    "kana": "しょうすうしゃ",
    "romaji": "shousuusha"
  },
  "居場所": {
    "kana": "いばしょ",
    "romaji": "ibasho"
  },
  "居心地": {
    "kana": "いごこち",
    "romaji": "igokochi"
  },
  "屏風絵": {
    "kana": "びょうぶえ",
    "romaji": "byoubu e"
  },
  "展示会": {
    "kana": "てんじかい",
    "romaji": "tenjikai"
  },
  "展示室": {
    "kana": "てんじしつ",
    "romaji": "tenjishitsu"
  },
  "山間部": {
    "kana": "さんかんぶ",
    "romaji": "sankanbu"
  },
  "市役所": {
    "kana": "しやくしょ",
    "romaji": "shiyakusho"
  },
  "帰納的": {
    "kana": "きのうてき",
    "romaji": "kinouteki"
  },
  "常態化": {
    "kana": "じょうたいか",
    "romaji": "joutaika"
  },
  "平仮名": {
    "kana": "ひらがな",
    "romaji": "hiragana"
  },
  "平社員": {
    "kana": "ひらしゃいん",
    "romaji": "hirashain"
  },
  "平行線": {
    "kana": "へいこうせん",
    "romaji": "heikousen"
  },
  "年々増": {
    "kana": "ねんねんぞう",
    "romaji": "nennen zou"
  },
  "年々減": {
    "kana": "ねんねんげん",
    "romaji": "nennen gen"
  },
  "年々難": {
    "kana": "ねんねんなん",
    "romaji": "nennen nan"
  },
  "年一回": {
    "kana": "ねんいっかい",
    "romaji": "nen'ikkai"
  },
  "年上の": {
    "kana": "としうえの",
    "romaji": "toshiueno"
  },
  "年代別": {
    "kana": "ねんだいべつ",
    "romaji": "nendaibetsu"
  },
  "年代記": {
    "kana": "ねんだいき",
    "romaji": "nendaiki"
  },
  "幻想的": {
    "kana": "げんそうてき",
    "romaji": "gensouteki"
  },
  "広げる": {
    "kana": "ひろげる",
    "romaji": "hirogeru"
  },
  "広告費": {
    "kana": "こうこくひ",
    "romaji": "koukokuhi"
  },
  "店舗網": {
    "kana": "てんぽあみ",
    "romaji": "tenpo ami"
  },
  "延ばす": {
    "kana": "のばす",
    "romaji": "nobasu"
  },
  "建てる": {
    "kana": "たてる",
    "romaji": "tateru"
  },
  "建物内": {
    "kana": "たてものない",
    "romaji": "tatemononai"
  },
  "弁護人": {
    "kana": "べんごにん",
    "romaji": "bengonin"
  },
  "弁護士": {
    "kana": "べんごし",
    "romaji": "bengoshi"
  },
  "弟さん": {
    "kana": "おとうとさん",
    "romaji": "otoutosan"
  },
  "弟子入": {
    "kana": "でしにゅう",
    "romaji": "deshi nyuu"
  },
  "強靱化": {
    "kana": "きょうじんか",
    "romaji": "kyoujin ka"
  },
  "強靱性": {
    "kana": "きょうじんせい",
    "romaji": "kyoujin sei"
  },
  "形容詞": {
    "kana": "けいようし",
    "romaji": "keiyoushi"
  },
  "形式的": {
    "kana": "けいしきてき",
    "romaji": "keishikiteki"
  },
  "形骸化": {
    "kana": "けいがいか",
    "romaji": "keigaika"
  },
  "役員会": {
    "kana": "やくいんかい",
    "romaji": "yakuinkai"
  },
  "役員室": {
    "kana": "やくいんしつ",
    "romaji": "yakuinshitsu"
  },
  "待って": {
    "kana": "まって",
    "romaji": "matte"
  },
  "待合室": {
    "kana": "まちあいしつ",
    "romaji": "machiaishitsu"
  },
  "後始末": {
    "kana": "あとしまつ",
    "romaji": "atoshimatsu"
  },
  "後継者": {
    "kana": "こうけいしゃ",
    "romaji": "koukeisha"
  },
  "従兄弟": {
    "kana": "いとこ",
    "romaji": "itoko"
  },
  "従属性": {
    "kana": "じゅうぞくせい",
    "romaji": "juuzokusei"
  },
  "御礼申": {
    "kana": "おれいさる",
    "romaji": "orei saru"
  },
  "復元像": {
    "kana": "ふくげんぞう",
    "romaji": "fukugenzou"
  },
  "微気候": {
    "kana": "びきこう",
    "romaji": "bi kikou"
  },
  "微生物": {
    "kana": "びせいぶつ",
    "romaji": "biseibutsu"
  },
  "微粒子": {
    "kana": "びりゅうし",
    "romaji": "biryuushi"
  },
  "微細化": {
    "kana": "びさいか",
    "romaji": "bisaika"
  },
  "心理学": {
    "kana": "しんりがく",
    "romaji": "shinrigaku"
  },
  "忘れる": {
    "kana": "わすれる",
    "romaji": "wasureru"
  },
  "忙しい": {
    "kana": "いそがしい",
    "romaji": "isogashii"
  },
  "思って": {
    "kana": "おもって",
    "romaji": "omette"
  },
  "恣意性": {
    "kana": "しいせい",
    "romaji": "shiisei"
  },
  "恣意的": {
    "kana": "しいてき",
    "romaji": "shiiteki"
  },
  "悪循環": {
    "kana": "あくじゅんかん",
    "romaji": "akujunkan"
  },
  "悲しい": {
    "kana": "かなしい",
    "romaji": "kanashii"
  },
  "想像力": {
    "kana": "そうぞうりょく",
    "romaji": "souzouryoku"
  },
  "想定外": {
    "kana": "そうていがい",
    "romaji": "souteigai"
  },
  "意図的": {
    "kana": "いとてき",
    "romaji": "itoteki"
  },
  "意地悪": {
    "kana": "いじわる",
    "romaji": "ijiwaru"
  },
  "感じる": {
    "kana": "かんじる",
    "romaji": "kanjiru"
  },
  "感情的": {
    "kana": "かんじょうてき",
    "romaji": "kanjouteki"
  },
  "感染症": {
    "kana": "かんせんしょう",
    "romaji": "kansenshou"
  },
  "感謝申": {
    "kana": "かんしゃさる",
    "romaji": "kansha saru"
  },
  "慣れる": {
    "kana": "なれる",
    "romaji": "nareru"
  },
  "懇親会": {
    "kana": "こんしんかい",
    "romaji": "konshinkai"
  },
  "成功例": {
    "kana": "せいこうれい",
    "romaji": "seikourei"
  },
  "所有権": {
    "kana": "しょゆうけん",
    "romaji": "shoyuuken"
  },
  "所用語": {
    "kana": "しょようご",
    "romaji": "shoyou go"
  },
  "手仕事": {
    "kana": "てしごと",
    "romaji": "teshigoto"
  },
  "手伝い": {
    "kana": "てつだい",
    "romaji": "tetsudai"
  },
  "手伝う": {
    "kana": "てつだう",
    "romaji": "tetsudau"
  },
  "手料理": {
    "kana": "てりょうり",
    "romaji": "teryouri"
  },
  "手続き": {
    "kana": "てつづき",
    "romaji": "tetsuzuki"
  },
  "手違い": {
    "kana": "てちがい",
    "romaji": "techigai"
  },
  "技術的": {
    "kana": "ぎじゅつてき",
    "romaji": "gijutsuteki"
  },
  "技術者": {
    "kana": "ぎじゅつしゃ",
    "romaji": "gijutsusha"
  },
  "抑える": {
    "kana": "おさえる",
    "romaji": "osaeru"
  },
  "投げる": {
    "kana": "なげる",
    "romaji": "nageru"
  },
  "投げろ": {
    "kana": "なげろ",
    "romaji": "nagero"
  },
  "抗菌薬": {
    "kana": "こうきんくすり",
    "romaji": "koukin kusuri"
  },
  "折れる": {
    "kana": "おれる",
    "romaji": "oreru"
  },
  "抜本的": {
    "kana": "ばっぽんてき",
    "romaji": "bapponteki"
  },
  "抱いて": {
    "kana": "いだいて",
    "romaji": "idaite"
  },
  "抵抗力": {
    "kana": "ていこうりょく",
    "romaji": "teikouryoku"
  },
  "抽象的": {
    "kana": "ちゅうしょうてき",
    "romaji": "chuushouteki"
  },
  "担当者": {
    "kana": "たんとうしゃ",
    "romaji": "tantousha"
  },
  "拘束力": {
    "kana": "こうそくりょく",
    "romaji": "kousokuryoku"
  },
  "招いて": {
    "kana": "まねいて",
    "romaji": "maneite"
  },
  "招待制": {
    "kana": "しょうたいせい",
    "romaji": "shoutai sei"
  },
  "持久力": {
    "kana": "じきゅうりょく",
    "romaji": "jikyuuryoku"
  },
  "持続的": {
    "kana": "じぞくてき",
    "romaji": "jizokuteki"
  },
  "指導者": {
    "kana": "しどうしゃ",
    "romaji": "shidousha"
  },
  "指揮者": {
    "kana": "しきしゃ",
    "romaji": "shikisha"
  },
  "挨拶申": {
    "kana": "あいさつさる",
    "romaji": "aisatsu saru"
  },
  "捨てる": {
    "kana": "すてる",
    "romaji": "suteru"
  },
  "排他的": {
    "kana": "はいたてき",
    "romaji": "haitateki"
  },
  "掛ける": {
    "kana": "かける",
    "romaji": "kakeru"
  },
  "採算性": {
    "kana": "さいさんせい",
    "romaji": "saisansei"
  },
  "控える": {
    "kana": "ひかえる",
    "romaji": "hikaeru"
  },
  "推薦状": {
    "kana": "すいせんじょう",
    "romaji": "suisenjou"
  },
  "提携校": {
    "kana": "ていけいこう",
    "romaji": "teikeikou"
  },
  "提案書": {
    "kana": "ていあんしょ",
    "romaji": "teiansho"
  },
  "揚げる": {
    "kana": "あげる",
    "romaji": "ageru"
  },
  "揺れる": {
    "kana": "ゆれる",
    "romaji": "yureru"
  },
  "撮影会": {
    "kana": "さつえいかい",
    "romaji": "satsueikai"
  },
  "改札口": {
    "kana": "かいさつぐち",
    "romaji": "kaisatsuguchi"
  },
  "政治家": {
    "kana": "せいじか",
    "romaji": "seijika"
  },
  "教えて": {
    "kana": "おしえて",
    "romaji": "oshiete"
  },
  "教える": {
    "kana": "おしえる",
    "romaji": "oshieru"
  },
  "教科書": {
    "kana": "きょうかしょ",
    "romaji": "kyoukasho"
  },
  "教育者": {
    "kana": "きょういくしゃ",
    "romaji": "kyouikusha"
  },
  "散々悩": {
    "kana": "さんざんのう",
    "romaji": "sanzan nou"
  },
  "散歩道": {
    "kana": "さんぽみち",
    "romaji": "sanpomichi"
  },
  "数える": {
    "kana": "かぞえる",
    "romaji": "kazoeru"
  },
  "数値化": {
    "kana": "すうちか",
    "romaji": "suuchika"
  },
  "数十年": {
    "kana": "すうじゅうねん",
    "romaji": "suujuunen"
  },
  "数年前": {
    "kana": "すうねんまえ",
    "romaji": "suunenmae"
  },
  "数度低": {
    "kana": "すうどてい",
    "romaji": "suudo tei"
  },
  "数時間": {
    "kana": "すうじかん",
    "romaji": "suujikan"
  },
  "整合性": {
    "kana": "せいごうせい",
    "romaji": "seigousei"
  },
  "文化祭": {
    "kana": "ぶんかさい",
    "romaji": "bunkasai"
  },
  "文化財": {
    "kana": "ぶんかざい",
    "romaji": "bunkazai"
  },
  "料理店": {
    "kana": "りょうりてん",
    "romaji": "ryouriten"
  },
  "料理法": {
    "kana": "りょうりほう",
    "romaji": "ryourihou"
  },
  "断片的": {
    "kana": "だんぺんてき",
    "romaji": "danpenteki"
  },
  "新しい": {
    "kana": "あたらしい",
    "romaji": "atarashii"
  },
  "新商品": {
    "kana": "しんしょうひん",
    "romaji": "shinshouhin"
  },
  "新年度": {
    "kana": "しんねんど",
    "romaji": "shinnendo"
  },
  "新幹線": {
    "kana": "しんかんせん",
    "romaji": "shinkansen"
  },
  "新製品": {
    "kana": "しんせいひん",
    "romaji": "shinseihin"
  },
  "新訳版": {
    "kana": "しんやくはん",
    "romaji": "shinyaku han"
  },
  "方向性": {
    "kana": "ほうこうせい",
    "romaji": "houkousei"
  },
  "旅行者": {
    "kana": "りょこうしゃ",
    "romaji": "ryokousha"
  },
  "日以内": {
    "kana": "にちいない",
    "romaji": "nichi inai"
  },
  "日常化": {
    "kana": "にちじょうか",
    "romaji": "nichijou ka"
  },
  "日常的": {
    "kana": "にちじょうてき",
    "romaji": "nichijouteki"
  },
  "日曜日": {
    "kana": "にちようび",
    "romaji": "nichiyoubi"
  },
  "日本人": {
    "kana": "にほんじん",
    "romaji": "nihonjin"
  },
  "日本型": {
    "kana": "にほんがた",
    "romaji": "nihongata"
  },
  "日本語": {
    "kana": "にほんご",
    "romaji": "nihongo"
  },
  "旧両社": {
    "kana": "きゅうりょうしゃ",
    "romaji": "kyuu ryousha"
  },
  "明るい": {
    "kana": "あかるい",
    "romaji": "akarui"
  },
  "明後日": {
    "kana": "あさって",
    "romaji": "asatte"
  },
  "明日持": {
    "kana": "あしたじ",
    "romaji": "ashita ji"
  },
  "易しい": {
    "kana": "やさしい",
    "romaji": "yasashii"
  },
  "昨日届": {
    "kana": "きのうとどけ",
    "romaji": "kinou todoke"
  },
  "昼ご飯": {
    "kana": "ひるごはん",
    "romaji": "hirugohan"
  },
  "時刻表": {
    "kana": "じこくひょう",
    "romaji": "jikokuhyou"
  },
  "時間半": {
    "kana": "じかんはん",
    "romaji": "jikanhan"
  },
  "時間帯": {
    "kana": "じかんたい",
    "romaji": "jikantai"
  },
  "晩ご飯": {
    "kana": "ばんごはん",
    "romaji": "bangohan"
  },
  "晩御飯": {
    "kana": "ばんごはん",
    "romaji": "bangohan"
  },
  "普遍性": {
    "kana": "ふへんせい",
    "romaji": "fuhensei"
  },
  "普遍的": {
    "kana": "ふへんてき",
    "romaji": "fuhenteki"
  },
  "晴れる": {
    "kana": "はれる",
    "romaji": "hareru"
  },
  "暖かい": {
    "kana": "あたたかい",
    "romaji": "atatakai"
  },
  "暗号化": {
    "kana": "あんごうか",
    "romaji": "angouka"
  },
  "暗黙知": {
    "kana": "あんもくち",
    "romaji": "anmoku chi"
  },
  "暫定値": {
    "kana": "ざんていち",
    "romaji": "zanteichi"
  },
  "暮らす": {
    "kana": "くらす",
    "romaji": "kurasu"
  },
  "曲がる": {
    "kana": "まがる",
    "romaji": "magaru"
  },
  "曲げる": {
    "kana": "まげる",
    "romaji": "mageru"
  },
  "更衣室": {
    "kana": "こういしつ",
    "romaji": "kouishitsu"
  },
  "書類集": {
    "kana": "しょるいしゅう",
    "romaji": "shorui shuu"
  },
  "月曜日": {
    "kana": "げつようび",
    "romaji": "getsuyoubi"
  },
  "有効性": {
    "kana": "ゆうこうせい",
    "romaji": "yuukousei"
  },
  "有名な": {
    "kana": "ゆうめいな",
    "romaji": "yuumeina"
  },
  "朝ご飯": {
    "kana": "あさごはん",
    "romaji": "asagohan"
  },
  "朝七時": {
    "kana": "あさしちじ",
    "romaji": "asa shichiji"
  },
  "朝五時": {
    "kana": "あさごじ",
    "romaji": "asa goji"
  },
  "朝六時": {
    "kana": "あさろくとき",
    "romaji": "asa roku toki"
  },
  "期間中": {
    "kana": "きかんちゅう",
    "romaji": "kikanchuu"
  },
  "木曜日": {
    "kana": "もくようび",
    "romaji": "mokuyoubi"
  },
  "本質的": {
    "kana": "ほんしつてき",
    "romaji": "honshitsuteki"
  },
  "村田氏": {
    "kana": "むらたし",
    "romaji": "murata shi"
  },
  "来ます": {
    "kana": "きます",
    "romaji": "kimasu"
  },
  "来場者": {
    "kana": "らいじょうしゃ",
    "romaji": "raijousha"
  },
  "来年度": {
    "kana": "らいねんど",
    "romaji": "rainendo"
  },
  "来次第": {
    "kana": "らいしだい",
    "romaji": "rai shidai"
  },
  "来週末": {
    "kana": "らいしゅうまつ",
    "romaji": "raishuumatsu"
  },
  "来館者": {
    "kana": "らいかんもの",
    "romaji": "raikan mono"
  },
  "東京駅": {
    "kana": "とうきょうえき",
    "romaji": "toukyoueki"
  },
  "架ける": {
    "kana": "かける",
    "romaji": "kakeru"
  },
  "柔軟性": {
    "kana": "じゅうなんせい",
    "romaji": "juunansei"
  },
  "査読者": {
    "kana": "さどくしゃ",
    "romaji": "sadokusha"
  },
  "核心的": {
    "kana": "かくしんてき",
    "romaji": "kakushin teki"
  },
  "根回し": {
    "kana": "ねまわし",
    "romaji": "nemawashi"
  },
  "根本的": {
    "kana": "こんぽんてき",
    "romaji": "konponteki"
  },
  "根源的": {
    "kana": "こんげんてき",
    "romaji": "kongenteki"
  },
  "案内文": {
    "kana": "あんないぶん",
    "romaji": "annaibun"
  },
  "案内板": {
    "kana": "あんないばん",
    "romaji": "annaiban"
  },
  "検察官": {
    "kana": "けんさつかん",
    "romaji": "kensatsukan"
  },
  "楽しい": {
    "kana": "たのしい",
    "romaji": "tanoshii"
  },
  "楽しみ": {
    "kana": "たのしみ",
    "romaji": "tanoshimi"
  },
  "構造的": {
    "kana": "こうぞうてき",
    "romaji": "kouzouteki"
  },
  "標本数": {
    "kana": "ひょうほんすう",
    "romaji": "hyouhonsuu"
  },
  "標準化": {
    "kana": "ひょうじゅんか",
    "romaji": "hyoujunka"
  },
  "権力者": {
    "kana": "けんりょくしゃ",
    "romaji": "kenryokusha"
  },
  "欲しい": {
    "kana": "ほしい",
    "romaji": "hoshii"
  },
  "歓迎会": {
    "kana": "かんげいかい",
    "romaji": "kangeikai"
  },
  "止まる": {
    "kana": "とまる",
    "romaji": "tomaru"
  },
  "止める": {
    "kana": "とめる",
    "romaji": "tomeru"
  },
  "正当化": {
    "kana": "せいとうか",
    "romaji": "seitouka"
  },
  "正当性": {
    "kana": "せいとうせい",
    "romaji": "seitousei"
  },
  "正確に": {
    "kana": "せいかくに",
    "romaji": "seikakuni"
  },
  "正社員": {
    "kana": "せいしゃいん",
    "romaji": "seishain"
  },
  "歴史像": {
    "kana": "れきしぞう",
    "romaji": "rekishi zou"
  },
  "歴史学": {
    "kana": "れきしがく",
    "romaji": "rekishigaku"
  },
  "歴史的": {
    "kana": "れきしてき",
    "romaji": "rekishiteki"
  },
  "残業代": {
    "kana": "ざんぎょうだい",
    "romaji": "zangyoudai"
  },
  "段取り": {
    "kana": "だんどり",
    "romaji": "dandori"
  },
  "段階的": {
    "kana": "だんかいてき",
    "romaji": "dankaiteki"
  },
  "毎年秋": {
    "kana": "まいとしあき",
    "romaji": "maitoshi aki"
  },
  "毎日声": {
    "kana": "まいにちこえ",
    "romaji": "mainichi koe"
  },
  "毎日帰": {
    "kana": "まいにちき",
    "romaji": "mainichi ki"
  },
  "毎日楽": {
    "kana": "まいにちらく",
    "romaji": "mainichi raku"
  },
  "毎日見": {
    "kana": "まいにちけん",
    "romaji": "mainichi ken"
  },
  "毎日誰": {
    "kana": "まいにちだれ",
    "romaji": "mainichi dare"
  },
  "毎晩寝": {
    "kana": "まいばんね",
    "romaji": "maiban ne"
  },
  "毎月少": {
    "kana": "まいつきしょう",
    "romaji": "maitsuki shou"
  },
  "毎月測": {
    "kana": "まいつきそく",
    "romaji": "maitsuki soku"
  },
  "毎月開": {
    "kana": "まいつきかい",
    "romaji": "maitsuki kai"
  },
  "毎朝母": {
    "kana": "まいあさはは",
    "romaji": "maiasa haha"
  },
  "毎週入": {
    "kana": "まいしゅうにゅう",
    "romaji": "maishuu nyuu"
  },
  "比べる": {
    "kana": "くらべる",
    "romaji": "kuraberu"
  },
  "民主的": {
    "kana": "みんしゅてき",
    "romaji": "minshuteki"
  },
  "民事部": {
    "kana": "みんじぶ",
    "romaji": "minji bu"
  },
  "民間人": {
    "kana": "みんかんじん",
    "romaji": "minkanjin"
  },
  "気づく": {
    "kana": "きづく",
    "romaji": "kizuku"
  },
  "気持ち": {
    "kana": "きもち",
    "romaji": "kimochi"
  },
  "気軽に": {
    "kana": "きがるに",
    "romaji": "kigaru ni"
  },
  "水曜日": {
    "kana": "すいようび",
    "romaji": "suiyoubi"
  },
  "水源林": {
    "kana": "すいげんはやし",
    "romaji": "suigen hayashi"
  },
  "求める": {
    "kana": "もとめる",
    "romaji": "motomeru"
  },
  "汚れる": {
    "kana": "よごれる",
    "romaji": "yogoreru"
  },
  "決める": {
    "kana": "きめる",
    "romaji": "kimeru"
  },
  "沿岸部": {
    "kana": "えんがんぶ",
    "romaji": "engan bu"
  },
  "泊まる": {
    "kana": "とまる",
    "romaji": "tomaru"
  },
  "法規制": {
    "kana": "ほうきせい",
    "romaji": "houkisei"
  },
  "法解釈": {
    "kana": "ほうかいしゃく",
    "romaji": "houkaishaku"
  },
  "法適用": {
    "kana": "ほうてきよう",
    "romaji": "hou tekiyou"
  },
  "洗濯機": {
    "kana": "せんたくき",
    "romaji": "sentakuki"
  },
  "洗濯物": {
    "kana": "せんたくもの",
    "romaji": "sentakumono"
  },
  "活かす": {
    "kana": "いかす",
    "romaji": "ikasu"
  },
  "流れる": {
    "kana": "ながれる",
    "romaji": "nagareru"
  },
  "流動性": {
    "kana": "りゅうどうせい",
    "romaji": "ryuudousei"
  },
  "浴びる": {
    "kana": "あびる",
    "romaji": "abiru"
  },
  "消える": {
    "kana": "きえる",
    "romaji": "kieru"
  },
  "消費者": {
    "kana": "しょうひしゃ",
    "romaji": "shouhisha"
  },
  "涼しい": {
    "kana": "すずしい",
    "romaji": "suzushii"
  },
  "深刻化": {
    "kana": "しんこくか",
    "romaji": "shinkokuka"
  },
  "混ぜる": {
    "kana": "まぜる",
    "romaji": "mazeru"
  },
  "添えず": {
    "kana": "そえず",
    "romaji": "soezu"
  },
  "減らす": {
    "kana": "へらす",
    "romaji": "herasu"
  },
  "温める": {
    "kana": "あたためる",
    "romaji": "atatameru"
  },
  "満足度": {
    "kana": "まんぞくど",
    "romaji": "manzokudo"
  },
  "漏れる": {
    "kana": "もれる",
    "romaji": "moreru"
  },
  "演繹的": {
    "kana": "えんえきてき",
    "romaji": "enekiteki"
  },
  "漬ける": {
    "kana": "つける",
    "romaji": "tsukeru"
  },
  "漸進的": {
    "kana": "ぜんしんてき",
    "romaji": "zenshinteki"
  },
  "濡れる": {
    "kana": "ぬれる",
    "romaji": "nureru"
  },
  "火曜日": {
    "kana": "かようび",
    "romaji": "kayoubi"
  },
  "災害時": {
    "kana": "さいがいじ",
    "romaji": "saigaiji"
  },
  "点検中": {
    "kana": "てんけんなか",
    "romaji": "tenken naka"
  },
  "無くす": {
    "kana": "なくす",
    "romaji": "nakusu"
  },
  "無意識": {
    "kana": "むいしき",
    "romaji": "muishiki"
  },
  "無批判": {
    "kana": "むひはん",
    "romaji": "muhihan"
  },
  "無添加": {
    "kana": "むてんか",
    "romaji": "mutenka"
  },
  "無症状": {
    "kana": "むしょうじょう",
    "romaji": "mu shoujou"
  },
  "無自覚": {
    "kana": "むじかく",
    "romaji": "mujikaku"
  },
  "無邪気": {
    "kana": "むじゃき",
    "romaji": "mujaki"
  },
  "焼き肉": {
    "kana": "やきにく",
    "romaji": "yakiniku"
  },
  "焼き魚": {
    "kana": "やきざかな",
    "romaji": "yakizakana"
  },
  "焼き鳥": {
    "kana": "やきとり",
    "romaji": "yakitori"
  },
  "熟練者": {
    "kana": "じゅくれんしゃ",
    "romaji": "jukurensha"
  },
  "燃える": {
    "kana": "もえる",
    "romaji": "moeru"
  },
  "燃料費": {
    "kana": "ねんりょうひ",
    "romaji": "nenryouhi"
  },
  "片仮名": {
    "kana": "カタカナ",
    "romaji": "katakana"
  },
  "独創的": {
    "kana": "どくそうてき",
    "romaji": "dokusouteki"
  },
  "独立性": {
    "kana": "どくりつせい",
    "romaji": "dokuritsusei"
  },
  "現れる": {
    "kana": "あらわれる",
    "romaji": "arawareru"
  },
  "現代文": {
    "kana": "げんだいぶん",
    "romaji": "gendai bun"
  },
  "現実的": {
    "kana": "げんじつてき",
    "romaji": "genjitsuteki"
  },
  "現時点": {
    "kana": "げんじてん",
    "romaji": "genjiten"
  },
  "理想的": {
    "kana": "りそうてき",
    "romaji": "risouteki"
  },
  "理論面": {
    "kana": "りろんめん",
    "romaji": "riron men"
  },
  "生やす": {
    "kana": "はやす",
    "romaji": "hayasu"
  },
  "生命線": {
    "kana": "せいめいせん",
    "romaji": "seimeisen"
  },
  "生徒会": {
    "kana": "せいとかい",
    "romaji": "seitokai"
  },
  "生態系": {
    "kana": "せいたいけい",
    "romaji": "seitaikei"
  },
  "生活費": {
    "kana": "せいかつひ",
    "romaji": "seikatsuhi"
  },
  "生物学": {
    "kana": "せいぶつがく",
    "romaji": "seibutsugaku"
  },
  "生産性": {
    "kana": "せいさんせい",
    "romaji": "seisansei"
  },
  "生産者": {
    "kana": "せいさんしゃ",
    "romaji": "seisansha"
  },
  "申し訳": {
    "kana": "もうしわけ",
    "romaji": "moushiwake"
  },
  "男の人": {
    "kana": "おとこのひと",
    "romaji": "otoko no hito"
  },
  "男の子": {
    "kana": "おとこのこ",
    "romaji": "otokonoko"
  },
  "画一的": {
    "kana": "かくいつてき",
    "romaji": "kakuitsuteki"
  },
  "画期的": {
    "kana": "かっきてき",
    "romaji": "kakkiteki"
  },
  "画面上": {
    "kana": "がめんじょう",
    "romaji": "gamenjou"
  },
  "留学生": {
    "kana": "りゅうがくせい",
    "romaji": "ryuugakusei"
  },
  "疲れた": {
    "kana": "つかれた",
    "romaji": "tsukareta"
  },
  "疲れて": {
    "kana": "つかれて",
    "romaji": "tsukarete"
  },
  "疲労感": {
    "kana": "ひろうかん",
    "romaji": "hiroukan"
  },
  "病害虫": {
    "kana": "びょうがいちゅう",
    "romaji": "byougaichuu"
  },
  "痩せる": {
    "kana": "やせる",
    "romaji": "yaseru"
  },
  "発電量": {
    "kana": "はつでんりょう",
    "romaji": "hatsudenryou"
  },
  "登山口": {
    "kana": "とざんぐち",
    "romaji": "tozanguchi"
  },
  "登山者": {
    "kana": "とざんしゃ",
    "romaji": "tozansha"
  },
  "登山道": {
    "kana": "とざんどう",
    "romaji": "tozandou"
  },
  "百種類": {
    "kana": "ひゃくしゅるい",
    "romaji": "hyaku shurui"
  },
  "皆さん": {
    "kana": "みなさん",
    "romaji": "minasan"
  },
  "目的地": {
    "kana": "もくてきち",
    "romaji": "mokutekichi"
  },
  "目立つ": {
    "kana": "めだつ",
    "romaji": "medatsu"
  },
  "直ちに": {
    "kana": "ただちに",
    "romaji": "tadachi ni"
  },
  "直接迫": {
    "kana": "ちょくせつさこ",
    "romaji": "chokusetsu sako"
  },
  "相対化": {
    "kana": "そうたいか",
    "romaji": "soutaika"
  },
  "相対的": {
    "kana": "そうたいてき",
    "romaji": "soutaiteki"
  },
  "相手方": {
    "kana": "あいてかた",
    "romaji": "aitekata"
  },
  "相次ぎ": {
    "kana": "あいつぎ",
    "romaji": "aitsugi"
  },
  "看護婦": {
    "kana": "かんごふ",
    "romaji": "kangofu"
  },
  "真ん中": {
    "kana": "まんなか",
    "romaji": "mannaka"
  },
  "真面目": {
    "kana": "まじめ",
    "romaji": "majime"
  },
  "着ます": {
    "kana": "きます",
    "romaji": "kimasu"
  },
  "知って": {
    "kana": "しって",
    "romaji": "shitte"
  },
  "知名度": {
    "kana": "ちめいど",
    "romaji": "chimeido"
  },
  "知識層": {
    "kana": "ちしきそう",
    "romaji": "chishikisou"
  },
  "短時間": {
    "kana": "たんじかん",
    "romaji": "tanjikan"
  },
  "短期的": {
    "kana": "たんきてき",
    "romaji": "tankiteki"
  },
  "研修生": {
    "kana": "けんしゅうせい",
    "romaji": "kenshuusei"
  },
  "研究上": {
    "kana": "けんきゅうじょう",
    "romaji": "kenkyuujou"
  },
  "研究班": {
    "kana": "けんきゅうはん",
    "romaji": "kenkyuu han"
  },
  "研究者": {
    "kana": "けんきゅうしゃ",
    "romaji": "kenkyuusha"
  },
  "硬直化": {
    "kana": "こうちょくか",
    "romaji": "kouchokuka"
  },
  "確定値": {
    "kana": "かくていち",
    "romaji": "kakuteichi"
  },
  "社内網": {
    "kana": "しゃないあみ",
    "romaji": "shanai ami"
  },
  "社長様": {
    "kana": "しゃちょうさま",
    "romaji": "shachou sama"
  },
  "祖父母": {
    "kana": "そふぼ",
    "romaji": "sofubo"
  },
  "積もる": {
    "kana": "つもる",
    "romaji": "tsumoru"
  },
  "空いて": {
    "kana": "あいて",
    "romaji": "aite"
  },
  "空洞化": {
    "kana": "くうどうか",
    "romaji": "kuudouka"
  },
  "空間内": {
    "kana": "くうかんない",
    "romaji": "kuukannai"
  },
  "立てろ": {
    "kana": "たてろ",
    "romaji": "tatero"
  },
  "立体的": {
    "kana": "りったいてき",
    "romaji": "rittaiteki"
  },
  "第4章": {
    "kana": "だいよんしょう",
    "romaji": "daiyonshou"
  },
  "第三者": {
    "kana": "だいさんしゃ",
    "romaji": "daisansha"
  },
  "答える": {
    "kana": "こたえる",
    "romaji": "kotaeru"
  },
  "管理職": {
    "kana": "かんりしょく",
    "romaji": "kanrishoku"
  },
  "管理費": {
    "kana": "かんりひ",
    "romaji": "kanrihi"
  },
  "簡単な": {
    "kana": "かんたんな",
    "romaji": "kantanna"
  },
  "紫外線": {
    "kana": "しがいせん",
    "romaji": "shigaisen"
  },
  "細分化": {
    "kana": "さいぶんか",
    "romaji": "saibunka"
  },
  "紹介文": {
    "kana": "しょうかいぶん",
    "romaji": "shoukaibun"
  },
  "終わる": {
    "kana": "おわる",
    "romaji": "owaru"
  },
  "終業後": {
    "kana": "しゅうぎょうのち",
    "romaji": "shuugyou nochi"
  },
  "終止形": {
    "kana": "しゅうしけい",
    "romaji": "shuushikei"
  },
  "経営者": {
    "kana": "けいえいしゃ",
    "romaji": "keieisha"
  },
  "経営陣": {
    "kana": "けいえいじん",
    "romaji": "keieijin"
  },
  "経済的": {
    "kana": "けいざいてき",
    "romaji": "keizaiteki"
  },
  "経験的": {
    "kana": "けいけんてき",
    "romaji": "keikenteki"
  },
  "結婚式": {
    "kana": "けっこんしき",
    "romaji": "kekkonshiki"
  },
  "給付金": {
    "kana": "きゅうふきん",
    "romaji": "kyuufukin"
  },
  "統合後": {
    "kana": "とうごうご",
    "romaji": "tougougo"
  },
  "統廃合": {
    "kana": "とうはいごう",
    "romaji": "touhaigou"
  },
  "絶対的": {
    "kana": "ぜったいてき",
    "romaji": "zettaiteki"
  },
  "絶対視": {
    "kana": "ぜったいし",
    "romaji": "zettaishi"
  },
  "絶望感": {
    "kana": "ぜつぼうかん",
    "romaji": "zetsuboukan"
  },
  "続ける": {
    "kana": "つづける",
    "romaji": "tsuzukeru"
  },
  "綺麗な": {
    "kana": "きれいな",
    "romaji": "kireina"
  },
  "緊急性": {
    "kana": "きんきゅうせい",
    "romaji": "kinkyuusei"
  },
  "編集長": {
    "kana": "へんしゅうちょう",
    "romaji": "henshuuchou"
  },
  "美容院": {
    "kana": "びよういん",
    "romaji": "biyouin"
  },
  "義援金": {
    "kana": "ぎえんきん",
    "romaji": "gienkin"
  },
  "考える": {
    "kana": "かんがえる",
    "romaji": "kangaeru"
  },
  "耐性菌": {
    "kana": "たいせいきん",
    "romaji": "taisei kin"
  },
  "聖職者": {
    "kana": "せいしょくしゃ",
    "romaji": "seishokusha"
  },
  "聞いた": {
    "kana": "きいた",
    "romaji": "kiita"
  },
  "聞いて": {
    "kana": "きいて",
    "romaji": "kiite"
  },
  "聞ける": {
    "kana": "きける",
    "romaji": "kikeru"
  },
  "育てる": {
    "kana": "そだてる",
    "romaji": "sodateru"
  },
  "脆弱性": {
    "kana": "ぜいじゃくせい",
    "romaji": "zeijakusei"
  },
  "腕時計": {
    "kana": "うでどけい",
    "romaji": "udedokei"
  },
  "自動化": {
    "kana": "じどうか",
    "romaji": "jidouka"
  },
  "自動的": {
    "kana": "じどうてき",
    "romaji": "jidouteki"
  },
  "自動車": {
    "kana": "じどうしゃ",
    "romaji": "jidousha"
  },
  "自治体": {
    "kana": "じちたい",
    "romaji": "jichitai"
  },
  "自然林": {
    "kana": "しぜんはやし",
    "romaji": "shizen hayashi"
  },
  "自立性": {
    "kana": "じりつせい",
    "romaji": "jiritsusei"
  },
  "自転車": {
    "kana": "じてんしゃ",
    "romaji": "jitensha"
  },
  "至急便": {
    "kana": "しきゅうびん",
    "romaji": "shikyuubin"
  },
  "舐める": {
    "kana": "なめる",
    "romaji": "nameru"
  },
  "若年層": {
    "kana": "じゃくねんそう",
    "romaji": "jakunensou"
  },
  "茶色い": {
    "kana": "ちゃいろい",
    "romaji": "chairoi"
  },
  "菓子屋": {
    "kana": "かしや",
    "romaji": "kashiya"
  },
  "落ちる": {
    "kana": "おちる",
    "romaji": "ochiru"
  },
  "落とす": {
    "kana": "おとす",
    "romaji": "otosu"
  },
  "葉っぱ": {
    "kana": "はっぱ",
    "romaji": "happa"
  },
  "蓄電池": {
    "kana": "ちくでんち",
    "romaji": "chikudenchi"
  },
  "蓋然性": {
    "kana": "がいぜんせい",
    "romaji": "gaizensei"
  },
  "行って": {
    "kana": "いって",
    "romaji": "itte"
  },
  "街路樹": {
    "kana": "がいろじゅ",
    "romaji": "gairoju"
  },
  "表面的": {
    "kana": "ひょうめんてき",
    "romaji": "hyoumenteki"
  },
  "被災地": {
    "kana": "ひさいち",
    "romaji": "hisaichi"
  },
  "被災者": {
    "kana": "ひさいしゃ",
    "romaji": "hisaisha"
  },
  "裁判官": {
    "kana": "さいばんかん",
    "romaji": "saibankan"
  },
  "裁判所": {
    "kana": "さいばんしょ",
    "romaji": "saibansho"
  },
  "裁判長": {
    "kana": "さいばんちょう",
    "romaji": "saibanchou"
  },
  "裏切る": {
    "kana": "うらぎる",
    "romaji": "uragiru"
  },
  "補助線": {
    "kana": "ほじょせん",
    "romaji": "hojosen"
  },
  "補助金": {
    "kana": "ほじょきん",
    "romaji": "hojokin"
  },
  "製造業": {
    "kana": "せいぞうぎょう",
    "romaji": "seizougyou"
  },
  "複合的": {
    "kana": "ふくごうてき",
    "romaji": "fukugouteki"
  },
  "複数化": {
    "kana": "ふくすうか",
    "romaji": "fukusuu ka"
  },
  "褒める": {
    "kana": "ほめる",
    "romaji": "homeru"
  },
  "見える": {
    "kana": "みえる",
    "romaji": "mieru"
  },
  "見せる": {
    "kana": "みせる",
    "romaji": "miseru"
  },
  "見ます": {
    "kana": "みます",
    "romaji": "mimasu"
  },
  "見られ": {
    "kana": "みられ",
    "romaji": "mirare"
  },
  "見ると": {
    "kana": "みると",
    "romaji": "miru to"
  },
  "見渡す": {
    "kana": "みわたす",
    "romaji": "miwatasu"
  },
  "見直す": {
    "kana": "みなおす",
    "romaji": "minaosu"
  },
  "見積書": {
    "kana": "みつもりしょ",
    "romaji": "mitsumorisho"
  },
  "見逃す": {
    "kana": "みのがす",
    "romaji": "minogasu"
  },
  "見通し": {
    "kana": "みとおし",
    "romaji": "mitooshi"
  },
  "覚える": {
    "kana": "おぼえる",
    "romaji": "oboeru"
  },
  "親切な": {
    "kana": "しんせつな",
    "romaji": "shinsetsuna"
  },
  "観光地": {
    "kana": "かんこうち",
    "romaji": "kankouchi"
  },
  "観光客": {
    "kana": "かんこうきゃく",
    "romaji": "kankoukyaku"
  },
  "観光業": {
    "kana": "かんこうぎょう",
    "romaji": "kankou gyou"
  },
  "観測所": {
    "kana": "かんそくじょ",
    "romaji": "kansokujo"
  },
  "言い訳": {
    "kana": "いいわけ",
    "romaji": "iiwake"
  },
  "言える": {
    "kana": "いえる",
    "romaji": "ieru"
  },
  "言った": {
    "kana": "いった",
    "romaji": "itta"
  },
  "言って": {
    "kana": "いって",
    "romaji": "itte"
  },
  "言葉一": {
    "kana": "ことばいち",
    "romaji": "kotoba ichi"
  },
  "言葉尻": {
    "kana": "ことばじり",
    "romaji": "kotobajiri"
  },
  "計算上": {
    "kana": "けいさんじょう",
    "romaji": "keisanjou"
  },
  "記念日": {
    "kana": "きねんび",
    "romaji": "kinenbi"
  },
  "記録的": {
    "kana": "きろくてき",
    "romaji": "kirokuteki"
  },
  "訪問者": {
    "kana": "ほうもんしゃ",
    "romaji": "houmonsha"
  },
  "証明書": {
    "kana": "しょうめいしょ",
    "romaji": "shoumeisho"
  },
  "証言者": {
    "kana": "しょうげんしゃ",
    "romaji": "shougensha"
  },
  "評価点": {
    "kana": "ひょうかてん",
    "romaji": "hyoukaten"
  },
  "評価軸": {
    "kana": "ひょうかじく",
    "romaji": "hyouka jiku"
  },
  "詰まる": {
    "kana": "つまる",
    "romaji": "tsumaru"
  },
  "話した": {
    "kana": "はなした",
    "romaji": "hanashita"
  },
  "話して": {
    "kana": "はなして",
    "romaji": "hanashite"
  },
  "話せる": {
    "kana": "はなせる",
    "romaji": "hanaseru"
  },
  "話そう": {
    "kana": "はなそう",
    "romaji": "hanasou"
  },
  "話題作": {
    "kana": "わだいさく",
    "romaji": "wadaisaku"
  },
  "詳しく": {
    "kana": "くわしく",
    "romaji": "kuwashiku"
  },
  "誕生日": {
    "kana": "たんじょうび",
    "romaji": "tanjyoubi"
  },
  "誘導灯": {
    "kana": "ゆうどうともしび",
    "romaji": "yuudou tomoshibi"
  },
  "誤った": {
    "kana": "あやまった",
    "romaji": "ayamatta"
  },
  "説得力": {
    "kana": "せっとくりょく",
    "romaji": "settokuryoku"
  },
  "説明会": {
    "kana": "せつめいかい",
    "romaji": "setsumeikai"
  },
  "読んだ": {
    "kana": "よんだ",
    "romaji": "yonda"
  },
  "読者層": {
    "kana": "どくしゃそう",
    "romaji": "dokushasou"
  },
  "調べる": {
    "kana": "しらべる",
    "romaji": "shiraberu"
  },
  "調印式": {
    "kana": "ちょういんしき",
    "romaji": "chouinshiki"
  },
  "調達先": {
    "kana": "ちょうたつさき",
    "romaji": "choutatsu saki"
  },
  "諦める": {
    "kana": "あきらめる",
    "romaji": "akirameru"
  },
  "謙譲語": {
    "kana": "けんじょうご",
    "romaji": "kenjougo"
  },
  "講じる": {
    "kana": "こうじる",
    "romaji": "koujiru"
  },
  "講演会": {
    "kana": "こうえんかい",
    "romaji": "kouenkai"
  },
  "講演者": {
    "kana": "こうえんしゃ",
    "romaji": "kouensha"
  },
  "議事録": {
    "kana": "ぎじろく",
    "romaji": "gijiroku"
  },
  "負ける": {
    "kana": "まける",
    "romaji": "makeru"
  },
  "負担金": {
    "kana": "ふたんきん",
    "romaji": "futankin"
  },
  "財政難": {
    "kana": "ざいせいなん",
    "romaji": "zaiseinan"
  },
  "販売量": {
    "kana": "はんばいりょう",
    "romaji": "hanbairyou"
  },
  "責める": {
    "kana": "せめる",
    "romaji": "semeru"
  },
  "貯まる": {
    "kana": "たまる",
    "romaji": "tamaru"
  },
  "貯める": {
    "kana": "ためる",
    "romaji": "tameru"
  },
  "貯水池": {
    "kana": "ちょすいち",
    "romaji": "chosuichi"
  },
  "買い物": {
    "kana": "かいもの",
    "romaji": "kaimono"
  },
  "買った": {
    "kana": "かった",
    "romaji": "katta"
  },
  "資料室": {
    "kana": "しりょうしつ",
    "romaji": "shiryoushitsu"
  },
  "資料調": {
    "kana": "しりょうちょう",
    "romaji": "shiryou chou"
  },
  "資金繰": {
    "kana": "しきんそう",
    "romaji": "shikin sou"
  },
  "資金面": {
    "kana": "しきんめん",
    "romaji": "shikinmen"
  },
  "賑やか": {
    "kana": "にぎやか",
    "romaji": "nigiyaka"
  },
  "購入率": {
    "kana": "こうにゅうりつ",
    "romaji": "kounyuu ritsu"
  },
  "赴いて": {
    "kana": "おもむいて",
    "romaji": "omomuite"
  },
  "起きる": {
    "kana": "おきる",
    "romaji": "okiru"
  },
  "起こす": {
    "kana": "おこす",
    "romaji": "okosu"
  },
  "越した": {
    "kana": "こした",
    "romaji": "koshita"
  },
  "足りる": {
    "kana": "たりる",
    "romaji": "tariru"
  },
  "身体知": {
    "kana": "しんたいち",
    "romaji": "shintai chi"
  },
  "車の音": {
    "kana": "くるまのおと",
    "romaji": "kuruma no oto"
  },
  "農作業": {
    "kana": "のうさぎょう",
    "romaji": "nousagyou"
  },
  "農作物": {
    "kana": "のうさくぶつ",
    "romaji": "nousakubutsu"
  },
  "迅速化": {
    "kana": "じんそくか",
    "romaji": "jinsokuka"
  },
  "迎える": {
    "kana": "むかえる",
    "romaji": "mukaeru"
  },
  "返した": {
    "kana": "かえした",
    "romaji": "kaeshita"
  },
  "返却口": {
    "kana": "へんきゃくくち",
    "romaji": "henkyaku kuchi"
  },
  "返却日": {
    "kana": "へんきゃくび",
    "romaji": "henkyakubi"
  },
  "返送用": {
    "kana": "へんそうよう",
    "romaji": "hensouyou"
  },
  "返還後": {
    "kana": "へんかんご",
    "romaji": "henkango"
  },
  "述べて": {
    "kana": "のべて",
    "romaji": "nobete"
  },
  "退ける": {
    "kana": "しりぞける",
    "romaji": "shirizokeru"
  },
  "送電網": {
    "kana": "そうでんもう",
    "romaji": "soudenmou"
  },
  "送電線": {
    "kana": "そうでんせん",
    "romaji": "soudensen"
  },
  "逃さず": {
    "kana": "のがさず",
    "romaji": "nogasazu"
  },
  "逆説的": {
    "kana": "ぎゃくせつてき",
    "romaji": "gyakusetsuteki"
  },
  "透かす": {
    "kana": "すかす",
    "romaji": "sukasu"
  },
  "透明性": {
    "kana": "とうめいせい",
    "romaji": "toumeisei"
  },
  "通学路": {
    "kana": "つうがくろ",
    "romaji": "tsuugakuro"
  },
  "通訳頼": {
    "kana": "つうやくらい",
    "romaji": "tsuuyaku rai"
  },
  "造形物": {
    "kana": "ぞうけいもの",
    "romaji": "zoukei mono"
  },
  "連れる": {
    "kana": "つれる",
    "romaji": "tsureru"
  },
  "連休中": {
    "kana": "れんきゅうちゅう",
    "romaji": "renkyuuchuu"
  },
  "連体形": {
    "kana": "れんたいけい",
    "romaji": "rentaikei"
  },
  "連用形": {
    "kana": "れんようけい",
    "romaji": "renyoukei"
  },
  "連絡網": {
    "kana": "れんらくもう",
    "romaji": "renrakumou"
  },
  "週三日": {
    "kana": "しゅうみっか",
    "romaji": "shuu mikka"
  },
  "週間前": {
    "kana": "しゅうかんまえ",
    "romaji": "shuukanmae"
  },
  "進める": {
    "kana": "すすめる",
    "romaji": "susumeru"
  },
  "進んで": {
    "kana": "すすんで",
    "romaji": "susunde"
  },
  "遅れて": {
    "kana": "おくれて",
    "romaji": "okurete"
  },
  "遅れる": {
    "kana": "おくれる",
    "romaji": "okureru"
  },
  "運んだ": {
    "kana": "はこんだ",
    "romaji": "hakonda"
  },
  "運んで": {
    "kana": "はこんで",
    "romaji": "hakonde"
  },
  "運転手": {
    "kana": "うんてんしゅ",
    "romaji": "untenshu"
  },
  "過ごす": {
    "kana": "すごす",
    "romaji": "sugosu"
  },
  "過不足": {
    "kana": "かふそく",
    "romaji": "kafusoku"
  },
  "違和感": {
    "kana": "いわかん",
    "romaji": "iwakan"
  },
  "遠くて": {
    "kana": "とおくて",
    "romaji": "tookute"
  },
  "選択肢": {
    "kana": "せんたくし",
    "romaji": "sentakushi"
  },
  "遺伝子": {
    "kana": "いでんし",
    "romaji": "idenshi"
  },
  "避ける": {
    "kana": "さける",
    "romaji": "sakeru"
  },
  "避難所": {
    "kana": "ひなんじょ",
    "romaji": "hinanjo"
  },
  "部印刷": {
    "kana": "ぶいんさつ",
    "romaji": "bu insatsu"
  },
  "郵便局": {
    "kana": "ゆうびんきょく",
    "romaji": "yuubinkyoku"
  },
  "都市部": {
    "kana": "としぶ",
    "romaji": "toshibu"
  },
  "重くて": {
    "kana": "おもくて",
    "romaji": "omokute"
  },
  "重労働": {
    "kana": "じゅうろうどう",
    "romaji": "juuroudou"
  },
  "重症化": {
    "kana": "じゅうしょうか",
    "romaji": "juushou ka"
  },
  "金曜日": {
    "kana": "きんようび",
    "romaji": "kinyoubi"
  },
  "鑑みる": {
    "kana": "かんがみる",
    "romaji": "kangamiru"
  },
  "長年一": {
    "kana": "ながねんいち",
    "romaji": "naganen ichi"
  },
  "長年培": {
    "kana": "ながねんばい",
    "romaji": "naganen bai"
  },
  "長年続": {
    "kana": "ながねんぞく",
    "romaji": "naganen zoku"
  },
  "長時間": {
    "kana": "ちょうじかん",
    "romaji": "choujikan"
  },
  "長期的": {
    "kana": "ちょうきてき",
    "romaji": "choukiteki"
  },
  "門前払": {
    "kana": "もんぜんふつ",
    "romaji": "monzen futsu"
  },
  "閉める": {
    "kana": "しめる",
    "romaji": "shimeru"
  },
  "開ける": {
    "kana": "あける",
    "romaji": "akeru"
  },
  "開発費": {
    "kana": "かいはつひ",
    "romaji": "kaihatsuhi"
  },
  "間指摘": {
    "kana": "かんしてき",
    "romaji": "kan shiteki"
  },
  "間違い": {
    "kana": "まちがい",
    "romaji": "machigai"
  },
  "関する": {
    "kana": "かんする",
    "romaji": "kansuru"
  },
  "閲覧室": {
    "kana": "えつらんしつ",
    "romaji": "etsuranshitsu"
  },
  "防波堤": {
    "kana": "ぼうはてい",
    "romaji": "bouhatei"
  },
  "降りる": {
    "kana": "おりる",
    "romaji": "oriru"
  },
  "階段状": {
    "kana": "かいだんじょう",
    "romaji": "kaidanjou"
  },
  "随分売": {
    "kana": "ずいぶんばい",
    "romaji": "zuibun bai"
  },
  "隠れる": {
    "kana": "かくれる",
    "romaji": "kakureru"
  },
  "集会所": {
    "kana": "しゅうかいじょ",
    "romaji": "shuukaijo"
  },
  "離れる": {
    "kana": "はなれる",
    "romaji": "hanareru"
  },
  "離職率": {
    "kana": "りしょくりつ",
    "romaji": "rishoku ritsu"
  },
  "離職者": {
    "kana": "りしょくもの",
    "romaji": "rishoku mono"
  },
  "難しい": {
    "kana": "むずかしい",
    "romaji": "muzukashii"
  },
  "雪景色": {
    "kana": "せっけいいろ",
    "romaji": "sekkei iro"
  },
  "雰囲気": {
    "kana": "ふんいき",
    "romaji": "fun'iki"
  },
  "電話口": {
    "kana": "でんわぐち",
    "romaji": "denwaguchi"
  },
  "需要側": {
    "kana": "じゅようがわ",
    "romaji": "juyou gawa"
  },
  "震える": {
    "kana": "ふるえる",
    "romaji": "furueru"
  },
  "静かな": {
    "kana": "しずかな",
    "romaji": "shizukana"
  },
  "非公開": {
    "kana": "ひこうかい",
    "romaji": "hikoukai"
  },
  "非効率": {
    "kana": "ひこうりつ",
    "romaji": "hikouritsu"
  },
  "非常時": {
    "kana": "ひじょうじ",
    "romaji": "hijouji"
  },
  "面白い": {
    "kana": "おもしろい",
    "romaji": "omoshiroi"
  },
  "韓国人": {
    "kana": "かんこくじん",
    "romaji": "kankokujin"
  },
  "韓国語": {
    "kana": "かんこくご",
    "romaji": "kankokugo"
  },
  "預ける": {
    "kana": "あずける",
    "romaji": "azukeru"
  },
  "頑張る": {
    "kana": "がんばる",
    "romaji": "ganbaru"
  },
  "領収書": {
    "kana": "りょうしゅうしょ",
    "romaji": "ryoushuusho"
  },
  "顕在化": {
    "kana": "けんざいか",
    "romaji": "kenzaika"
  },
  "顧客層": {
    "kana": "こきゃくそう",
    "romaji": "kokyaku sou"
  },
  "飛行機": {
    "kana": "ひこうき",
    "romaji": "hikouki"
  },
  "食べた": {
    "kana": "たべた",
    "romaji": "tabeta"
  },
  "食べて": {
    "kana": "たべて",
    "romaji": "tabete"
  },
  "食べる": {
    "kana": "たべる",
    "romaji": "taberu"
  },
  "食べ物": {
    "kana": "たべもの",
    "romaji": "tabemono"
  },
  "食物網": {
    "kana": "たべものあみ",
    "romaji": "tabemono ami"
  },
  "飲み物": {
    "kana": "のみもの",
    "romaji": "nomimono"
  },
  "飲んだ": {
    "kana": "のんだ",
    "romaji": "nonda"
  },
  "飲んで": {
    "kana": "のんで",
    "romaji": "nonde"
  },
  "飲食店": {
    "kana": "いんしょくてん",
    "romaji": "inshokuten"
  },
  "駅集合": {
    "kana": "えきしゅうごう",
    "romaji": "eki shuugou"
  },
  "駐輪場": {
    "kana": "ちゅうりんじょう",
    "romaji": "chuurinjou"
  },
  "高める": {
    "kana": "たかめる",
    "romaji": "takameru"
  },
  "高度化": {
    "kana": "こうどか",
    "romaji": "koudoka"
  },
  "高校生": {
    "kana": "こうこうせい",
    "romaji": "koukousei"
  },
  "高精細": {
    "kana": "こうせいさい",
    "romaji": "kouseisai"
  },
  "高騰分": {
    "kana": "こうとうふん",
    "romaji": "koutou fun"
  },
  "高齢化": {
    "kana": "こうれいか",
    "romaji": "koureika"
  },
  "高齢者": {
    "kana": "こうれいしゃ",
    "romaji": "koureisha"
  },
  "魚料理": {
    "kana": "さかなりょうり",
    "romaji": "sakana ryouri"
  },
  "鳴らす": {
    "kana": "ならす",
    "romaji": "narasu"
  },
  "黄色い": {
    "kana": "きいろい",
    "romaji": "kiiroi"
  },
  "1人": {
    "kana": "ひとり",
    "romaji": "hitori"
  },
  "1個": {
    "kana": "いっこ",
    "romaji": "ikko"
  },
  "1冊": {
    "kana": "いっさつ",
    "romaji": "issatsu"
  },
  "1分": {
    "kana": "いっぷん",
    "romaji": "ippun"
  },
  "1匹": {
    "kana": "いっぴき",
    "romaji": "ippiki"
  },
  "1回": {
    "kana": "いっかい",
    "romaji": "ikkai"
  },
  "1年": {
    "kana": "いちねん",
    "romaji": "ichinen"
  },
  "1才": {
    "kana": "いっさい",
    "romaji": "issai"
  },
  "1日": {
    "kana": "ついたち",
    "romaji": "tsuitachi"
  },
  "1時": {
    "kana": "いちじ",
    "romaji": "ichiji"
  },
  "1月": {
    "kana": "いちがつ",
    "romaji": "ichigatsu"
  },
  "1本": {
    "kana": "いっぽん",
    "romaji": "ippon"
  },
  "1枚": {
    "kana": "いちまい",
    "romaji": "ichimai"
  },
  "1歳": {
    "kana": "いっさい",
    "romaji": "issai"
  },
  "1階": {
    "kana": "いっかい",
    "romaji": "ikkai"
  },
  "2人": {
    "kana": "ふたり",
    "romaji": "futari"
  },
  "2個": {
    "kana": "にこ",
    "romaji": "niko"
  },
  "2冊": {
    "kana": "にさつ",
    "romaji": "nisatsu"
  },
  "2分": {
    "kana": "にふん",
    "romaji": "nifun"
  },
  "2匹": {
    "kana": "にひき",
    "romaji": "nihiki"
  },
  "2回": {
    "kana": "にかい",
    "romaji": "nikai"
  },
  "2年": {
    "kana": "にねん",
    "romaji": "ninen"
  },
  "2才": {
    "kana": "にさい",
    "romaji": "nisai"
  },
  "2日": {
    "kana": "ふつか",
    "romaji": "futsuka"
  },
  "2時": {
    "kana": "にじ",
    "romaji": "niji"
  },
  "2月": {
    "kana": "にがつ",
    "romaji": "nigatsu"
  },
  "2本": {
    "kana": "にほん",
    "romaji": "nihon"
  },
  "2枚": {
    "kana": "にまい",
    "romaji": "nimai"
  },
  "2歳": {
    "kana": "にさい",
    "romaji": "nisai"
  },
  "2階": {
    "kana": "にかい",
    "romaji": "nikai"
  },
  "3人": {
    "kana": "さんにん",
    "romaji": "sannin"
  },
  "3個": {
    "kana": "さんこ",
    "romaji": "sanko"
  },
  "3冊": {
    "kana": "さんさつ",
    "romaji": "sansatsu"
  },
  "3分": {
    "kana": "さんぷん",
    "romaji": "sanpun"
  },
  "3匹": {
    "kana": "さんびき",
    "romaji": "sanbiki"
  },
  "3回": {
    "kana": "さんかい",
    "romaji": "sankai"
  },
  "3年": {
    "kana": "さんねん",
    "romaji": "sannen"
  },
  "3才": {
    "kana": "さんさい",
    "romaji": "sansai"
  },
  "3日": {
    "kana": "みっか",
    "romaji": "mikka"
  },
  "3時": {
    "kana": "さんじ",
    "romaji": "sanji"
  },
  "3月": {
    "kana": "さんがつ",
    "romaji": "sangatsu"
  },
  "3本": {
    "kana": "さんぼん",
    "romaji": "sanbon"
  },
  "3枚": {
    "kana": "さんまい",
    "romaji": "sanmai"
  },
  "3歳": {
    "kana": "さんさい",
    "romaji": "sansai"
  },
  "3階": {
    "kana": "さんがい",
    "romaji": "sangai"
  },
  "4人": {
    "kana": "よにん",
    "romaji": "yonin"
  },
  "4個": {
    "kana": "よんこ",
    "romaji": "yonko"
  },
  "4冊": {
    "kana": "よんさつ",
    "romaji": "yonsatsu"
  },
  "4分": {
    "kana": "よんぷん",
    "romaji": "yonpun"
  },
  "4匹": {
    "kana": "よんひき",
    "romaji": "yonhiki"
  },
  "4回": {
    "kana": "よんかい",
    "romaji": "yonkai"
  },
  "4年": {
    "kana": "よねん",
    "romaji": "yonen"
  },
  "4才": {
    "kana": "よんさい",
    "romaji": "yonsai"
  },
  "4日": {
    "kana": "よっか",
    "romaji": "yokka"
  },
  "4時": {
    "kana": "よじ",
    "romaji": "yoji"
  },
  "4月": {
    "kana": "しがつ",
    "romaji": "shigatsu"
  },
  "4本": {
    "kana": "よんほん",
    "romaji": "yonhon"
  },
  "4枚": {
    "kana": "よんまい",
    "romaji": "yonmai"
  },
  "4歳": {
    "kana": "よんさい",
    "romaji": "yonsai"
  },
  "4階": {
    "kana": "よんかい",
    "romaji": "yonkai"
  },
  "5人": {
    "kana": "ごにん",
    "romaji": "gonin"
  },
  "5個": {
    "kana": "ごこ",
    "romaji": "goko"
  },
  "5冊": {
    "kana": "ごさつ",
    "romaji": "gosatsu"
  },
  "5分": {
    "kana": "ごふん",
    "romaji": "gofun"
  },
  "5匹": {
    "kana": "ごひき",
    "romaji": "gohiki"
  },
  "5回": {
    "kana": "ごかい",
    "romaji": "gokai"
  },
  "5年": {
    "kana": "ごねん",
    "romaji": "gonen"
  },
  "5才": {
    "kana": "ごさい",
    "romaji": "gosai"
  },
  "5日": {
    "kana": "いつか",
    "romaji": "itsuka"
  },
  "5時": {
    "kana": "ごじ",
    "romaji": "goji"
  },
  "5月": {
    "kana": "ごがつ",
    "romaji": "gogatsu"
  },
  "5本": {
    "kana": "ごほん",
    "romaji": "gohon"
  },
  "5枚": {
    "kana": "ごまい",
    "romaji": "gomai"
  },
  "5歳": {
    "kana": "ごさい",
    "romaji": "gosai"
  },
  "5階": {
    "kana": "ごかい",
    "romaji": "gokai"
  },
  "6人": {
    "kana": "ろくにん",
    "romaji": "rokunin"
  },
  "6個": {
    "kana": "ろっこ",
    "romaji": "rokko"
  },
  "6冊": {
    "kana": "ろくさつ",
    "romaji": "rokusatsu"
  },
  "6分": {
    "kana": "ろっぷん",
    "romaji": "roppun"
  },
  "6匹": {
    "kana": "ろっぴき",
    "romaji": "roppiki"
  },
  "6回": {
    "kana": "ろっかい",
    "romaji": "rokkai"
  },
  "6年": {
    "kana": "ろくねん",
    "romaji": "rokunen"
  },
  "6才": {
    "kana": "ろくさい",
    "romaji": "rokusai"
  },
  "6日": {
    "kana": "むいか",
    "romaji": "muika"
  },
  "6時": {
    "kana": "ろくじ",
    "romaji": "rokuji"
  },
  "6月": {
    "kana": "ろくがつ",
    "romaji": "rokugatsu"
  },
  "6本": {
    "kana": "ろっぽん",
    "romaji": "roppon"
  },
  "6歳": {
    "kana": "ろくさい",
    "romaji": "rokusai"
  },
  "6階": {
    "kana": "ろっかい",
    "romaji": "rokkai"
  },
  "7人": {
    "kana": "ななにん",
    "romaji": "nananin"
  },
  "7個": {
    "kana": "ななこ",
    "romaji": "nanako"
  },
  "7冊": {
    "kana": "ななさつ",
    "romaji": "nanasatsu"
  },
  "7分": {
    "kana": "ななふん",
    "romaji": "nanafun"
  },
  "7匹": {
    "kana": "ななひき",
    "romaji": "nanahiki"
  },
  "7回": {
    "kana": "ななかい",
    "romaji": "nanakai"
  },
  "7年": {
    "kana": "ななねん",
    "romaji": "nananen"
  },
  "7才": {
    "kana": "ななさい",
    "romaji": "nanasai"
  },
  "7日": {
    "kana": "なのか",
    "romaji": "nanoka"
  },
  "7時": {
    "kana": "しちじ",
    "romaji": "shichiji"
  },
  "7月": {
    "kana": "しちがつ",
    "romaji": "shichigatsu"
  },
  "7本": {
    "kana": "ななほん",
    "romaji": "nanahon"
  },
  "7歳": {
    "kana": "ななさい",
    "romaji": "nanasai"
  },
  "7階": {
    "kana": "ななかい",
    "romaji": "nanakai"
  },
  "8人": {
    "kana": "はちにん",
    "romaji": "hachinin"
  },
  "8個": {
    "kana": "はっこ",
    "romaji": "hakko"
  },
  "8冊": {
    "kana": "はっさつ",
    "romaji": "hassatsu"
  },
  "8分": {
    "kana": "はっぷん",
    "romaji": "happun"
  },
  "8匹": {
    "kana": "はっぴき",
    "romaji": "happiki"
  },
  "8回": {
    "kana": "はっかい",
    "romaji": "hakkai"
  },
  "8年": {
    "kana": "はちねん",
    "romaji": "hachinen"
  },
  "8才": {
    "kana": "はっさい",
    "romaji": "hassai"
  },
  "8日": {
    "kana": "ようか",
    "romaji": "youka"
  },
  "8時": {
    "kana": "はちじ",
    "romaji": "hachiji"
  },
  "8月": {
    "kana": "はちがつ",
    "romaji": "hachigatsu"
  },
  "8本": {
    "kana": "はっぽん",
    "romaji": "happon"
  },
  "8歳": {
    "kana": "はっさい",
    "romaji": "hassai"
  },
  "8階": {
    "kana": "はっかい",
    "romaji": "hakkai"
  },
  "9人": {
    "kana": "きゅうにん",
    "romaji": "kyuunin"
  },
  "9個": {
    "kana": "きゅうこ",
    "romaji": "kyuuko"
  },
  "9冊": {
    "kana": "きゅうさつ",
    "romaji": "kyuusatsu"
  },
  "9分": {
    "kana": "きゅうふん",
    "romaji": "kyuufun"
  },
  "9匹": {
    "kana": "きゅうひき",
    "romaji": "kyuuhiki"
  },
  "9回": {
    "kana": "きゅうかい",
    "romaji": "kyuukai"
  },
  "9年": {
    "kana": "きゅうねん",
    "romaji": "kyuunen"
  },
  "9才": {
    "kana": "きゅうさい",
    "romaji": "kyuusai"
  },
  "9日": {
    "kana": "ここのか",
    "romaji": "kokonoka"
  },
  "9時": {
    "kana": "くじ",
    "romaji": "kuji"
  },
  "9月": {
    "kana": "くがつ",
    "romaji": "kugatsu"
  },
  "9本": {
    "kana": "きゅうほん",
    "romaji": "kyuuhon"
  },
  "9歳": {
    "kana": "きゅうさい",
    "romaji": "kyuusai"
  },
  "9階": {
    "kana": "きゅうかい",
    "romaji": "kyuukai"
  },
  "あさ": {
    "kana": "あさ",
    "romaji": "asa"
  },
  "あれ": {
    "kana": "あれ",
    "romaji": "are"
  },
  "いく": {
    "kana": "いく",
    "romaji": "iku"
  },
  "いつ": {
    "kana": "いつ",
    "romaji": "itsu"
  },
  "いま": {
    "kana": "いま",
    "romaji": "ima"
  },
  "いる": {
    "kana": "いる",
    "romaji": "iru"
  },
  "おれ": {
    "kana": "おれ",
    "romaji": "ore"
  },
  "お供": {
    "kana": "おとも",
    "romaji": "o-tomo"
  },
  "お前": {
    "kana": "おまえ",
    "romaji": "omae"
  },
  "お寺": {
    "kana": "おてら",
    "romaji": "otera"
  },
  "お尻": {
    "kana": "おしり",
    "romaji": "oshiri"
  },
  "お湯": {
    "kana": "おゆ",
    "romaji": "o-yu"
  },
  "お腹": {
    "kana": "おなか",
    "romaji": "onaka"
  },
  "お茶": {
    "kana": "おちゃ",
    "romaji": "o-cha"
  },
  "お酒": {
    "kana": "おさけ",
    "romaji": "o-sake"
  },
  "お金": {
    "kana": "おかね",
    "romaji": "o-kane"
  },
  "ガス": {
    "kana": "ガス",
    "romaji": "gasu"
  },
  "ガム": {
    "kana": "ガム",
    "romaji": "gamu"
  },
  "かれ": {
    "kana": "かれ",
    "romaji": "kare"
  },
  "きみ": {
    "kana": "きみ",
    "romaji": "kimi"
  },
  "くる": {
    "kana": "くる",
    "romaji": "kuru"
  },
  "けさ": {
    "kana": "けさ",
    "romaji": "kesa"
  },
  "ここ": {
    "kana": "ここ",
    "romaji": "koko"
  },
  "ゴム": {
    "kana": "ゴム",
    "romaji": "gomu"
  },
  "これ": {
    "kana": "これ",
    "romaji": "kore"
  },
  "ご飯": {
    "kana": "ごはん",
    "romaji": "gohan"
  },
  "すき": {
    "kana": "すき",
    "romaji": "suki"
  },
  "すぐ": {
    "kana": "すぐ",
    "romaji": "sugu"
  },
  "する": {
    "kana": "する",
    "romaji": "suru"
  },
  "ゼロ": {
    "kana": "ゼロ",
    "romaji": "zero"
  },
  "そこ": {
    "kana": "そこ",
    "romaji": "soko"
  },
  "それ": {
    "kana": "それ",
    "romaji": "sore"
  },
  "タイ": {
    "kana": "タイ",
    "romaji": "tai"
  },
  "だれ": {
    "kana": "だれ",
    "romaji": "dare"
  },
  "ちち": {
    "kana": "ちち",
    "romaji": "chichi"
  },
  "つく": {
    "kana": "つく",
    "romaji": "tsuku"
  },
  "です": {
    "kana": "です",
    "romaji": "desu"
  },
  "でも": {
    "kana": "でも",
    "romaji": "demo"
  },
  "ドア": {
    "kana": "ドア",
    "romaji": "doa"
  },
  "どく": {
    "kana": "どく",
    "romaji": "doku"
  },
  "どこ": {
    "kana": "どこ",
    "romaji": "doko"
  },
  "ドル": {
    "kana": "ドル",
    "romaji": "doru"
  },
  "どれ": {
    "kana": "どれ",
    "romaji": "dore"
  },
  "トン": {
    "kana": "トン",
    "romaji": "ton"
  },
  "なに": {
    "kana": "なに",
    "romaji": "nani"
  },
  "なる": {
    "kana": "なる",
    "romaji": "naru"
  },
  "のむ": {
    "kana": "のむ",
    "romaji": "nomu"
  },
  "はい": {
    "kana": "はい",
    "romaji": "hai"
  },
  "バス": {
    "kana": "バス",
    "romaji": "basu"
  },
  "はは": {
    "kana": "はは",
    "romaji": "haha"
  },
  "ハム": {
    "kana": "ハム",
    "romaji": "hamu"
  },
  "バリ": {
    "kana": "バリ",
    "romaji": "bari"
  },
  "パン": {
    "kana": "パン",
    "romaji": "pan"
  },
  "ビザ": {
    "kana": "ビザ",
    "romaji": "biza"
  },
  "ひる": {
    "kana": "ひる",
    "romaji": "hiru"
  },
  "ビル": {
    "kana": "ビル",
    "romaji": "biru"
  },
  "ベル": {
    "kana": "ベル",
    "romaji": "beru"
  },
  "ペン": {
    "kana": "ぺん",
    "romaji": "pen"
  },
  "ぼく": {
    "kana": "ぼく",
    "romaji": "boku"
  },
  "ほん": {
    "kana": "ほん",
    "romaji": "hon"
  },
  "まず": {
    "kana": "まず",
    "romaji": "mazu"
  },
  "また": {
    "kana": "また",
    "romaji": "mata"
  },
  "まだ": {
    "kana": "まだ",
    "romaji": "mada"
  },
  "ミリ": {
    "kana": "ミリ",
    "romaji": "miri"
  },
  "メモ": {
    "kana": "メモ",
    "romaji": "memo"
  },
  "もう": {
    "kana": "もう",
    "romaji": "mou"
  },
  "もし": {
    "kana": "もし",
    "romaji": "moshi"
  },
  "やる": {
    "kana": "やる",
    "romaji": "yaru"
  },
  "やれ": {
    "kana": "やれ",
    "romaji": "yare"
  },
  "よく": {
    "kana": "よく",
    "romaji": "yoku"
  },
  "よむ": {
    "kana": "よむ",
    "romaji": "yomu"
  },
  "よる": {
    "kana": "よる",
    "romaji": "yoru"
  },
  "一つ": {
    "kana": "ひとつ",
    "romaji": "hitotsu"
  },
  "一人": {
    "kana": "ひとり",
    "romaji": "hitori"
  },
  "一体": {
    "kana": "いったい",
    "romaji": "ittai"
  },
  "一個": {
    "kana": "いっこ",
    "romaji": "ikko"
  },
  "一円": {
    "kana": "いちえん",
    "romaji": "ichien"
  },
  "一冊": {
    "kana": "いっさつ",
    "romaji": "issatsu"
  },
  "一分": {
    "kana": "いっぷん",
    "romaji": "ippun"
  },
  "一切": {
    "kana": "いっさい",
    "romaji": "issai"
  },
  "一刻": {
    "kana": "いっこく",
    "romaji": "ikkoku"
  },
  "一匹": {
    "kana": "いっぴき",
    "romaji": "ippiki"
  },
  "一回": {
    "kana": "いっかい",
    "romaji": "ikkai"
  },
  "一報": {
    "kana": "いっぽう",
    "romaji": "ippou"
  },
  "一変": {
    "kana": "いっぺん",
    "romaji": "ippen"
  },
  "一夜": {
    "kana": "いちや",
    "romaji": "ichiya"
  },
  "一定": {
    "kana": "いってい",
    "romaji": "ittei"
  },
  "一年": {
    "kana": "いちねん",
    "romaji": "ichinen"
  },
  "一度": {
    "kana": "いちど",
    "romaji": "ichido"
  },
  "一才": {
    "kana": "いっさい",
    "romaji": "issai"
  },
  "一括": {
    "kana": "いっかつ",
    "romaji": "ikkatsu"
  },
  "一文": {
    "kana": "いちぶん",
    "romaji": "ichibun"
  },
  "一斉": {
    "kana": "いっせい",
    "romaji": "issei"
  },
  "一方": {
    "kana": "いっぽう",
    "romaji": "ippou"
  },
  "一日": {
    "kana": "いちにち",
    "romaji": "ichinichi"
  },
  "一時": {
    "kana": "いちじ",
    "romaji": "ichiji"
  },
  "一曲": {
    "kana": "いっきょく",
    "romaji": "ikkyoku"
  },
  "一月": {
    "kana": "いちがつ",
    "romaji": "ichigatsu"
  },
  "一本": {
    "kana": "いっぽん",
    "romaji": "ippon"
  },
  "一杯": {
    "kana": "いっぱい",
    "romaji": "ippai"
  },
  "一枚": {
    "kana": "いちまい",
    "romaji": "ichimai"
  },
  "一歳": {
    "kana": "いっさい",
    "romaji": "issai"
  },
  "一気": {
    "kana": "いっき",
    "romaji": "ikki"
  },
  "一滴": {
    "kana": "いってき",
    "romaji": "itteki"
  },
  "一環": {
    "kana": "いっかん",
    "romaji": "ikkan"
  },
  "一生": {
    "kana": "いっしょう",
    "romaji": "isshou"
  },
  "一番": {
    "kana": "いちばん",
    "romaji": "ichiban"
  },
  "一瞬": {
    "kana": "いっしゅん",
    "romaji": "isshun"
  },
  "一緒": {
    "kana": "いっしょ",
    "romaji": "issho"
  },
  "一線": {
    "kana": "いっせん",
    "romaji": "issen"
  },
  "一翼": {
    "kana": "いちよく",
    "romaji": "ichiyoku"
  },
  "一行": {
    "kana": "いちぎょう",
    "romaji": "ichigyou"
  },
  "一言": {
    "kana": "ひとこと",
    "romaji": "hitokoto"
  },
  "一語": {
    "kana": "いちご",
    "romaji": "ichigo"
  },
  "一読": {
    "kana": "いちどく",
    "romaji": "ichidoku"
  },
  "一通": {
    "kana": "いっつう",
    "romaji": "ittsuu"
  },
  "一部": {
    "kana": "いちぶ",
    "romaji": "ichibu"
  },
  "一階": {
    "kana": "いっかい",
    "romaji": "ikkai"
  },
  "一顧": {
    "kana": "いっこ",
    "romaji": "ikko"
  },
  "丁寧": {
    "kana": "ていねい",
    "romaji": "teinei"
  },
  "丁重": {
    "kana": "ていちょう",
    "romaji": "teichou"
  },
  "七つ": {
    "kana": "ななつ",
    "romaji": "nanatsu"
  },
  "七人": {
    "kana": "しちにん",
    "romaji": "shichinin"
  },
  "七個": {
    "kana": "ななこ",
    "romaji": "nanako"
  },
  "七冊": {
    "kana": "ななさつ",
    "romaji": "nanasatsu"
  },
  "七分": {
    "kana": "ななふん",
    "romaji": "nanafun"
  },
  "七匹": {
    "kana": "ななひき",
    "romaji": "nanahiki"
  },
  "七回": {
    "kana": "ななかい",
    "romaji": "nanakai"
  },
  "七年": {
    "kana": "ななねん",
    "romaji": "nananen"
  },
  "七才": {
    "kana": "ななさい",
    "romaji": "nanasai"
  },
  "七日": {
    "kana": "なのか",
    "romaji": "nanoka"
  },
  "七時": {
    "kana": "しちじ",
    "romaji": "shichiji"
  },
  "七月": {
    "kana": "しちがつ",
    "romaji": "shichigatsu"
  },
  "七本": {
    "kana": "ななほん",
    "romaji": "nanahon"
  },
  "七歳": {
    "kana": "ななさい",
    "romaji": "nanasai"
  },
  "七海": {
    "kana": "ななみ",
    "romaji": "Nanami"
  },
  "七階": {
    "kana": "ななかい",
    "romaji": "nanakai"
  },
  "万一": {
    "kana": "まんいち",
    "romaji": "man'ichi"
  },
  "万件": {
    "kana": "まんけん",
    "romaji": "man ken"
  },
  "万全": {
    "kana": "ばんぜん",
    "romaji": "banzen"
  },
  "万能": {
    "kana": "ばんのう",
    "romaji": "bannou"
  },
  "丈夫": {
    "kana": "じょうぶ",
    "romaji": "joubu"
  },
  "三つ": {
    "kana": "みっつ",
    "romaji": "mittsu"
  },
  "三人": {
    "kana": "さんにん",
    "romaji": "sannin"
  },
  "三個": {
    "kana": "さんこ",
    "romaji": "sanko"
  },
  "三倍": {
    "kana": "さんばい",
    "romaji": "sanbai"
  },
  "三冊": {
    "kana": "さんさつ",
    "romaji": "sansatsu"
  },
  "三分": {
    "kana": "さんぷん",
    "romaji": "sanpun"
  },
  "三割": {
    "kana": "さんわり",
    "romaji": "san wari"
  },
  "三匹": {
    "kana": "さんびき",
    "romaji": "sanbiki"
  },
  "三十": {
    "kana": "さんじゅう",
    "romaji": "sanjuu"
  },
  "三回": {
    "kana": "さんかい",
    "romaji": "sankai"
  },
  "三年": {
    "kana": "さんねん",
    "romaji": "sannen"
  },
  "三才": {
    "kana": "さんさい",
    "romaji": "sansai"
  },
  "三日": {
    "kana": "みっか",
    "romaji": "mikka"
  },
  "三時": {
    "kana": "さんじ",
    "romaji": "sanji"
  },
  "三月": {
    "kana": "さんがつ",
    "romaji": "sangatsu"
  },
  "三本": {
    "kana": "さんぼん",
    "romaji": "sanbon"
  },
  "三枚": {
    "kana": "さんまい",
    "romaji": "sanmai"
  },
  "三歳": {
    "kana": "さんさい",
    "romaji": "sansai"
  },
  "三番": {
    "kana": "さんばん",
    "romaji": "sanban"
  },
  "三階": {
    "kana": "さんかい",
    "romaji": "sankai"
  },
  "三食": {
    "kana": "さんしょく",
    "romaji": "sanshoku"
  },
  "上司": {
    "kana": "じょうし",
    "romaji": "jyoushi"
  },
  "上回": {
    "kana": "じょうかい",
    "romaji": "joukai"
  },
  "上手": {
    "kana": "じょうず",
    "romaji": "jouzu"
  },
  "上昇": {
    "kana": "じょうしょう",
    "romaji": "joushou"
  },
  "上流": {
    "kana": "じょうりゅう",
    "romaji": "jouryuu"
  },
  "上着": {
    "kana": "うわぎ",
    "romaji": "uwagi"
  },
  "上達": {
    "kana": "じょうたつ",
    "romaji": "joutatsu"
  },
  "下手": {
    "kana": "へた",
    "romaji": "heta"
  },
  "下草": {
    "kana": "したくさ",
    "romaji": "shitakusa"
  },
  "不便": {
    "kana": "ふべん",
    "romaji": "fuben"
  },
  "不安": {
    "kana": "ふあん",
    "romaji": "fuan"
  },
  "不審": {
    "kana": "ふしん",
    "romaji": "fushin"
  },
  "不当": {
    "kana": "ふとう",
    "romaji": "futou"
  },
  "不徳": {
    "kana": "ふとく",
    "romaji": "futoku"
  },
  "不慣": {
    "kana": "ふなれ",
    "romaji": "funare"
  },
  "不正": {
    "kana": "ふせい",
    "romaji": "fusei"
  },
  "不満": {
    "kana": "ふまん",
    "romaji": "fuman"
  },
  "不行": {
    "kana": "ふぎょう",
    "romaji": "fu gyou"
  },
  "不足": {
    "kana": "ふそく",
    "romaji": "fusoku"
  },
  "世代": {
    "kana": "せだい",
    "romaji": "sedai"
  },
  "世帯": {
    "kana": "せたい",
    "romaji": "setai"
  },
  "世界": {
    "kana": "せかい",
    "romaji": "sekai"
  },
  "世話": {
    "kana": "せわ",
    "romaji": "sewa"
  },
  "世論": {
    "kana": "よろん",
    "romaji": "yoron"
  },
  "両方": {
    "kana": "りょうほう",
    "romaji": "ryouhou"
  },
  "両立": {
    "kana": "りょうりつ",
    "romaji": "ryouritsu"
  },
  "両者": {
    "kana": "りょうしゃ",
    "romaji": "ryousha"
  },
  "両親": {
    "kana": "りょうしん",
    "romaji": "ryoushin"
  },
  "並々": {
    "kana": "なみなみ",
    "romaji": "naminami"
  },
  "並ぶ": {
    "kana": "ならぶ",
    "romaji": "narabu"
  },
  "並行": {
    "kana": "へいこう",
    "romaji": "heikou"
  },
  "中古": {
    "kana": "ちゅうこ",
    "romaji": "chuuko"
  },
  "中国": {
    "kana": "ちゅうごく",
    "romaji": "chuugoku"
  },
  "中央": {
    "kana": "ちゅうおう",
    "romaji": "chouou"
  },
  "中心": {
    "kana": "ちゅうしん",
    "romaji": "chuushin"
  },
  "中止": {
    "kana": "ちゅうし",
    "romaji": "chuushi"
  },
  "中身": {
    "kana": "なかみ",
    "romaji": "nakami"
  },
  "丸い": {
    "kana": "まるい",
    "romaji": "marui"
  },
  "丸呑": {
    "kana": "まるどん",
    "romaji": "maru don"
  },
  "主な": {
    "kana": "おもな",
    "romaji": "omo na"
  },
  "主人": {
    "kana": "しゅじん",
    "romaji": "shujin"
  },
  "主体": {
    "kana": "しゅたい",
    "romaji": "shutai"
  },
  "主婦": {
    "kana": "しゅふ",
    "romaji": "shufu"
  },
  "主審": {
    "kana": "しゅしん",
    "romaji": "shushin"
  },
  "主張": {
    "kana": "しゅちょう",
    "romaji": "shuchou"
  },
  "主文": {
    "kana": "しゅぶん",
    "romaji": "shubun"
  },
  "主題": {
    "kana": "しゅだい",
    "romaji": "shudai"
  },
  "乖離": {
    "kana": "かいり",
    "romaji": "kairi"
  },
  "乗る": {
    "kana": "のる",
    "romaji": "noru"
  },
  "乗客": {
    "kana": "じょうきゃく",
    "romaji": "joukyaku"
  },
  "九つ": {
    "kana": "ここのつ",
    "romaji": "kokonotsu"
  },
  "九人": {
    "kana": "きゅうにん",
    "romaji": "kyuunin"
  },
  "九個": {
    "kana": "きゅうこ",
    "romaji": "kyuuko"
  },
  "九冊": {
    "kana": "きゅうさつ",
    "romaji": "kyuusatsu"
  },
  "九分": {
    "kana": "きゅうふん",
    "romaji": "kyuufun"
  },
  "九匹": {
    "kana": "きゅうひき",
    "romaji": "kyuuhiki"
  },
  "九回": {
    "kana": "きゅうかい",
    "romaji": "kyuukai"
  },
  "九年": {
    "kana": "きゅうねん",
    "romaji": "kyuunen"
  },
  "九才": {
    "kana": "きゅうさい",
    "romaji": "kyuusai"
  },
  "九日": {
    "kana": "ここのか",
    "romaji": "kokonoka"
  },
  "九時": {
    "kana": "くじ",
    "romaji": "kuji"
  },
  "九月": {
    "kana": "くがつ",
    "romaji": "kugatsu"
  },
  "九本": {
    "kana": "きゅうほん",
    "romaji": "kyuuhon"
  },
  "九歳": {
    "kana": "きゅうさい",
    "romaji": "kyuusai"
  },
  "九階": {
    "kana": "きゅうかい",
    "romaji": "kyuukai"
  },
  "乱立": {
    "kana": "らんりつ",
    "romaji": "ranritsu"
  },
  "乾く": {
    "kana": "かわく",
    "romaji": "kawaku"
  },
  "予備": {
    "kana": "よび",
    "romaji": "yobi"
  },
  "予報": {
    "kana": "よほう",
    "romaji": "yohou"
  },
  "予定": {
    "kana": "よてい",
    "romaji": "yotei"
  },
  "予測": {
    "kana": "よそく",
    "romaji": "yosoku"
  },
  "予算": {
    "kana": "よさん",
    "romaji": "yosan"
  },
  "予約": {
    "kana": "よやく",
    "romaji": "yoyaku"
  },
  "予見": {
    "kana": "よけん",
    "romaji": "yoken"
  },
  "予防": {
    "kana": "よぼう",
    "romaji": "yobou"
  },
  "事例": {
    "kana": "じれい",
    "romaji": "jirei"
  },
  "事前": {
    "kana": "じぜん",
    "romaji": "jizen"
  },
  "事実": {
    "kana": "じじつ",
    "romaji": "jijitsu"
  },
  "事情": {
    "kana": "じじょう",
    "romaji": "jijou"
  },
  "事態": {
    "kana": "じたい",
    "romaji": "jitai"
  },
  "事故": {
    "kana": "じこ",
    "romaji": "jiko"
  },
  "事象": {
    "kana": "じしょう",
    "romaji": "jishou"
  },
  "二つ": {
    "kana": "ふたつ",
    "romaji": "futatsu"
  },
  "二人": {
    "kana": "ふたり",
    "romaji": "futari"
  },
  "二個": {
    "kana": "にこ",
    "romaji": "niko"
  },
  "二冊": {
    "kana": "にさつ",
    "romaji": "nisatsu"
  },
  "二分": {
    "kana": "にふん",
    "romaji": "nifun"
  },
  "二匹": {
    "kana": "にひき",
    "romaji": "nihiki"
  },
  "二回": {
    "kana": "にかい",
    "romaji": "nikai"
  },
  "二年": {
    "kana": "にねん",
    "romaji": "ninen"
  },
  "二才": {
    "kana": "にさい",
    "romaji": "nisai"
  },
  "二日": {
    "kana": "ふつか",
    "romaji": "futsuka"
  },
  "二時": {
    "kana": "にじ",
    "romaji": "niji"
  },
  "二月": {
    "kana": "にがつ",
    "romaji": "nigatsu"
  },
  "二本": {
    "kana": "にほん",
    "romaji": "nihon"
  },
  "二枚": {
    "kana": "にまい",
    "romaji": "nimai"
  },
  "二歳": {
    "kana": "にさい",
    "romaji": "nisai"
  },
  "二番": {
    "kana": "にばん",
    "romaji": "niban"
  },
  "二階": {
    "kana": "にかい",
    "romaji": "nikai"
  },
  "五つ": {
    "kana": "いつつ",
    "romaji": "itsutsu"
  },
  "五人": {
    "kana": "ごにん",
    "romaji": "gonin"
  },
  "五個": {
    "kana": "ごこ",
    "romaji": "goko"
  },
  "五冊": {
    "kana": "ごさつ",
    "romaji": "gosatsu"
  },
  "五分": {
    "kana": "ごぶ",
    "romaji": "gobu"
  },
  "五匹": {
    "kana": "ごひき",
    "romaji": "gohiki"
  },
  "五十": {
    "kana": "ごじゅう",
    "romaji": "gojuu"
  },
  "五回": {
    "kana": "ごかい",
    "romaji": "gokai"
  },
  "五年": {
    "kana": "ごねん",
    "romaji": "gonen"
  },
  "五才": {
    "kana": "ごさい",
    "romaji": "gosai"
  },
  "五日": {
    "kana": "いつか",
    "romaji": "itsuka"
  },
  "五時": {
    "kana": "ごじ",
    "romaji": "goji"
  },
  "五月": {
    "kana": "ごがつ",
    "romaji": "gogatsu"
  },
  "五本": {
    "kana": "ごほん",
    "romaji": "gohon"
  },
  "五枚": {
    "kana": "ごまい",
    "romaji": "gomai"
  },
  "五歳": {
    "kana": "ごさい",
    "romaji": "gosai"
  },
  "五階": {
    "kana": "ごかい",
    "romaji": "gokai"
  },
  "交代": {
    "kana": "こうたい",
    "romaji": "koutai"
  },
  "交換": {
    "kana": "こうかん",
    "romaji": "koukan"
  },
  "交流": {
    "kana": "こうりゅう",
    "romaji": "kouryuu"
  },
  "交渉": {
    "kana": "こうしょう",
    "romaji": "koushou"
  },
  "交番": {
    "kana": "こうばん",
    "romaji": "kouban"
  },
  "享受": {
    "kana": "きょうじゅ",
    "romaji": "kyouju"
  },
  "京都": {
    "kana": "きょうと",
    "romaji": "Kyouto"
  },
  "人々": {
    "kana": "ひとびと",
    "romaji": "hitobito"
  },
  "人前": {
    "kana": "ひとまえ",
    "romaji": "hitomae"
  },
  "人参": {
    "kana": "にんじん",
    "romaji": "ninjin"
  },
  "人口": {
    "kana": "じんこう",
    "romaji": "jinkou"
  },
  "人員": {
    "kana": "じんいん",
    "romaji": "jin'in"
  },
  "人形": {
    "kana": "にんぎょう",
    "romaji": "ningyou"
  },
  "人手": {
    "kana": "ひとで",
    "romaji": "hitode"
  },
  "人数": {
    "kana": "にんずう",
    "romaji": "ninzuu"
  },
  "人材": {
    "kana": "じんざい",
    "romaji": "jinzai"
  },
  "人気": {
    "kana": "にんき",
    "romaji": "ninki"
  },
  "人物": {
    "kana": "じんぶつ",
    "romaji": "jinbutsu"
  },
  "人間": {
    "kana": "にんげん",
    "romaji": "ningen"
  },
  "今回": {
    "kana": "こんかい",
    "romaji": "konkai"
  },
  "今年": {
    "kana": "ことし",
    "romaji": "kotoshi"
  },
  "今度": {
    "kana": "こんど",
    "romaji": "kondo"
  },
  "今後": {
    "kana": "こんご",
    "romaji": "kongo"
  },
  "今日": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "今晩": {
    "kana": "こんばん",
    "romaji": "konban"
  },
  "今月": {
    "kana": "こんげつ",
    "romaji": "kongetsu"
  },
  "今朝": {
    "kana": "けさ",
    "romaji": "kesa"
  },
  "今期": {
    "kana": "こんき",
    "romaji": "konki"
  },
  "今週": {
    "kana": "こんしゅう",
    "romaji": "konshuu"
  },
  "介入": {
    "kana": "かいにゅう",
    "romaji": "kainyuu"
  },
  "仕上": {
    "kana": "しあげ",
    "romaji": "shiage"
  },
  "仕事": {
    "kana": "しごと",
    "romaji": "shigoto"
  },
  "仕切": {
    "kana": "しきり",
    "romaji": "shikiri"
  },
  "仕方": {
    "kana": "しかた",
    "romaji": "shikata"
  },
  "仕組": {
    "kana": "しくみ",
    "romaji": "shikumi"
  },
  "仕込": {
    "kana": "しこみ",
    "romaji": "shi komi"
  },
  "他人": {
    "kana": "たにん",
    "romaji": "tanin"
  },
  "他社": {
    "kana": "たしゃ",
    "romaji": "tasha"
  },
  "付く": {
    "kana": "つく",
    "romaji": "tsuku"
  },
  "付録": {
    "kana": "ふろく",
    "romaji": "furoku"
  },
  "代物": {
    "kana": "しろもの",
    "romaji": "shiromono"
  },
  "以上": {
    "kana": "いじょう",
    "romaji": "ijou"
  },
  "以前": {
    "kana": "いぜん",
    "romaji": "izen"
  },
  "以外": {
    "kana": "いがい",
    "romaji": "igai"
  },
  "仮説": {
    "kana": "かせつ",
    "romaji": "kasetsu"
  },
  "仲介": {
    "kana": "ちゅうかい",
    "romaji": "chuukai"
  },
  "企業": {
    "kana": "きぎょう",
    "romaji": "kigyou"
  },
  "企画": {
    "kana": "きかく",
    "romaji": "kikaku"
  },
  "休み": {
    "kana": "やすみ",
    "romaji": "yasumi"
  },
  "休む": {
    "kana": "やすむ",
    "romaji": "yasumu"
  },
  "休憩": {
    "kana": "きゅうけい",
    "romaji": "kyuukei"
  },
  "休日": {
    "kana": "きゅうじつ",
    "romaji": "kyuujitsu"
  },
  "休暇": {
    "kana": "きゅうか",
    "romaji": "kyuuka"
  },
  "会う": {
    "kana": "あう",
    "romaji": "au"
  },
  "会場": {
    "kana": "かいじょう",
    "romaji": "kaijou"
  },
  "会社": {
    "kana": "かいしゃ",
    "romaji": "kaisha"
  },
  "会話": {
    "kana": "かいわ",
    "romaji": "kaiwa"
  },
  "会議": {
    "kana": "かいぎ",
    "romaji": "kaigi"
  },
  "伝票": {
    "kana": "でんぴょう",
    "romaji": "denpyou"
  },
  "伝統": {
    "kana": "でんとう",
    "romaji": "dentou"
  },
  "伝言": {
    "kana": "でんごん",
    "romaji": "dengon"
  },
  "伝達": {
    "kana": "でんたつ",
    "romaji": "dentatsu"
  },
  "伴う": {
    "kana": "ともなう",
    "romaji": "tomonau"
  },
  "位置": {
    "kana": "いち",
    "romaji": "ichi"
  },
  "低い": {
    "kana": "ひくい",
    "romaji": "hikui"
  },
  "低下": {
    "kana": "ていか",
    "romaji": "teika"
  },
  "低俗": {
    "kana": "ていぞく",
    "romaji": "teizoku"
  },
  "低廉": {
    "kana": "ていれん",
    "romaji": "teiren"
  },
  "住む": {
    "kana": "すむ",
    "romaji": "sumu"
  },
  "住宅": {
    "kana": "じゅうたく",
    "romaji": "juutaku"
  },
  "住所": {
    "kana": "じゅうしょ",
    "romaji": "juusho"
  },
  "住民": {
    "kana": "じゅうみん",
    "romaji": "juumin"
  },
  "佐藤": {
    "kana": "さとう",
    "romaji": "satou"
  },
  "体制": {
    "kana": "たいせい",
    "romaji": "taisei"
  },
  "体力": {
    "kana": "たいりょく",
    "romaji": "tairyoku"
  },
  "体得": {
    "kana": "たいとく",
    "romaji": "taitoku"
  },
  "体調": {
    "kana": "たいちょう",
    "romaji": "taichou"
  },
  "体質": {
    "kana": "たいしつ",
    "romaji": "taishitsu"
  },
  "体重": {
    "kana": "たいじゅう",
    "romaji": "taijuu"
  },
  "体験": {
    "kana": "たいけん",
    "romaji": "taiken"
  },
  "何に": {
    "kana": "なにに",
    "romaji": "nani ni"
  },
  "何を": {
    "kana": "なにを",
    "romaji": "nani o"
  },
  "何人": {
    "kana": "なんにん",
    "romaji": "nannin"
  },
  "何分": {
    "kana": "なんぷん",
    "romaji": "nanpun"
  },
  "何回": {
    "kana": "なんかい",
    "romaji": "nankai"
  },
  "何度": {
    "kana": "なんど",
    "romaji": "nando"
  },
  "何故": {
    "kana": "なぜ",
    "romaji": "naze"
  },
  "何日": {
    "kana": "なんにち",
    "romaji": "nannichi"
  },
  "何時": {
    "kana": "なんじ",
    "romaji": "nanji"
  },
  "何月": {
    "kana": "なんがつ",
    "romaji": "nangatsu"
  },
  "何本": {
    "kana": "なんぼん",
    "romaji": "nanbon"
  },
  "何枚": {
    "kana": "なんまい",
    "romaji": "nanmai"
  },
  "何歳": {
    "kana": "なんさい",
    "romaji": "nansai"
  },
  "余儀": {
    "kana": "よぎ",
    "romaji": "yogi"
  },
  "余分": {
    "kana": "よぶん",
    "romaji": "yobun"
  },
  "余地": {
    "kana": "よち",
    "romaji": "yochi"
  },
  "余白": {
    "kana": "よはく",
    "romaji": "yohaku"
  },
  "余計": {
    "kana": "よけい",
    "romaji": "yokei"
  },
  "余韻": {
    "kana": "よいん",
    "romaji": "yoin"
  },
  "作る": {
    "kana": "つくる",
    "romaji": "tsukuru"
  },
  "作品": {
    "kana": "さくひん",
    "romaji": "sakuhin"
  },
  "作成": {
    "kana": "さくせい",
    "romaji": "sakusei"
  },
  "作業": {
    "kana": "さぎょう",
    "romaji": "sagyou"
  },
  "作物": {
    "kana": "さくもつ",
    "romaji": "sakumotsu"
  },
  "作用": {
    "kana": "さよう",
    "romaji": "sayou"
  },
  "併設": {
    "kana": "へいせつ",
    "romaji": "heisetsu"
  },
  "使う": {
    "kana": "つかう",
    "romaji": "tsukau"
  },
  "使命": {
    "kana": "しめい",
    "romaji": "shimei"
  },
  "使用": {
    "kana": "しよう",
    "romaji": "shiyou"
  },
  "例外": {
    "kana": "れいがい",
    "romaji": "reigai"
  },
  "例年": {
    "kana": "れいねん",
    "romaji": "reinen"
  },
  "供給": {
    "kana": "きょうきゅう",
    "romaji": "kyoukyuu"
  },
  "依存": {
    "kana": "いぞん",
    "romaji": "izon"
  },
  "依拠": {
    "kana": "いきょ",
    "romaji": "ikyo"
  },
  "依然": {
    "kana": "いぜん",
    "romaji": "izen"
  },
  "依頼": {
    "kana": "いらい",
    "romaji": "irai"
  },
  "価値": {
    "kana": "かち",
    "romaji": "kachi"
  },
  "価格": {
    "kana": "かかく",
    "romaji": "kakaku"
  },
  "便利": {
    "kana": "べんり",
    "romaji": "benri"
  },
  "便数": {
    "kana": "びんすう",
    "romaji": "binsuu"
  },
  "便益": {
    "kana": "べんえき",
    "romaji": "ben'eki"
  },
  "促す": {
    "kana": "うながす",
    "romaji": "unagasu"
  },
  "保存": {
    "kana": "ほぞん",
    "romaji": "hozon"
  },
  "保持": {
    "kana": "ほじ",
    "romaji": "hoji"
  },
  "保有": {
    "kana": "ほゆう",
    "romaji": "hoyuu"
  },
  "保管": {
    "kana": "ほかん",
    "romaji": "hokan"
  },
  "保護": {
    "kana": "ほご",
    "romaji": "hogo"
  },
  "保身": {
    "kana": "ほしん",
    "romaji": "hoshin"
  },
  "信号": {
    "kana": "しんごう",
    "romaji": "shingou"
  },
  "信用": {
    "kana": "しんよう",
    "romaji": "shinyou"
  },
  "信頼": {
    "kana": "しんらい",
    "romaji": "shinrai"
  },
  "修正": {
    "kana": "しゅうせい",
    "romaji": "shuusei"
  },
  "修理": {
    "kana": "しゅうり",
    "romaji": "shuuri"
  },
  "修繕": {
    "kana": "しゅうぜん",
    "romaji": "shuuzen"
  },
  "俯瞰": {
    "kana": "ふかん",
    "romaji": "fukan"
  },
  "倉庫": {
    "kana": "そうこ",
    "romaji": "souko"
  },
  "個々": {
    "kana": "ここ",
    "romaji": "koko"
  },
  "個人": {
    "kana": "こじん",
    "romaji": "kojin"
  },
  "倍増": {
    "kana": "ばいぞう",
    "romaji": "baizou"
  },
  "倒す": {
    "kana": "たおす",
    "romaji": "taosu"
  },
  "値上": {
    "kana": "ねあげ",
    "romaji": "neage"
  },
  "値下": {
    "kana": "ねさげ",
    "romaji": "nesage"
  },
  "値動": {
    "kana": "あたいどう",
    "romaji": "atai dou"
  },
  "値引": {
    "kana": "ねびき",
    "romaji": "nebiki"
  },
  "値札": {
    "kana": "ねふだ",
    "romaji": "nefuda"
  },
  "値段": {
    "kana": "ねだん",
    "romaji": "nedan"
  },
  "偏在": {
    "kana": "へんざい",
    "romaji": "henzai"
  },
  "偏見": {
    "kana": "へんけん",
    "romaji": "henken"
  },
  "健全": {
    "kana": "けんぜん",
    "romaji": "kenzen"
  },
  "健太": {
    "kana": "けんた",
    "romaji": "Keita"
  },
  "健康": {
    "kana": "けんこう",
    "romaji": "kenkou"
  },
  "健診": {
    "kana": "けんしん",
    "romaji": "kenshin"
  },
  "催事": {
    "kana": "さいじ",
    "romaji": "saiji"
  },
  "傾向": {
    "kana": "けいこう",
    "romaji": "keikou"
  },
  "働く": {
    "kana": "はたらく",
    "romaji": "hataraku"
  },
  "優先": {
    "kana": "ゆうせん",
    "romaji": "yuusen"
  },
  "元気": {
    "kana": "げんき",
    "romaji": "genki"
  },
  "兄弟": {
    "kana": "きょうだい",
    "romaji": "kyoudai"
  },
  "兆候": {
    "kana": "ちょうこう",
    "romaji": "choukou"
  },
  "先に": {
    "kana": "さきに",
    "romaji": "saki ni"
  },
  "先例": {
    "kana": "せんれい",
    "romaji": "senrei"
  },
  "先手": {
    "kana": "せんて",
    "romaji": "sente"
  },
  "先方": {
    "kana": "せんぽう",
    "romaji": "senpou"
  },
  "先日": {
    "kana": "せんじつ",
    "romaji": "senjitsu"
  },
  "先月": {
    "kana": "せんげつ",
    "romaji": "sengetsu"
  },
  "先生": {
    "kana": "せんせい",
    "romaji": "sensei"
  },
  "先行": {
    "kana": "せんこう",
    "romaji": "senkou"
  },
  "先輩": {
    "kana": "せんぱい",
    "romaji": "senpai"
  },
  "先週": {
    "kana": "せんしゅう",
    "romaji": "senshuu"
  },
  "光る": {
    "kana": "ひかる",
    "romaji": "hikaru"
  },
  "光景": {
    "kana": "こうけい",
    "romaji": "koukei"
  },
  "光栄": {
    "kana": "こうえい",
    "romaji": "kouei"
  },
  "克明": {
    "kana": "こくめい",
    "romaji": "kokumei"
  },
  "免許": {
    "kana": "めんきょ",
    "romaji": "menkyo"
  },
  "免除": {
    "kana": "めんじょ",
    "romaji": "menjo"
  },
  "入る": {
    "kana": "はいる",
    "romaji": "hairu"
  },
  "入力": {
    "kana": "にゅうりょく",
    "romaji": "nyuuryoku"
  },
  "入口": {
    "kana": "いりぐち",
    "romaji": "iriguchi"
  },
  "入学": {
    "kana": "にゅうがく",
    "romaji": "nyuugaku"
  },
  "入院": {
    "kana": "にゅういん",
    "romaji": "nyuuin"
  },
  "全体": {
    "kana": "ぜんたい",
    "romaji": "zentai"
  },
  "全力": {
    "kana": "ぜんりょく",
    "romaji": "zenryoku"
  },
  "全員": {
    "kana": "ぜんいん",
    "romaji": "zen'in"
  },
  "全国": {
    "kana": "ぜんこく",
    "romaji": "zenkoku"
  },
  "全然": {
    "kana": "ぜんぜん",
    "romaji": "zenzen"
  },
  "全部": {
    "kana": "ぜんぶ",
    "romaji": "zenbu"
  },
  "八つ": {
    "kana": "やっつ",
    "romaji": "yattsu"
  },
  "八人": {
    "kana": "はちにん",
    "romaji": "hachinin"
  },
  "八個": {
    "kana": "はっこ",
    "romaji": "hakko"
  },
  "八冊": {
    "kana": "はっさつ",
    "romaji": "hassatsu"
  },
  "八分": {
    "kana": "はっぷん",
    "romaji": "happun"
  },
  "八匹": {
    "kana": "はっぴき",
    "romaji": "happiki"
  },
  "八回": {
    "kana": "はっかい",
    "romaji": "hakkai"
  },
  "八年": {
    "kana": "はちねん",
    "romaji": "hachinen"
  },
  "八才": {
    "kana": "はっさい",
    "romaji": "hassai"
  },
  "八日": {
    "kana": "ようか",
    "romaji": "youka"
  },
  "八時": {
    "kana": "はちとき",
    "romaji": "hachi toki"
  },
  "八月": {
    "kana": "はちがつ",
    "romaji": "hachigatsu"
  },
  "八本": {
    "kana": "はっぽん",
    "romaji": "happon"
  },
  "八歳": {
    "kana": "はっさい",
    "romaji": "hassai"
  },
  "八階": {
    "kana": "はっかい",
    "romaji": "hakkai"
  },
  "公園": {
    "kana": "こうえん",
    "romaji": "kouen"
  },
  "公平": {
    "kana": "こうへい",
    "romaji": "kouhei"
  },
  "公正": {
    "kana": "こうせい",
    "romaji": "kousei"
  },
  "公的": {
    "kana": "こうてき",
    "romaji": "kouteki"
  },
  "公表": {
    "kana": "こうひょう",
    "romaji": "kouhyou"
  },
  "公開": {
    "kana": "こうかい",
    "romaji": "koukai"
  },
  "六つ": {
    "kana": "むっつ",
    "romaji": "muttsu"
  },
  "六人": {
    "kana": "ろくにん",
    "romaji": "rokunin"
  },
  "六個": {
    "kana": "ろっこ",
    "romaji": "rokko"
  },
  "六冊": {
    "kana": "ろくさつ",
    "romaji": "rokusatsu"
  },
  "六分": {
    "kana": "ろっぷん",
    "romaji": "roppun"
  },
  "六匹": {
    "kana": "ろっぴき",
    "romaji": "roppiki"
  },
  "六回": {
    "kana": "ろっかい",
    "romaji": "rokkai"
  },
  "六年": {
    "kana": "ろくねん",
    "romaji": "rokunen"
  },
  "六才": {
    "kana": "ろくさい",
    "romaji": "rokusai"
  },
  "六日": {
    "kana": "むいか",
    "romaji": "muika"
  },
  "六時": {
    "kana": "ろくとき",
    "romaji": "roku toki"
  },
  "六月": {
    "kana": "ろくがつ",
    "romaji": "rokugatsu"
  },
  "六本": {
    "kana": "ろっぽん",
    "romaji": "roppon"
  },
  "六歳": {
    "kana": "ろくさい",
    "romaji": "rokusai"
  },
  "六階": {
    "kana": "ろっかい",
    "romaji": "rokkai"
  },
  "共同": {
    "kana": "きょうどう",
    "romaji": "kyoudou"
  },
  "共存": {
    "kana": "きょうぞん",
    "romaji": "kyouzon"
  },
  "共有": {
    "kana": "きょうゆう",
    "romaji": "kyouyuu"
  },
  "共用": {
    "kana": "きょうよう",
    "romaji": "kyouyou"
  },
  "具材": {
    "kana": "ぐざい",
    "romaji": "guzai"
  },
  "内側": {
    "kana": "うちがわ",
    "romaji": "uchigawa"
  },
  "内容": {
    "kana": "ないよう",
    "romaji": "naiyou"
  },
  "内装": {
    "kana": "ないそう",
    "romaji": "naisou"
  },
  "内部": {
    "kana": "ないぶ",
    "romaji": "naibu"
  },
  "円滑": {
    "kana": "えんかつ",
    "romaji": "enkatsu"
  },
  "冊子": {
    "kana": "さっし",
    "romaji": "sasshi"
  },
  "再会": {
    "kana": "さいかい",
    "romaji": "saikai"
  },
  "再現": {
    "kana": "さいげん",
    "romaji": "saigen"
  },
  "再生": {
    "kana": "さいせい",
    "romaji": "saisei"
  },
  "冒頭": {
    "kana": "ぼうとう",
    "romaji": "boutou"
  },
  "最も": {
    "kana": "もっとも",
    "romaji": "mottomo"
  },
  "最中": {
    "kana": "さいちゅう",
    "romaji": "saichuu"
  },
  "最初": {
    "kana": "さいしょ",
    "romaji": "saisho"
  },
  "最大": {
    "kana": "さいだい",
    "romaji": "saidai"
  },
  "最後": {
    "kana": "さいご",
    "romaji": "saigo"
  },
  "最新": {
    "kana": "さいしん",
    "romaji": "saishin"
  },
  "最終": {
    "kana": "さいしゅう",
    "romaji": "saishuu"
  },
  "最近": {
    "kana": "さいきん",
    "romaji": "saikin"
  },
  "冗談": {
    "kana": "じょうだん",
    "romaji": "joudan"
  },
  "写真": {
    "kana": "しゃしん",
    "romaji": "shashin"
  },
  "冠水": {
    "kana": "かんすい",
    "romaji": "kansui"
  },
  "冬季": {
    "kana": "とうき",
    "romaji": "touki"
  },
  "冷房": {
    "kana": "れいぼう",
    "romaji": "reibou"
  },
  "冷静": {
    "kana": "れいせい",
    "romaji": "reisei"
  },
  "凄い": {
    "kana": "すごい",
    "romaji": "sugoi"
  },
  "処分": {
    "kana": "しょぶん",
    "romaji": "shobun"
  },
  "処理": {
    "kana": "しょり",
    "romaji": "shori"
  },
  "出す": {
    "kana": "だす",
    "romaji": "dasu"
  },
  "出た": {
    "kana": "でた",
    "romaji": "deta"
  },
  "出る": {
    "kana": "でる",
    "romaji": "deru"
  },
  "出世": {
    "kana": "しゅっせ",
    "romaji": "shusse"
  },
  "出会": {
    "kana": "であい",
    "romaji": "deai"
  },
  "出口": {
    "kana": "でぐち",
    "romaji": "deguchi"
  },
  "出始": {
    "kana": "しゅつし",
    "romaji": "shutsu shi"
  },
  "出席": {
    "kana": "しゅっせき",
    "romaji": "shusseki"
  },
  "出所": {
    "kana": "しゅっしょ",
    "romaji": "shussho"
  },
  "出現": {
    "kana": "しゅつげん",
    "romaji": "shutsugen"
  },
  "出発": {
    "kana": "しゅっぱつ",
    "romaji": "shuppatsu"
  },
  "出社": {
    "kana": "しゅっしゃ",
    "romaji": "shussha"
  },
  "出費": {
    "kana": "しゅっぴ",
    "romaji": "shuppi"
  },
  "分前": {
    "kana": "ふんまえ",
    "romaji": "funmae"
  },
  "分厚": {
    "kana": "ふんあつし",
    "romaji": "fun atsushi"
  },
  "分析": {
    "kana": "ぶんせき",
    "romaji": "bunseki"
  },
  "分野": {
    "kana": "ぶんや",
    "romaji": "bunya"
  },
  "切る": {
    "kana": "きる",
    "romaji": "kiru"
  },
  "切実": {
    "kana": "せつじつ",
    "romaji": "setsujitsu"
  },
  "切手": {
    "kana": "きって",
    "romaji": "kitte"
  },
  "切符": {
    "kana": "きっぷ",
    "romaji": "kippu"
  },
  "初回": {
    "kana": "しょかい",
    "romaji": "shokai"
  },
  "初夏": {
    "kana": "しょか",
    "romaji": "shoka"
  },
  "初期": {
    "kana": "しょき",
    "romaji": "shoki"
  },
  "判例": {
    "kana": "はんれい",
    "romaji": "hanrei"
  },
  "判定": {
    "kana": "はんてい",
    "romaji": "hantei"
  },
  "判断": {
    "kana": "はんだん",
    "romaji": "handan"
  },
  "判決": {
    "kana": "はんけつ",
    "romaji": "hanketsu"
  },
  "別々": {
    "kana": "べつべつ",
    "romaji": "betsubetsu"
  },
  "別の": {
    "kana": "べつの",
    "romaji": "betsu no"
  },
  "別送": {
    "kana": "べっそう",
    "romaji": "bessou"
  },
  "利点": {
    "kana": "りてん",
    "romaji": "riten"
  },
  "利用": {
    "kana": "りよう",
    "romaji": "riyou"
  },
  "利益": {
    "kana": "りえき",
    "romaji": "rieki"
  },
  "到底": {
    "kana": "とうてい",
    "romaji": "toutei"
  },
  "到着": {
    "kana": "とうちゃく",
    "romaji": "touchaku"
  },
  "制度": {
    "kana": "せいど",
    "romaji": "seido"
  },
  "制服": {
    "kana": "せいふく",
    "romaji": "seifuku"
  },
  "刷新": {
    "kana": "さっしん",
    "romaji": "sasshin"
  },
  "刺激": {
    "kana": "しげき",
    "romaji": "shigeki"
  },
  "刺身": {
    "kana": "さしみ",
    "romaji": "sashimi"
  },
  "削減": {
    "kana": "さくげん",
    "romaji": "sakugen"
  },
  "前倒": {
    "kana": "まえとう",
    "romaji": "mae tou"
  },
  "前向": {
    "kana": "ぜんこう",
    "romaji": "zenkou"
  },
  "前提": {
    "kana": "ぜんてい",
    "romaji": "zentei"
  },
  "前日": {
    "kana": "ぜんじつ",
    "romaji": "zenjitsu"
  },
  "割合": {
    "kana": "わりあい",
    "romaji": "wariai"
  },
  "割引": {
    "kana": "わりびき",
    "romaji": "waribiki"
  },
  "劇的": {
    "kana": "げきてき",
    "romaji": "gekiteki"
  },
  "力量": {
    "kana": "りきりょう",
    "romaji": "rikiryou"
  },
  "功績": {
    "kana": "こうせき",
    "romaji": "kouseki"
  },
  "加減": {
    "kana": "かげん",
    "romaji": "kagen"
  },
  "加算": {
    "kana": "かさん",
    "romaji": "kasan"
  },
  "劣化": {
    "kana": "れっか",
    "romaji": "rekka"
  },
  "助長": {
    "kana": "じょちょう",
    "romaji": "jochou"
  },
  "努力": {
    "kana": "どりょく",
    "romaji": "doryoku"
  },
  "労働": {
    "kana": "ろうどう",
    "romaji": "roudou"
  },
  "効く": {
    "kana": "きく",
    "romaji": "kiku"
  },
  "効果": {
    "kana": "こうか",
    "romaji": "kouka"
  },
  "効率": {
    "kana": "こうりつ",
    "romaji": "kouritsu"
  },
  "勉強": {
    "kana": "べんきょう",
    "romaji": "benkyou"
  },
  "動く": {
    "kana": "うごく",
    "romaji": "ugoku"
  },
  "動作": {
    "kana": "どうさ",
    "romaji": "dousa"
  },
  "動画": {
    "kana": "どうが",
    "romaji": "douga"
  },
  "動詞": {
    "kana": "どうし",
    "romaji": "doushi"
  },
  "勘所": {
    "kana": "かんどころ",
    "romaji": "kandokoro"
  },
  "勝手": {
    "kana": "かって",
    "romaji": "katte"
  },
  "勝者": {
    "kana": "しょうしゃ",
    "romaji": "shousha"
  },
  "募集": {
    "kana": "ぼしゅう",
    "romaji": "boshuu"
  },
  "匂い": {
    "kana": "におい",
    "romaji": "nioi"
  },
  "包む": {
    "kana": "つつむ",
    "romaji": "tsutsumu"
  },
  "北陸": {
    "kana": "ほくりく",
    "romaji": "hokuriku"
  },
  "区域": {
    "kana": "くいき",
    "romaji": "kuiki"
  },
  "医師": {
    "kana": "いし",
    "romaji": "ishi"
  },
  "医者": {
    "kana": "いしゃ",
    "romaji": "isha"
  },
  "十人": {
    "kana": "じゅうにん",
    "romaji": "juunin"
  },
  "十個": {
    "kana": "じゅっこ",
    "romaji": "jukko"
  },
  "十冊": {
    "kana": "じゅっさつ",
    "romaji": "jussatsu"
  },
  "十分": {
    "kana": "じゅうぶん",
    "romaji": "juubun"
  },
  "十匹": {
    "kana": "じゅっぴき",
    "romaji": "juppiki"
  },
  "十回": {
    "kana": "じゅっかい",
    "romaji": "jukkai"
  },
  "十年": {
    "kana": "じゅうねん",
    "romaji": "juunen"
  },
  "十才": {
    "kana": "じゅっさい",
    "romaji": "jussai"
  },
  "十日": {
    "kana": "とおか",
    "romaji": "tooka"
  },
  "十時": {
    "kana": "ととき",
    "romaji": "totoki"
  },
  "十月": {
    "kana": "じゅうがつ",
    "romaji": "juugatsu"
  },
  "十本": {
    "kana": "じゅっぽん",
    "romaji": "juppon"
  },
  "十歳": {
    "kana": "じゅっさい",
    "romaji": "jussai"
  },
  "十階": {
    "kana": "じゅっかい",
    "romaji": "jukkai"
  },
  "千円": {
    "kana": "せんえん",
    "romaji": "sen'en"
  },
  "千年": {
    "kana": "せんねん",
    "romaji": "sennen"
  },
  "午前": {
    "kana": "ごぜん",
    "romaji": "gozen"
  },
  "午後": {
    "kana": "ごご",
    "romaji": "gogo"
  },
  "半分": {
    "kana": "はんぶん",
    "romaji": "hanbun"
  },
  "半年": {
    "kana": "はんとし",
    "romaji": "hantoshi"
  },
  "卒業": {
    "kana": "そつぎょう",
    "romaji": "sotsugyou"
  },
  "協働": {
    "kana": "きょうどう",
    "romaji": "kyoudou"
  },
  "協力": {
    "kana": "きょうりょく",
    "romaji": "kyouryoku"
  },
  "協議": {
    "kana": "きょうぎ",
    "romaji": "kyougi"
  },
  "南口": {
    "kana": "みなみぐち",
    "romaji": "minamiguchi"
  },
  "南瓜": {
    "kana": "かぼちゃ",
    "romaji": "kabocha"
  },
  "単一": {
    "kana": "たんいつ",
    "romaji": "tan'itsu"
  },
  "単体": {
    "kana": "たんたい",
    "romaji": "tantai"
  },
  "単価": {
    "kana": "たんか",
    "romaji": "tanka"
  },
  "単独": {
    "kana": "たんどく",
    "romaji": "tandoku"
  },
  "単発": {
    "kana": "たんぱつ",
    "romaji": "tanpatsu"
  },
  "単純": {
    "kana": "たんじゅん",
    "romaji": "tanjun"
  },
  "単語": {
    "kana": "たんご",
    "romaji": "tango"
  },
  "印刷": {
    "kana": "いんさつ",
    "romaji": "insatsu"
  },
  "危惧": {
    "kana": "きぐ",
    "romaji": "kigu"
  },
  "危機": {
    "kana": "きき",
    "romaji": "kiki"
  },
  "危険": {
    "kana": "きけん",
    "romaji": "kiken"
  },
  "却下": {
    "kana": "きゃっか",
    "romaji": "kyakka"
  },
  "厚情": {
    "kana": "こうじょう",
    "romaji": "koujou"
  },
  "原作": {
    "kana": "げんさく",
    "romaji": "gensaku"
  },
  "原則": {
    "kana": "げんそく",
    "romaji": "gensoku"
  },
  "原因": {
    "kana": "げんいん",
    "romaji": "gen'in"
  },
  "原文": {
    "kana": "げんぶん",
    "romaji": "genbun"
  },
  "原料": {
    "kana": "げんりょう",
    "romaji": "genryou"
  },
  "原本": {
    "kana": "げんぽん",
    "romaji": "genpon"
  },
  "原稿": {
    "kana": "げんこう",
    "romaji": "genkou"
  },
  "厳密": {
    "kana": "げんみつ",
    "romaji": "genmitsu"
  },
  "厳格": {
    "kana": "げんかく",
    "romaji": "genkaku"
  },
  "厳正": {
    "kana": "げんせい",
    "romaji": "gensei"
  },
  "去年": {
    "kana": "きょねん",
    "romaji": "kyonen"
  },
  "参加": {
    "kana": "さんか",
    "romaji": "sanka"
  },
  "参照": {
    "kana": "さんしょう",
    "romaji": "sanshou"
  },
  "友人": {
    "kana": "ゆうじん",
    "romaji": "yuujin"
  },
  "友達": {
    "kana": "ともだち",
    "romaji": "tomodachi"
  },
  "双子": {
    "kana": "ふたご",
    "romaji": "futago"
  },
  "双方": {
    "kana": "そうほう",
    "romaji": "souhou"
  },
  "反対": {
    "kana": "はんたい",
    "romaji": "hantai"
  },
  "反復": {
    "kana": "はんぷく",
    "romaji": "hanpuku"
  },
  "反応": {
    "kana": "はんのう",
    "romaji": "hannou"
  },
  "反映": {
    "kana": "はんえい",
    "romaji": "han'ei"
  },
  "反省": {
    "kana": "はんせい",
    "romaji": "hansei"
  },
  "反証": {
    "kana": "はんしょう",
    "romaji": "hanshou"
  },
  "反論": {
    "kana": "はんろん",
    "romaji": "hanron"
  },
  "反面": {
    "kana": "はんめん",
    "romaji": "hanmen"
  },
  "収入": {
    "kana": "しゅうにゅう",
    "romaji": "shuunyuu"
  },
  "収益": {
    "kana": "しゅうえき",
    "romaji": "shuueki"
  },
  "収穫": {
    "kana": "しゅうかく",
    "romaji": "shuukaku"
  },
  "収蔵": {
    "kana": "しゅうぞう",
    "romaji": "shuuzou"
  },
  "叔母": {
    "kana": "おば",
    "romaji": "oba"
  },
  "叔父": {
    "kana": "おじ",
    "romaji": "oji"
  },
  "取引": {
    "kana": "とりひき",
    "romaji": "torihiki"
  },
  "受付": {
    "kana": "うけつけ",
    "romaji": "uketsuke"
  },
  "受診": {
    "kana": "じゅしん",
    "romaji": "jushin"
  },
  "口実": {
    "kana": "こうじつ",
    "romaji": "koujitsu"
  },
  "口語": {
    "kana": "こうご",
    "romaji": "kougo"
  },
  "古い": {
    "kana": "ふるい",
    "romaji": "furui"
  },
  "古風": {
    "kana": "こふう",
    "romaji": "kofuu"
  },
  "叩く": {
    "kana": "たたく",
    "romaji": "tataku"
  },
  "叩け": {
    "kana": "たたけ",
    "romaji": "tatake"
  },
  "叫ぶ": {
    "kana": "さけぶ",
    "romaji": "sakebu"
  },
  "台所": {
    "kana": "だいどころ",
    "romaji": "daidokoro"
  },
  "台風": {
    "kana": "たいふう",
    "romaji": "taifuu"
  },
  "史実": {
    "kana": "しじつ",
    "romaji": "shijitsu"
  },
  "史料": {
    "kana": "しりょう",
    "romaji": "shiryou"
  },
  "司会": {
    "kana": "しかい",
    "romaji": "shikai"
  },
  "司法": {
    "kana": "しほう",
    "romaji": "shihou"
  },
  "各国": {
    "kana": "かっこく",
    "romaji": "kakkoku"
  },
  "各地": {
    "kana": "かくち",
    "romaji": "kakuchi"
  },
  "合う": {
    "kana": "あう",
    "romaji": "au"
  },
  "合併": {
    "kana": "がっぺい",
    "romaji": "gappei"
  },
  "合否": {
    "kana": "ごうひ",
    "romaji": "gouhi"
  },
  "合宿": {
    "kana": "がっしゅく",
    "romaji": "gasshuku"
  },
  "合意": {
    "kana": "ごうい",
    "romaji": "goui"
  },
  "合格": {
    "kana": "ごうかく",
    "romaji": "goukaku"
  },
  "同じ": {
    "kana": "おなじ",
    "romaji": "onaji"
  },
  "同僚": {
    "kana": "どうりょう",
    "romaji": "douryou"
  },
  "同化": {
    "kana": "どうか",
    "romaji": "douka"
  },
  "同封": {
    "kana": "どうふう",
    "romaji": "doufuu"
  },
  "同情": {
    "kana": "どうじょう",
    "romaji": "doujou"
  },
  "同意": {
    "kana": "どうい",
    "romaji": "doui"
  },
  "同時": {
    "kana": "どうじ",
    "romaji": "douji"
  },
  "同様": {
    "kana": "どうよう",
    "romaji": "douyou"
  },
  "名刺": {
    "kana": "めいし",
    "romaji": "meishi"
  },
  "名前": {
    "kana": "なまえ",
    "romaji": "namae"
  },
  "名産": {
    "kana": "めいさん",
    "romaji": "meisan"
  },
  "名詞": {
    "kana": "めいし",
    "romaji": "meishi"
  },
  "名誉": {
    "kana": "めいよ",
    "romaji": "meiyo"
  },
  "名高": {
    "kana": "なだか",
    "romaji": "nadaka"
  },
  "向く": {
    "kana": "むく",
    "romaji": "muku"
  },
  "向上": {
    "kana": "こうじょう",
    "romaji": "koujou"
  },
  "否定": {
    "kana": "ひてい",
    "romaji": "hitei"
  },
  "吸う": {
    "kana": "すう",
    "romaji": "suu"
  },
  "吸収": {
    "kana": "きゅうしゅう",
    "romaji": "kyuushuu"
  },
  "周り": {
    "kana": "まわり",
    "romaji": "mawari"
  },
  "周囲": {
    "kana": "しゅうい",
    "romaji": "shuui"
  },
  "周辺": {
    "kana": "しゅうへん",
    "romaji": "shuuhen"
  },
  "味付": {
    "kana": "あじつけ",
    "romaji": "ajitsuke"
  },
  "味噌": {
    "kana": "みそ",
    "romaji": "miso"
  },
  "呼ぶ": {
    "kana": "よぶ",
    "romaji": "yobu"
  },
  "呼吸": {
    "kana": "こきゅう",
    "romaji": "kokyuu"
  },
  "品々": {
    "kana": "しなじな",
    "romaji": "shinajina"
  },
  "品物": {
    "kana": "しなもの",
    "romaji": "shinamono"
  },
  "品種": {
    "kana": "ひんしゅ",
    "romaji": "hinshu"
  },
  "品質": {
    "kana": "ひんしつ",
    "romaji": "hinshitsu"
  },
  "唯一": {
    "kana": "ゆいいつ",
    "romaji": "yuiitsu"
  },
  "商品": {
    "kana": "しょうひん",
    "romaji": "shouhin"
  },
  "商談": {
    "kana": "しょうだん",
    "romaji": "shoudan"
  },
  "問題": {
    "kana": "もんだい",
    "romaji": "mondai"
  },
  "啓発": {
    "kana": "けいはつ",
    "romaji": "keihatsu"
  },
  "善意": {
    "kana": "ぜんい",
    "romaji": "zen'i"
  },
  "喋り": {
    "kana": "しゃべり",
    "romaji": "shaberi"
  },
  "喋る": {
    "kana": "しゃべる",
    "romaji": "shaberu"
  },
  "喚起": {
    "kana": "かんき",
    "romaji": "kanki"
  },
  "喜び": {
    "kana": "よろこび",
    "romaji": "yorokobi"
  },
  "喜ぶ": {
    "kana": "よろこぶ",
    "romaji": "yorokobu"
  },
  "喝采": {
    "kana": "かっさい",
    "romaji": "kassai"
  },
  "喫緊": {
    "kana": "きっきん",
    "romaji": "kikkin"
  },
  "営業": {
    "kana": "えいぎょう",
    "romaji": "eigyou"
  },
  "四つ": {
    "kana": "よっつ",
    "romaji": "yottsu"
  },
  "四人": {
    "kana": "よにん",
    "romaji": "yonin"
  },
  "四個": {
    "kana": "よんこ",
    "romaji": "yonko"
  },
  "四冊": {
    "kana": "よんさつ",
    "romaji": "yonsatsu"
  },
  "四分": {
    "kana": "よんぶん",
    "romaji": "yonbun"
  },
  "四匹": {
    "kana": "よんひき",
    "romaji": "yonhiki"
  },
  "四回": {
    "kana": "よんかい",
    "romaji": "yonkai"
  },
  "四年": {
    "kana": "よねん",
    "romaji": "yonen"
  },
  "四才": {
    "kana": "よんさい",
    "romaji": "yonsai"
  },
  "四日": {
    "kana": "よっか",
    "romaji": "yokka"
  },
  "四時": {
    "kana": "よじ",
    "romaji": "yoji"
  },
  "四月": {
    "kana": "しがつ",
    "romaji": "shigatsu"
  },
  "四本": {
    "kana": "よんほん",
    "romaji": "yonhon"
  },
  "四枚": {
    "kana": "よんまい",
    "romaji": "yonmai"
  },
  "四歳": {
    "kana": "よんさい",
    "romaji": "yonsai"
  },
  "四階": {
    "kana": "よんかい",
    "romaji": "yonkai"
  },
  "回す": {
    "kana": "まわす",
    "romaji": "mawasu"
  },
  "回る": {
    "kana": "まわる",
    "romaji": "mawaru"
  },
  "回れ": {
    "kana": "まわれ",
    "romaji": "maware"
  },
  "回収": {
    "kana": "かいしゅう",
    "romaji": "kaishuu"
  },
  "回復": {
    "kana": "かいふく",
    "romaji": "kaifuku"
  },
  "回数": {
    "kana": "かいすう",
    "romaji": "kaisuu"
  },
  "回答": {
    "kana": "かいとう",
    "romaji": "kaitou"
  },
  "困る": {
    "kana": "こまる",
    "romaji": "komaru"
  },
  "困難": {
    "kana": "こんなん",
    "romaji": "konnan"
  },
  "固い": {
    "kana": "かたい",
    "romaji": "katai"
  },
  "固有": {
    "kana": "こゆう",
    "romaji": "koyuu"
  },
  "国内": {
    "kana": "こくない",
    "romaji": "kokunai"
  },
  "国境": {
    "kana": "こっきょう",
    "romaji": "kokkyou"
  },
  "国宝": {
    "kana": "こくほう",
    "romaji": "kokuhou"
  },
  "国籍": {
    "kana": "こくせき",
    "romaji": "kokuseki"
  },
  "土台": {
    "kana": "どだい",
    "romaji": "dodai"
  },
  "土地": {
    "kana": "とち",
    "romaji": "tochi"
  },
  "土壌": {
    "kana": "どじょう",
    "romaji": "dojou"
  },
  "土星": {
    "kana": "どせい",
    "romaji": "dosei"
  },
  "土曜": {
    "kana": "どよう",
    "romaji": "doyou"
  },
  "圧縮": {
    "kana": "あっしゅく",
    "romaji": "asshuku"
  },
  "圧迫": {
    "kana": "あっぱく",
    "romaji": "appaku"
  },
  "在庫": {
    "kana": "ざいこ",
    "romaji": "zaiko"
  },
  "地下": {
    "kana": "ちか",
    "romaji": "chika"
  },
  "地中": {
    "kana": "ちちゅう",
    "romaji": "chichuu"
  },
  "地元": {
    "kana": "じもと",
    "romaji": "jimoto"
  },
  "地区": {
    "kana": "ちく",
    "romaji": "chiku"
  },
  "地味": {
    "kana": "じみ",
    "romaji": "jimi"
  },
  "地図": {
    "kana": "ちず",
    "romaji": "chizu"
  },
  "地域": {
    "kana": "ちいき",
    "romaji": "chiiki"
  },
  "地形": {
    "kana": "ちけい",
    "romaji": "chikei"
  },
  "地方": {
    "kana": "ちほう",
    "romaji": "chihou"
  },
  "地球": {
    "kana": "ちきゅう",
    "romaji": "chikyuu"
  },
  "地道": {
    "kana": "ぢみち",
    "romaji": "jimichi"
  },
  "地震": {
    "kana": "じしん",
    "romaji": "jishin"
  },
  "地面": {
    "kana": "じめん",
    "romaji": "jimen"
  },
  "均衡": {
    "kana": "きんこう",
    "romaji": "kinkou"
  },
  "執筆": {
    "kana": "しっぴつ",
    "romaji": "shippitsu"
  },
  "培う": {
    "kana": "つちかう",
    "romaji": "tsuchikau"
  },
  "基本": {
    "kana": "きほん",
    "romaji": "kihon"
  },
  "基準": {
    "kana": "きじゅん",
    "romaji": "kijun"
  },
  "基盤": {
    "kana": "きばん",
    "romaji": "kiban"
  },
  "堂々": {
    "kana": "どうどう",
    "romaji": "doudou"
  },
  "報告": {
    "kana": "ほうこく",
    "romaji": "houkoku"
  },
  "場合": {
    "kana": "ばあい",
    "romaji": "baai"
  },
  "場所": {
    "kana": "ばしょ",
    "romaji": "basho"
  },
  "場面": {
    "kana": "ばめん",
    "romaji": "bamen"
  },
  "塗る": {
    "kana": "ぬる",
    "romaji": "nuru"
  },
  "塩気": {
    "kana": "しおけ",
    "romaji": "shioke"
  },
  "境界": {
    "kana": "きょうかい",
    "romaji": "kyoukai"
  },
  "境目": {
    "kana": "さかいめ",
    "romaji": "sakaime"
  },
  "増加": {
    "kana": "ぞうか",
    "romaji": "zouka"
  },
  "増大": {
    "kana": "ぞうだい",
    "romaji": "zoudai"
  },
  "増強": {
    "kana": "ぞうきょう",
    "romaji": "zoukyou"
  },
  "墜落": {
    "kana": "ついらく",
    "romaji": "tsuiraku"
  },
  "壁面": {
    "kana": "へきめん",
    "romaji": "hekimen"
  },
  "壊す": {
    "kana": "こわす",
    "romaji": "kowasu"
  },
  "声援": {
    "kana": "せいえん",
    "romaji": "seien"
  },
  "売る": {
    "kana": "うる",
    "romaji": "uru"
  },
  "売上": {
    "kana": "うりあげ",
    "romaji": "uriage"
  },
  "売却": {
    "kana": "ばいきゃく",
    "romaji": "baikyaku"
  },
  "変化": {
    "kana": "へんか",
    "romaji": "henka"
  },
  "変容": {
    "kana": "へんよう",
    "romaji": "henyou"
  },
  "変換": {
    "kana": "へんかん",
    "romaji": "henkan"
  },
  "変更": {
    "kana": "へんこう",
    "romaji": "henkou"
  },
  "夏休": {
    "kana": "なつきゅう",
    "romaji": "natsukyuu"
  },
  "夕方": {
    "kana": "ゆうがた",
    "romaji": "yuugata"
  },
  "夕日": {
    "kana": "ゆうひ",
    "romaji": "yuuhi"
  },
  "夕食": {
    "kana": "ゆうしょく",
    "romaji": "yuushoku"
  },
  "外す": {
    "kana": "はずす",
    "romaji": "hazusu"
  },
  "外せ": {
    "kana": "はずせ",
    "romaji": "hazuse"
  },
  "外側": {
    "kana": "そとがわ",
    "romaji": "sotogawa"
  },
  "外出": {
    "kana": "がいしゅつ",
    "romaji": "gaishutsu"
  },
  "外国": {
    "kana": "がいこく",
    "romaji": "gaikoku"
  },
  "外部": {
    "kana": "がいぶ",
    "romaji": "gaibu"
  },
  "多い": {
    "kana": "おおい",
    "romaji": "ooi"
  },
  "多く": {
    "kana": "おおく",
    "romaji": "ooku"
  },
  "多分": {
    "kana": "たぶん",
    "romaji": "tabun"
  },
  "多大": {
    "kana": "ただい",
    "romaji": "tadai"
  },
  "多忙": {
    "kana": "たぼう",
    "romaji": "tabou"
  },
  "多数": {
    "kana": "たすう",
    "romaji": "tasuu"
  },
  "多様": {
    "kana": "たよう",
    "romaji": "tayou"
  },
  "夜中": {
    "kana": "よなか",
    "romaji": "yonaka"
  },
  "夜勤": {
    "kana": "やきん",
    "romaji": "yakin"
  },
  "夜空": {
    "kana": "よぞら",
    "romaji": "yozora"
  },
  "夜行": {
    "kana": "やこう",
    "romaji": "yakou"
  },
  "夜遅": {
    "kana": "よるち",
    "romaji": "yoru chi"
  },
  "夜間": {
    "kana": "やかん",
    "romaji": "yakan"
  },
  "大事": {
    "kana": "だいじ",
    "romaji": "daiji"
  },
  "大人": {
    "kana": "おとな",
    "romaji": "otona"
  },
  "大切": {
    "kana": "たいせつ",
    "romaji": "taisetsu"
  },
  "大勢": {
    "kana": "おおぜい",
    "romaji": "oozei"
  },
  "大半": {
    "kana": "たいはん",
    "romaji": "taihan"
  },
  "大吉": {
    "kana": "だいきち",
    "romaji": "daikichi"
  },
  "大型": {
    "kana": "おおがた",
    "romaji": "oogata"
  },
  "大声": {
    "kana": "おおごえ",
    "romaji": "oogoe"
  },
  "大変": {
    "kana": "たいへん",
    "romaji": "taihen"
  },
  "大学": {
    "kana": "だいがく",
    "romaji": "daigaku"
  },
  "大幅": {
    "kana": "おおはば",
    "romaji": "oohaba"
  },
  "大抵": {
    "kana": "たいてい",
    "romaji": "taitei"
  },
  "大根": {
    "kana": "だいこん",
    "romaji": "daikon"
  },
  "大粒": {
    "kana": "おおつぶ",
    "romaji": "ootsubu"
  },
  "大通": {
    "kana": "おおどおり",
    "romaji": "oodoori"
  },
  "大量": {
    "kana": "たいりょう",
    "romaji": "tairyou"
  },
  "大雨": {
    "kana": "おおあめ",
    "romaji": "ooame"
  },
  "大雪": {
    "kana": "おおゆき",
    "romaji": "ooyuki"
  },
  "天井": {
    "kana": "てんじょう",
    "romaji": "tenjou"
  },
  "天候": {
    "kana": "てんこう",
    "romaji": "tenkou"
  },
  "天気": {
    "kana": "てんき",
    "romaji": "tenki"
  },
  "太い": {
    "kana": "ふとい",
    "romaji": "futoi"
  },
  "太る": {
    "kana": "ふとる",
    "romaji": "futoru"
  },
  "太陽": {
    "kana": "たいよう",
    "romaji": "taiyou"
  },
  "太鼓": {
    "kana": "たいこ",
    "romaji": "taiko"
  },
  "夫婦": {
    "kana": "ふうふ",
    "romaji": "fuufu"
  },
  "失う": {
    "kana": "うしなう",
    "romaji": "ushinau"
  },
  "失態": {
    "kana": "しったい",
    "romaji": "shittai"
  },
  "失敗": {
    "kana": "しっぱい",
    "romaji": "shippai"
  },
  "失礼": {
    "kana": "しつれい",
    "romaji": "shitsurei"
  },
  "奈良": {
    "kana": "なら",
    "romaji": "nara"
  },
  "契機": {
    "kana": "けいき",
    "romaji": "keiki"
  },
  "契約": {
    "kana": "けいやく",
    "romaji": "keiyaku"
  },
  "女将": {
    "kana": "じょしょう",
    "romaji": "joshou"
  },
  "好き": {
    "kana": "すき",
    "romaji": "suki"
  },
  "好機": {
    "kana": "こうき",
    "romaji": "kouki"
  },
  "好評": {
    "kana": "こうひょう",
    "romaji": "kouhyou"
  },
  "好調": {
    "kana": "こうちょう",
    "romaji": "kouchou"
  },
  "妙味": {
    "kana": "みょうみ",
    "romaji": "myoumi"
  },
  "妥当": {
    "kana": "だとう",
    "romaji": "datou"
  },
  "始動": {
    "kana": "しどう",
    "romaji": "shidou"
  },
  "姿勢": {
    "kana": "しせい",
    "romaji": "shisei"
  },
  "威信": {
    "kana": "いしん",
    "romaji": "ishin"
  },
  "嫌い": {
    "kana": "きらい",
    "romaji": "kirai"
  },
  "嫌な": {
    "kana": "いやな",
    "romaji": "iya na"
  },
  "子供": {
    "kana": "こども",
    "romaji": "kodomo"
  },
  "子孫": {
    "kana": "しそん",
    "romaji": "shison"
  },
  "子育": {
    "kana": "こそだて",
    "romaji": "kosodate"
  },
  "字面": {
    "kana": "じづら",
    "romaji": "jizura"
  },
  "存在": {
    "kana": "そんざい",
    "romaji": "sonzai"
  },
  "存続": {
    "kana": "そんぞく",
    "romaji": "sonzoku"
  },
  "季節": {
    "kana": "きせつ",
    "romaji": "kisetsu"
  },
  "学問": {
    "kana": "がくもん",
    "romaji": "gakumon"
  },
  "学校": {
    "kana": "がっこう",
    "romaji": "gakkou"
  },
  "学生": {
    "kana": "がくせい",
    "romaji": "gakusei"
  },
  "学習": {
    "kana": "がくしゅう",
    "romaji": "gakushuu"
  },
  "守る": {
    "kana": "まもる",
    "romaji": "mamoru"
  },
  "安い": {
    "kana": "やすい",
    "romaji": "yasui"
  },
  "安全": {
    "kana": "あんぜん",
    "romaji": "anzen"
  },
  "安定": {
    "kana": "あんてい",
    "romaji": "antei"
  },
  "安心": {
    "kana": "あんしん",
    "romaji": "anshin"
  },
  "完了": {
    "kana": "かんりょう",
    "romaji": "kanryou"
  },
  "完全": {
    "kana": "かんぜん",
    "romaji": "kanzen"
  },
  "完成": {
    "kana": "かんせい",
    "romaji": "kansei"
  },
  "定員": {
    "kana": "ていいん",
    "romaji": "teiin"
  },
  "定着": {
    "kana": "ていちゃく",
    "romaji": "teichaku"
  },
  "定義": {
    "kana": "ていぎ",
    "romaji": "teigi"
  },
  "実印": {
    "kana": "じついん",
    "romaji": "jitsuin"
  },
  "実情": {
    "kana": "じつじょう",
    "romaji": "jitsujou"
  },
  "実感": {
    "kana": "じっかん",
    "romaji": "jikkan"
  },
  "実態": {
    "kana": "じったい",
    "romaji": "jittai"
  },
  "実施": {
    "kana": "じっし",
    "romaji": "jisshi"
  },
  "実物": {
    "kana": "じつぶつ",
    "romaji": "jitsubutsu"
  },
  "実行": {
    "kana": "じっこう",
    "romaji": "jikkou"
  },
  "実際": {
    "kana": "じっさい",
    "romaji": "jissai"
  },
  "実験": {
    "kana": "じっけん",
    "romaji": "jikken"
  },
  "客様": {
    "kana": "きゃくさま",
    "romaji": "kyakusama"
  },
  "宣伝": {
    "kana": "せんでん",
    "romaji": "senden"
  },
  "家具": {
    "kana": "かぐ",
    "romaji": "kagu"
  },
  "家庭": {
    "kana": "かてい",
    "romaji": "katei"
  },
  "家族": {
    "kana": "かぞく",
    "romaji": "kazoku"
  },
  "家賃": {
    "kana": "やちん",
    "romaji": "yachin"
  },
  "家電": {
    "kana": "かでん",
    "romaji": "kaden"
  },
  "容器": {
    "kana": "ようき",
    "romaji": "youki"
  },
  "容易": {
    "kana": "ようい",
    "romaji": "youi"
  },
  "容赦": {
    "kana": "ようしゃ",
    "romaji": "yousha"
  },
  "宿題": {
    "kana": "しゅくだい",
    "romaji": "shukudai"
  },
  "密室": {
    "kana": "みっしつ",
    "romaji": "misshitsu"
  },
  "富む": {
    "kana": "とむ",
    "romaji": "tomu"
  },
  "寒い": {
    "kana": "さむい",
    "romaji": "samui"
  },
  "寝る": {
    "kana": "ねる",
    "romaji": "neru"
  },
  "寡占": {
    "kana": "かせん",
    "romaji": "kasen"
  },
  "審査": {
    "kana": "しんさ",
    "romaji": "shinsa"
  },
  "対価": {
    "kana": "たいか",
    "romaji": "taika"
  },
  "対処": {
    "kana": "たいしょ",
    "romaji": "taisho"
  },
  "対応": {
    "kana": "たいおう",
    "romaji": "taiou"
  },
  "対立": {
    "kana": "たいりつ",
    "romaji": "tairitsu"
  },
  "対等": {
    "kana": "たいとう",
    "romaji": "taitou"
  },
  "対策": {
    "kana": "たいさく",
    "romaji": "taisaku"
  },
  "対話": {
    "kana": "たいわ",
    "romaji": "taiwa"
  },
  "対象": {
    "kana": "たいしょう",
    "romaji": "taishou"
  },
  "封筒": {
    "kana": "ふうとう",
    "romaji": "fuutou"
  },
  "専ら": {
    "kana": "もっぱら",
    "romaji": "moppara"
  },
  "将来": {
    "kana": "しょうらい",
    "romaji": "shourai"
  },
  "尊厳": {
    "kana": "そんげん",
    "romaji": "songen"
  },
  "尊敬": {
    "kana": "そんけい",
    "romaji": "sonkei"
  },
  "尊重": {
    "kana": "そんちょう",
    "romaji": "sonchou"
  },
  "導入": {
    "kana": "どうにゅう",
    "romaji": "dounyuu"
  },
  "小型": {
    "kana": "こがた",
    "romaji": "kogata"
  },
  "小説": {
    "kana": "しょうせつ",
    "romaji": "shousetsu"
  },
  "少し": {
    "kana": "すこし",
    "romaji": "sukoshi"
  },
  "少額": {
    "kana": "しょうがく",
    "romaji": "shougaku"
  },
  "就任": {
    "kana": "しゅうにん",
    "romaji": "shuunin"
  },
  "尺度": {
    "kana": "しゃくど",
    "romaji": "shakudo"
  },
  "尽力": {
    "kana": "じんりょく",
    "romaji": "jinryoku"
  },
  "尾根": {
    "kana": "おね",
    "romaji": "one"
  },
  "局面": {
    "kana": "きょくめん",
    "romaji": "kyokumen"
  },
  "屈折": {
    "kana": "くっせつ",
    "romaji": "kussetsu"
  },
  "屈辱": {
    "kana": "くつじょく",
    "romaji": "kutsujoku"
  },
  "届く": {
    "kana": "とどく",
    "romaji": "todoku"
  },
  "屋上": {
    "kana": "おくじょう",
    "romaji": "okujou"
  },
  "屋内": {
    "kana": "おくない",
    "romaji": "okunai"
  },
  "屋根": {
    "kana": "やね",
    "romaji": "yane"
  },
  "屏風": {
    "kana": "びょうぶ",
    "romaji": "byoubu"
  },
  "展示": {
    "kana": "てんじ",
    "romaji": "tenji"
  },
  "展開": {
    "kana": "てんかい",
    "romaji": "tenkai"
  },
  "履く": {
    "kana": "はく",
    "romaji": "haku"
  },
  "山田": {
    "kana": "やまだ",
    "romaji": "Yamada"
  },
  "山菜": {
    "kana": "さんさい",
    "romaji": "sansai"
  },
  "山道": {
    "kana": "やまみち",
    "romaji": "yamamichi"
  },
  "山里": {
    "kana": "やまざと",
    "romaji": "yamazato"
  },
  "山頂": {
    "kana": "さんちょう",
    "romaji": "sanchou"
  },
  "川沿": {
    "kana": "かわえん",
    "romaji": "kawa en"
  },
  "工事": {
    "kana": "こうじ",
    "romaji": "kouji"
  },
  "工場": {
    "kana": "こうじょう",
    "romaji": "koujou"
  },
  "工夫": {
    "kana": "くふう",
    "romaji": "kufuu"
  },
  "工房": {
    "kana": "こうぼう",
    "romaji": "koubou"
  },
  "工法": {
    "kana": "こうほう",
    "romaji": "kouhou"
  },
  "工芸": {
    "kana": "こうげい",
    "romaji": "kougei"
  },
  "左右": {
    "kana": "さゆう",
    "romaji": "sayuu"
  },
  "左様": {
    "kana": "さよう",
    "romaji": "sayou"
  },
  "巨匠": {
    "kana": "きょしょう",
    "romaji": "kyoshou"
  },
  "巨大": {
    "kana": "きょだい",
    "romaji": "kyodai"
  },
  "巨木": {
    "kana": "きょぼく",
    "romaji": "kyoboku"
  },
  "巨額": {
    "kana": "きょがく",
    "romaji": "kyogaku"
  },
  "市井": {
    "kana": "しせい",
    "romaji": "shisei"
  },
  "市場": {
    "kana": "しじょう",
    "romaji": "shijou"
  },
  "市民": {
    "kana": "しみん",
    "romaji": "shimin"
  },
  "市長": {
    "kana": "しちょう",
    "romaji": "shichou"
  },
  "布団": {
    "kana": "ふとん",
    "romaji": "futon"
  },
  "布地": {
    "kana": "ぬのじ",
    "romaji": "nunoji"
  },
  "希望": {
    "kana": "きぼう",
    "romaji": "kibou"
  },
  "希薄": {
    "kana": "きはく",
    "romaji": "kihaku"
  },
  "帰る": {
    "kana": "かえる",
    "romaji": "kaeru"
  },
  "帰属": {
    "kana": "きぞく",
    "romaji": "kizoku"
  },
  "帰結": {
    "kana": "きけつ",
    "romaji": "kiketsu"
  },
  "帰趨": {
    "kana": "きすう",
    "romaji": "kisuu"
  },
  "常識": {
    "kana": "じょうしき",
    "romaji": "joushiki"
  },
  "帽子": {
    "kana": "ぼうし",
    "romaji": "boushi"
  },
  "幅広": {
    "kana": "はばひろ",
    "romaji": "habahiro"
  },
  "平日": {
    "kana": "へいじつ",
    "romaji": "heijitsu"
  },
  "平易": {
    "kana": "へいい",
    "romaji": "heii"
  },
  "平時": {
    "kana": "へいじ",
    "romaji": "heiji"
  },
  "平素": {
    "kana": "へいそ",
    "romaji": "heiso"
  },
  "年配": {
    "kana": "ねんぱい",
    "romaji": "nenpai"
  },
  "年額": {
    "kana": "ねんがく",
    "romaji": "nengaku"
  },
  "年齢": {
    "kana": "ねんれい",
    "romaji": "nenrei"
  },
  "幾つ": {
    "kana": "いくつ",
    "romaji": "ikutsu"
  },
  "幾ら": {
    "kana": "いくら",
    "romaji": "ikura"
  },
  "幾度": {
    "kana": "いくど",
    "romaji": "ikudo"
  },
  "幾通": {
    "kana": "きとおり",
    "romaji": "ki toori"
  },
  "広い": {
    "kana": "ひろい",
    "romaji": "hiroi"
  },
  "広場": {
    "kana": "ひろば",
    "romaji": "hiroba"
  },
  "店主": {
    "kana": "てんしゅ",
    "romaji": "tenshu"
  },
  "店内": {
    "kana": "てんない",
    "romaji": "tennai"
  },
  "店員": {
    "kana": "てんいん",
    "romaji": "ten-in"
  },
  "店舗": {
    "kana": "てんぽ",
    "romaji": "tenpo"
  },
  "店長": {
    "kana": "てんちょう",
    "romaji": "tenchou"
  },
  "店頭": {
    "kana": "てんとう",
    "romaji": "tentou"
  },
  "座る": {
    "kana": "すわる",
    "romaji": "suwaru"
  },
  "座長": {
    "kana": "ざちょう",
    "romaji": "zachou"
  },
  "廃棄": {
    "kana": "はいき",
    "romaji": "haiki"
  },
  "廊下": {
    "kana": "ろうか",
    "romaji": "rouka"
  },
  "延期": {
    "kana": "えんき",
    "romaji": "enki"
  },
  "延長": {
    "kana": "えんちょう",
    "romaji": "enchou"
  },
  "建物": {
    "kana": "たてもの",
    "romaji": "tatemono"
  },
  "建築": {
    "kana": "けんちく",
    "romaji": "kenchiku"
  },
  "弁当": {
    "kana": "べんとう",
    "romaji": "bentou"
  },
  "弁解": {
    "kana": "べんかい",
    "romaji": "benkai"
  },
  "弊害": {
    "kana": "へいがい",
    "romaji": "heigai"
  },
  "弊社": {
    "kana": "へいしゃ",
    "romaji": "heisha"
  },
  "引く": {
    "kana": "ひく",
    "romaji": "hiku"
  },
  "弱い": {
    "kana": "よわい",
    "romaji": "yowai"
  },
  "強い": {
    "kana": "つよい",
    "romaji": "tsuyoi"
  },
  "強化": {
    "kana": "きょうか",
    "romaji": "kyouka"
  },
  "強調": {
    "kana": "きょうちょう",
    "romaji": "kyouchou"
  },
  "強風": {
    "kana": "きょうふう",
    "romaji": "kyoufuu"
  },
  "当初": {
    "kana": "とうしょ",
    "romaji": "tousho"
  },
  "当日": {
    "kana": "とうじつ",
    "romaji": "toujitsu"
  },
  "当時": {
    "kana": "とうじ",
    "romaji": "touji"
  },
  "当然": {
    "kana": "とうぜん",
    "romaji": "touzen"
  },
  "当番": {
    "kana": "とうばん",
    "romaji": "touban"
  },
  "当社": {
    "kana": "とうしゃ",
    "romaji": "tousha"
  },
  "形式": {
    "kana": "けいしき",
    "romaji": "keishiki"
  },
  "形状": {
    "kana": "けいじょう",
    "romaji": "keijou"
  },
  "影響": {
    "kana": "えいきょう",
    "romaji": "eikyou"
  },
  "役割": {
    "kana": "やくわり",
    "romaji": "yakuwari"
  },
  "役目": {
    "kana": "やくめ",
    "romaji": "yakume"
  },
  "彼女": {
    "kana": "かのじょ",
    "romaji": "kanojo"
  },
  "往来": {
    "kana": "おうらい",
    "romaji": "ourai"
  },
  "待つ": {
    "kana": "まつ",
    "romaji": "matsu"
  },
  "待機": {
    "kana": "たいき",
    "romaji": "taiki"
  },
  "後ろ": {
    "kana": "うしろ",
    "romaji": "ushiro"
  },
  "後世": {
    "kana": "こうせい",
    "romaji": "kousei"
  },
  "後回": {
    "kana": "こうかい",
    "romaji": "koukai"
  },
  "後押": {
    "kana": "あとおし",
    "romaji": "atooshi"
  },
  "後日": {
    "kana": "ごじつ",
    "romaji": "gojitsu"
  },
  "後者": {
    "kana": "こうしゃ",
    "romaji": "kousha"
  },
  "後輩": {
    "kana": "こうはい",
    "romaji": "kouhai"
  },
  "従来": {
    "kana": "じゅうらい",
    "romaji": "juurai"
  },
  "得る": {
    "kana": "える",
    "romaji": "eru"
  },
  "得意": {
    "kana": "とくい",
    "romaji": "tokui"
  },
  "御礼": {
    "kana": "おれい",
    "romaji": "orei"
  },
  "御社": {
    "kana": "おんしゃ",
    "romaji": "onsha"
  },
  "復元": {
    "kana": "ふくげん",
    "romaji": "fukugen"
  },
  "循環": {
    "kana": "じゅんかん",
    "romaji": "junkan"
  },
  "微妙": {
    "kana": "びみょう",
    "romaji": "bimyou"
  },
  "微細": {
    "kana": "びさい",
    "romaji": "bisai"
  },
  "心配": {
    "kana": "しんぱい",
    "romaji": "shinpai"
  },
  "必要": {
    "kana": "ひつよう",
    "romaji": "hitsuyou"
  },
  "必須": {
    "kana": "ひっす",
    "romaji": "hissu"
  },
  "忍耐": {
    "kana": "にんたい",
    "romaji": "nintai"
  },
  "忖度": {
    "kana": "そんたく",
    "romaji": "sontaku"
  },
  "応募": {
    "kana": "おうぼ",
    "romaji": "oubo"
  },
  "応援": {
    "kana": "おうえん",
    "romaji": "ouen"
  },
  "応用": {
    "kana": "おうよう",
    "romaji": "ouyou"
  },
  "応答": {
    "kana": "おうとう",
    "romaji": "outou"
  },
  "応酬": {
    "kana": "おうしゅう",
    "romaji": "oushuu"
  },
  "快速": {
    "kana": "かいそく",
    "romaji": "kaisoku"
  },
  "快適": {
    "kana": "かいてき",
    "romaji": "kaiteki"
  },
  "怒る": {
    "kana": "おこる",
    "romaji": "okoru"
  },
  "怖い": {
    "kana": "こわい",
    "romaji": "kowai"
  },
  "思う": {
    "kana": "おもう",
    "romaji": "omou"
  },
  "思考": {
    "kana": "しこう",
    "romaji": "shikou"
  },
  "怠慢": {
    "kana": "たいまん",
    "romaji": "taiman"
  },
  "急ぐ": {
    "kana": "いそぐ",
    "romaji": "isogu"
  },
  "急げ": {
    "kana": "いそげ",
    "romaji": "inge"
  },
  "急務": {
    "kana": "きゅうむ",
    "romaji": "kyuumu"
  },
  "急速": {
    "kana": "きゅうそく",
    "romaji": "kyuusoku"
  },
  "性別": {
    "kana": "せいべつ",
    "romaji": "seibetsu"
  },
  "性質": {
    "kana": "せいしつ",
    "romaji": "seishitsu"
  },
  "怪我": {
    "kana": "けが",
    "romaji": "kega"
  },
  "恋人": {
    "kana": "こいびと",
    "romaji": "koibito"
  },
  "恐縮": {
    "kana": "きょうしゅく",
    "romaji": "kyoushuku"
  },
  "恩師": {
    "kana": "おんし",
    "romaji": "onshi"
  },
  "息子": {
    "kana": "むすこ",
    "romaji": "musuko"
  },
  "患者": {
    "kana": "かんじゃ",
    "romaji": "kanja"
  },
  "悪い": {
    "kana": "わるい",
    "romaji": "warui"
  },
  "悪化": {
    "kana": "あっか",
    "romaji": "akka"
  },
  "悪意": {
    "kana": "あくい",
    "romaji": "akui"
  },
  "悲劇": {
    "kana": "ひげき",
    "romaji": "higeki"
  },
  "情報": {
    "kana": "じょうほう",
    "romaji": "jouhou"
  },
  "情景": {
    "kana": "じょうけい",
    "romaji": "joukei"
  },
  "情緒": {
    "kana": "じょうしょ",
    "romaji": "jousho"
  },
  "惣菜": {
    "kana": "そうざい",
    "romaji": "souzai"
  },
  "想像": {
    "kana": "そうぞう",
    "romaji": "souzou"
  },
  "意味": {
    "kana": "いみ",
    "romaji": "imi"
  },
  "意図": {
    "kana": "いと",
    "romaji": "ito"
  },
  "意思": {
    "kana": "いし",
    "romaji": "ishi"
  },
  "意欲": {
    "kana": "いよく",
    "romaji": "iyoku"
  },
  "意義": {
    "kana": "いぎ",
    "romaji": "igi"
  },
  "意見": {
    "kana": "いけん",
    "romaji": "iken"
  },
  "意識": {
    "kana": "いしき",
    "romaji": "ishiki"
  },
  "愚痴": {
    "kana": "ぐち",
    "romaji": "guchi"
  },
  "愛顧": {
    "kana": "あいこ",
    "romaji": "aiko"
  },
  "感嘆": {
    "kana": "かんたん",
    "romaji": "kantan"
  },
  "感想": {
    "kana": "かんそう",
    "romaji": "kansou"
  },
  "感激": {
    "kana": "かんげき",
    "romaji": "kangeki"
  },
  "感謝": {
    "kana": "かんしゃ",
    "romaji": "kansha"
  },
  "態度": {
    "kana": "たいど",
    "romaji": "taido"
  },
  "慎重": {
    "kana": "しんちょう",
    "romaji": "shinchou"
  },
  "慙愧": {
    "kana": "ざんき",
    "romaji": "zanki"
  },
  "憂慮": {
    "kana": "ゆうりょ",
    "romaji": "yuuryo"
  },
  "憶測": {
    "kana": "おくそく",
    "romaji": "okusoku"
  },
  "懇願": {
    "kana": "こんがん",
    "romaji": "kongan"
  },
  "懐疑": {
    "kana": "かいぎ",
    "romaji": "kaigi"
  },
  "懸命": {
    "kana": "けんめい",
    "romaji": "kenmei"
  },
  "懸念": {
    "kana": "けねん",
    "romaji": "kenen"
  },
  "成功": {
    "kana": "せいこう",
    "romaji": "seikou"
  },
  "成否": {
    "kana": "せいひ",
    "romaji": "seihi"
  },
  "成果": {
    "kana": "せいか",
    "romaji": "seika"
  },
  "成熟": {
    "kana": "せいじゅく",
    "romaji": "seijuku"
  },
  "成立": {
    "kana": "せいりつ",
    "romaji": "seiritsu"
  },
  "成績": {
    "kana": "せいせき",
    "romaji": "seiseki"
  },
  "成長": {
    "kana": "せいちょう",
    "romaji": "seichou"
  },
  "我慢": {
    "kana": "がまん",
    "romaji": "gaman"
  },
  "戦乱": {
    "kana": "せんらん",
    "romaji": "senran"
  },
  "戦火": {
    "kana": "せんか",
    "romaji": "senka"
  },
  "戦略": {
    "kana": "せんりゃく",
    "romaji": "senryaku"
  },
  "戦禍": {
    "kana": "せんか",
    "romaji": "senka"
  },
  "戻す": {
    "kana": "もどす",
    "romaji": "modosu"
  },
  "戻る": {
    "kana": "もどる",
    "romaji": "modoru"
  },
  "所以": {
    "kana": "ゆえん",
    "romaji": "yuen"
  },
  "所得": {
    "kana": "しょとく",
    "romaji": "shotoku"
  },
  "所見": {
    "kana": "しょけん",
    "romaji": "shoken"
  },
  "手伝": {
    "kana": "てつだい",
    "romaji": "tetsudai"
  },
  "手元": {
    "kana": "てもと",
    "romaji": "temoto"
  },
  "手入": {
    "kana": "ていれ",
    "romaji": "teire"
  },
  "手当": {
    "kana": "てあて",
    "romaji": "teate"
  },
  "手書": {
    "kana": "てがき",
    "romaji": "tegaki"
  },
  "手柄": {
    "kana": "てがら",
    "romaji": "tegara"
  },
  "手段": {
    "kana": "しゅだん",
    "romaji": "shudan"
  },
  "手法": {
    "kana": "しゅほう",
    "romaji": "shuhou"
  },
  "手渡": {
    "kana": "てわたし",
    "romaji": "tewatashi"
  },
  "手紙": {
    "kana": "てがみ",
    "romaji": "tegami"
  },
  "手続": {
    "kana": "てつづき",
    "romaji": "tetsuzuki"
  },
  "手術": {
    "kana": "しゅじゅつ",
    "romaji": "shujutsu"
  },
  "手袋": {
    "kana": "てぶくろ",
    "romaji": "tebukuro"
  },
  "手軽": {
    "kana": "てがる",
    "romaji": "tegaru"
  },
  "手遅": {
    "kana": "てち",
    "romaji": "te chi"
  },
  "手違": {
    "kana": "てい",
    "romaji": "te i"
  },
  "手配": {
    "kana": "てはい",
    "romaji": "tehai"
  },
  "手間": {
    "kana": "てま",
    "romaji": "tema"
  },
  "手順": {
    "kana": "てじゅん",
    "romaji": "tejun"
  },
  "手首": {
    "kana": "てくび",
    "romaji": "tekubi"
  },
  "打診": {
    "kana": "だしん",
    "romaji": "dashin"
  },
  "打開": {
    "kana": "だかい",
    "romaji": "dakai"
  },
  "払う": {
    "kana": "はらう",
    "romaji": "harau"
  },
  "払拭": {
    "kana": "ふっしょく",
    "romaji": "fusshoku"
  },
  "承認": {
    "kana": "しょうにん",
    "romaji": "shounin"
  },
  "技能": {
    "kana": "ぎのう",
    "romaji": "ginou"
  },
  "技術": {
    "kana": "ぎじゅつ",
    "romaji": "gijutsu"
  },
  "把握": {
    "kana": "はあく",
    "romaji": "haaku"
  },
  "抑止": {
    "kana": "よくし",
    "romaji": "yokushi"
  },
  "投影": {
    "kana": "とうえい",
    "romaji": "touei"
  },
  "投資": {
    "kana": "とうし",
    "romaji": "toushi"
  },
  "折る": {
    "kana": "おる",
    "romaji": "oru"
  },
  "折れ": {
    "kana": "おれ",
    "romaji": "ore"
  },
  "抜く": {
    "kana": "ぬく",
    "romaji": "nuku"
  },
  "抜擢": {
    "kana": "ばってき",
    "romaji": "batteki"
  },
  "抜粋": {
    "kana": "ばっすい",
    "romaji": "bassui"
  },
  "抵抗": {
    "kana": "ていこう",
    "romaji": "teikou"
  },
  "抵触": {
    "kana": "ていしょく",
    "romaji": "teishoku"
  },
  "押す": {
    "kana": "おす",
    "romaji": "osu"
  },
  "押せ": {
    "kana": "おせ",
    "romaji": "ose"
  },
  "担げ": {
    "kana": "かつげ",
    "romaji": "katsuge"
  },
  "担保": {
    "kana": "たんぽ",
    "romaji": "tanpo"
  },
  "担当": {
    "kana": "たんとう",
    "romaji": "tantou"
  },
  "拍手": {
    "kana": "はくしゅ",
    "romaji": "hakushu"
  },
  "拘束": {
    "kana": "こうそく",
    "romaji": "kousoku"
  },
  "拝借": {
    "kana": "はいしゃく",
    "romaji": "haishaku"
  },
  "拝眉": {
    "kana": "はいび",
    "romaji": "haibi"
  },
  "拝聴": {
    "kana": "はいちょう",
    "romaji": "haichou"
  },
  "拝見": {
    "kana": "はいけん",
    "romaji": "haiken"
  },
  "拝観": {
    "kana": "はいかん",
    "romaji": "haikan"
  },
  "拠点": {
    "kana": "きょてん",
    "romaji": "kyoten"
  },
  "拡充": {
    "kana": "かくじゅう",
    "romaji": "kakujuu"
  },
  "拡大": {
    "kana": "かくだい",
    "romaji": "kakudai"
  },
  "拡散": {
    "kana": "かくさん",
    "romaji": "kakusan"
  },
  "括る": {
    "kana": "くくる",
    "romaji": "kukuru"
  },
  "括れ": {
    "kana": "くくれ",
    "romaji": "kukure"
  },
  "拭く": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "拮抗": {
    "kana": "きっこう",
    "romaji": "kikkou"
  },
  "拾う": {
    "kana": "ひろう",
    "romaji": "hirou"
  },
  "持つ": {
    "kana": "もつ",
    "romaji": "motsu"
  },
  "持て": {
    "kana": "もて",
    "romaji": "mote"
  },
  "指す": {
    "kana": "さす",
    "romaji": "sasu"
  },
  "指先": {
    "kana": "ゆびさき",
    "romaji": "yubisaki"
  },
  "指導": {
    "kana": "しどう",
    "romaji": "shidou"
  },
  "指摘": {
    "kana": "してき",
    "romaji": "shiteki"
  },
  "指標": {
    "kana": "しひょう",
    "romaji": "shihyou"
  },
  "指輪": {
    "kana": "ゆびわ",
    "romaji": "yubiwa"
  },
  "挑戦": {
    "kana": "ちょうせん",
    "romaji": "chousen"
  },
  "挑発": {
    "kana": "ちょうはつ",
    "romaji": "chouhatsu"
  },
  "挟む": {
    "kana": "はさむ",
    "romaji": "hasamu"
  },
  "挨拶": {
    "kana": "あいさつ",
    "romaji": "aisatsu"
  },
  "捏造": {
    "kana": "ねつぞう",
    "romaji": "netsuzou"
  },
  "掃除": {
    "kana": "そうじ",
    "romaji": "souji"
  },
  "授業": {
    "kana": "じゅぎょう",
    "romaji": "jugyou"
  },
  "排水": {
    "kana": "はいすい",
    "romaji": "haisui"
  },
  "排除": {
    "kana": "はいじょ",
    "romaji": "haijo"
  },
  "掘る": {
    "kana": "ほる",
    "romaji": "horu"
  },
  "採択": {
    "kana": "さいたく",
    "romaji": "saitaku"
  },
  "採決": {
    "kana": "さいけつ",
    "romaji": "saiketsu"
  },
  "採用": {
    "kana": "さいよう",
    "romaji": "saiyou"
  },
  "採算": {
    "kana": "さいさん",
    "romaji": "saisan"
  },
  "探す": {
    "kana": "さがす",
    "romaji": "sagasu"
  },
  "探せ": {
    "kana": "さがせ",
    "romaji": "sagase"
  },
  "探究": {
    "kana": "たんきゅう",
    "romaji": "tankyuu"
  },
  "接客": {
    "kana": "せっきゃく",
    "romaji": "sekkyaku"
  },
  "推計": {
    "kana": "すいけい",
    "romaji": "suikei"
  },
  "掲示": {
    "kana": "けいじ",
    "romaji": "keiji"
  },
  "掲載": {
    "kana": "けいさい",
    "romaji": "keisai"
  },
  "提供": {
    "kana": "ていきょう",
    "romaji": "teikyou"
  },
  "提出": {
    "kana": "ていしゅつ",
    "romaji": "teishutsu"
  },
  "提案": {
    "kana": "ていあん",
    "romaji": "teian"
  },
  "提示": {
    "kana": "ていじ",
    "romaji": "teiji"
  },
  "提言": {
    "kana": "ていげん",
    "romaji": "teigen"
  },
  "握る": {
    "kana": "にぎる",
    "romaji": "nigiru"
  },
  "携帯": {
    "kana": "けいたい",
    "romaji": "keitai"
  },
  "摂る": {
    "kana": "とる",
    "romaji": "toru"
  },
  "撤退": {
    "kana": "てったい",
    "romaji": "tettai"
  },
  "操作": {
    "kana": "そうさ",
    "romaji": "sousa"
  },
  "擦る": {
    "kana": "こする",
    "romaji": "kosoru"
  },
  "支出": {
    "kana": "ししゅつ",
    "romaji": "shishutsu"
  },
  "支払": {
    "kana": "しはらい",
    "romaji": "shiharai"
  },
  "支援": {
    "kana": "しえん",
    "romaji": "shien"
  },
  "支社": {
    "kana": "ししゃ",
    "romaji": "shisha"
  },
  "改修": {
    "kana": "かいしゅう",
    "romaji": "kaishuu"
  },
  "改善": {
    "kana": "かいぜん",
    "romaji": "kaizen"
  },
  "改変": {
    "kana": "かいへん",
    "romaji": "kaihen"
  },
  "改稿": {
    "kana": "かいこう",
    "romaji": "kaikou"
  },
  "改装": {
    "kana": "かいそう",
    "romaji": "kaisou"
  },
  "攻撃": {
    "kana": "こうげき",
    "romaji": "kougeki"
  },
  "放置": {
    "kana": "ほうち",
    "romaji": "houchi"
  },
  "政策": {
    "kana": "せいさく",
    "romaji": "seisaku"
  },
  "教員": {
    "kana": "きょういん",
    "romaji": "kyouin"
  },
  "教団": {
    "kana": "きょうだん",
    "romaji": "kyoudan"
  },
  "教室": {
    "kana": "きょうしつ",
    "romaji": "kyoushitsu"
  },
  "教師": {
    "kana": "きょうし",
    "romaji": "kyoushi"
  },
  "教授": {
    "kana": "きょうじゅ",
    "romaji": "kyouju"
  },
  "教訓": {
    "kana": "きょうくん",
    "romaji": "kyoukun"
  },
  "散歩": {
    "kana": "さんぽ",
    "romaji": "sanpo"
  },
  "散逸": {
    "kana": "さんいつ",
    "romaji": "san'itsu"
  },
  "敬意": {
    "kana": "けいい",
    "romaji": "keii"
  },
  "数人": {
    "kana": "すうにん",
    "romaji": "suunin"
  },
  "数値": {
    "kana": "すうち",
    "romaji": "suuchi"
  },
  "数字": {
    "kana": "すうじ",
    "romaji": "suuji"
  },
  "数学": {
    "kana": "すうがく",
    "romaji": "suugaku"
  },
  "数年": {
    "kana": "すうねん",
    "romaji": "suunen"
  },
  "数百": {
    "kana": "すうひゃく",
    "romaji": "suuhyaku"
  },
  "数秒": {
    "kana": "すうびょう",
    "romaji": "suubyou"
  },
  "整備": {
    "kana": "せいび",
    "romaji": "seibi"
  },
  "整理": {
    "kana": "せいり",
    "romaji": "seiri"
  },
  "敷居": {
    "kana": "しきい",
    "romaji": "shikii"
  },
  "敷衍": {
    "kana": "ふえん",
    "romaji": "fuen"
  },
  "文体": {
    "kana": "ぶんたい",
    "romaji": "buntai"
  },
  "文化": {
    "kana": "ぶんか",
    "romaji": "bunka"
  },
  "文句": {
    "kana": "もんく",
    "romaji": "monku"
  },
  "文字": {
    "kana": "もじ",
    "romaji": "moji"
  },
  "文法": {
    "kana": "ぶんぽう",
    "romaji": "bunpou"
  },
  "文献": {
    "kana": "ぶんけん",
    "romaji": "bunken"
  },
  "文集": {
    "kana": "ぶんしゅう",
    "romaji": "bunshuu"
  },
  "文章": {
    "kana": "ぶんしょう",
    "romaji": "bunshou"
  },
  "料理": {
    "kana": "りょうり",
    "romaji": "ryouri"
  },
  "料金": {
    "kana": "りょうきん",
    "romaji": "ryoukin"
  },
  "斜め": {
    "kana": "ななめ",
    "romaji": "hari"
  },
  "斜面": {
    "kana": "しゃめん",
    "romaji": "syamen"
  },
  "斟酌": {
    "kana": "しんしゃく",
    "romaji": "shinshaku"
  },
  "断定": {
    "kana": "だんてい",
    "romaji": "dantei"
  },
  "新人": {
    "kana": "しんじん",
    "romaji": "shinjin"
  },
  "新春": {
    "kana": "しんしゅん",
    "romaji": "shinshun"
  },
  "新聞": {
    "kana": "しんぶん",
    "romaji": "shinbun"
  },
  "新薬": {
    "kana": "しんやく",
    "romaji": "shinyaku"
  },
  "新規": {
    "kana": "しんき",
    "romaji": "shinki"
  },
  "方向": {
    "kana": "ほうこう",
    "romaji": "houkou"
  },
  "方式": {
    "kana": "ほうしき",
    "romaji": "houshiki"
  },
  "方法": {
    "kana": "ほうほう",
    "romaji": "houhou"
  },
  "方角": {
    "kana": "ほうがく",
    "romaji": "hougaku"
  },
  "方言": {
    "kana": "ほうげん",
    "romaji": "hougen"
  },
  "方針": {
    "kana": "ほうしん",
    "romaji": "houshin"
  },
  "旅先": {
    "kana": "たびさき",
    "romaji": "tabisaki"
  },
  "旅行": {
    "kana": "りょこう",
    "romaji": "ryokou"
  },
  "旅館": {
    "kana": "りょかん",
    "romaji": "ryokan"
  },
  "旋律": {
    "kana": "せんりつ",
    "romaji": "senritsu"
  },
  "既存": {
    "kana": "きぞん",
    "romaji": "kizon"
  },
  "日々": {
    "kana": "ひび",
    "romaji": "hibi"
  },
  "日付": {
    "kana": "ひづけ",
    "romaji": "hizuke"
  },
  "日前": {
    "kana": "にちまえ",
    "romaji": "nichimae"
  },
  "日差": {
    "kana": "ひざし",
    "romaji": "hizashi"
  },
  "日常": {
    "kana": "にちじょう",
    "romaji": "nichijou"
  },
  "日当": {
    "kana": "にっとう",
    "romaji": "nittou"
  },
  "日本": {
    "kana": "にほん",
    "romaji": "nihon"
  },
  "日記": {
    "kana": "にっき",
    "romaji": "nikki"
  },
  "旨味": {
    "kana": "うまみ",
    "romaji": "umami"
  },
  "早い": {
    "kana": "はやい",
    "romaji": "hayai"
  },
  "早く": {
    "kana": "はやく",
    "romaji": "hayaku"
  },
  "早朝": {
    "kana": "そうちょう",
    "romaji": "souchou"
  },
  "昆虫": {
    "kana": "こんちゅう",
    "romaji": "konchuu"
  },
  "昇華": {
    "kana": "しょうか",
    "romaji": "shouka"
  },
  "明快": {
    "kana": "めいかい",
    "romaji": "meikai"
  },
  "明日": {
    "kana": "あした",
    "romaji": "ashita"
  },
  "明確": {
    "kana": "めいかく",
    "romaji": "meikaku"
  },
  "星空": {
    "kana": "ほしぞら",
    "romaji": "hoshizora"
  },
  "映像": {
    "kana": "えいぞう",
    "romaji": "eizou"
  },
  "映画": {
    "kana": "えいが",
    "romaji": "eiga"
  },
  "昨夜": {
    "kana": "ゆうべ",
    "romaji": "yuube"
  },
  "昨年": {
    "kana": "さくねん",
    "romaji": "sakunen"
  },
  "昨日": {
    "kana": "きのう",
    "romaji": "kinou"
  },
  "是正": {
    "kana": "ぜせい",
    "romaji": "zesei"
  },
  "昼休": {
    "kana": "ひるきゅう",
    "romaji": "hiru kyuu"
  },
  "昼夜": {
    "kana": "ちゅうや",
    "romaji": "chuuya"
  },
  "昼過": {
    "kana": "ひるすぎ",
    "romaji": "hirusugi"
  },
  "昼間": {
    "kana": "ひるま",
    "romaji": "hiruma"
  },
  "昼食": {
    "kana": "ちゅうしょく",
    "romaji": "chuushoku"
  },
  "時々": {
    "kana": "ときどき",
    "romaji": "tokidoki"
  },
  "時代": {
    "kana": "じだい",
    "romaji": "jidai"
  },
  "時半": {
    "kana": "じはん",
    "romaji": "jihan"
  },
  "時期": {
    "kana": "じき",
    "romaji": "jiki"
  },
  "時計": {
    "kana": "とけい",
    "romaji": "tokei"
  },
  "時間": {
    "kana": "じかん",
    "romaji": "jikan"
  },
  "普及": {
    "kana": "ふきゅう",
    "romaji": "fukyuu"
  },
  "普段": {
    "kana": "ふだん",
    "romaji": "fudan"
  },
  "普通": {
    "kana": "ふつう",
    "romaji": "futsuu"
  },
  "景色": {
    "kana": "けしき",
    "romaji": "keshiki"
  },
  "景観": {
    "kana": "けいかん",
    "romaji": "keikan"
  },
  "晴れ": {
    "kana": "はれ",
    "romaji": "hare"
  },
  "晴天": {
    "kana": "せいてん",
    "romaji": "seiten"
  },
  "暑い": {
    "kana": "あつい",
    "romaji": "atsui"
  },
  "暇な": {
    "kana": "ひまな",
    "romaji": "himana"
  },
  "暖房": {
    "kana": "だんぼう",
    "romaji": "danbou"
  },
  "暗い": {
    "kana": "くらい",
    "romaji": "kurai"
  },
  "暗号": {
    "kana": "あんごう",
    "romaji": "angou"
  },
  "暗黙": {
    "kana": "あんもく",
    "romaji": "anmoku"
  },
  "暴挙": {
    "kana": "ぼうきょ",
    "romaji": "boukyo"
  },
  "曇り": {
    "kana": "くもり",
    "romaji": "kumori"
  },
  "曖昧": {
    "kana": "あいまい",
    "romaji": "aimai"
  },
  "更新": {
    "kana": "こうしん",
    "romaji": "koushin"
  },
  "書く": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "書中": {
    "kana": "しょちゅう",
    "romaji": "shochuu"
  },
  "書店": {
    "kana": "しょてん",
    "romaji": "shoten"
  },
  "書籍": {
    "kana": "しょせき",
    "romaji": "shoseki"
  },
  "書類": {
    "kana": "しょるい",
    "romaji": "shorui"
  },
  "月間": {
    "kana": "げっかん",
    "romaji": "gekkan"
  },
  "月額": {
    "kana": "げつがく",
    "romaji": "getsugaku"
  },
  "有る": {
    "kana": "ある",
    "romaji": "aru"
  },
  "有効": {
    "kana": "ゆうこう",
    "romaji": "yuukou"
  },
  "有名": {
    "kana": "ゆうめい",
    "romaji": "yuumei"
  },
  "有志": {
    "kana": "ゆうし",
    "romaji": "yuushi"
  },
  "有無": {
    "kana": "うむ",
    "romaji": "umu"
  },
  "有能": {
    "kana": "ゆうのう",
    "romaji": "yuunou"
  },
  "有限": {
    "kana": "ゆうげん",
    "romaji": "yuugen"
  },
  "朝夕": {
    "kana": "あさゆう",
    "romaji": "asayuu"
  },
  "朝市": {
    "kana": "あさいち",
    "romaji": "asaichi"
  },
  "朝採": {
    "kana": "あささい",
    "romaji": "asa sai"
  },
  "朝日": {
    "kana": "あさひ",
    "romaji": "asahi"
  },
  "朝早": {
    "kana": "あさそう",
    "romaji": "asa sou"
  },
  "朝礼": {
    "kana": "ちょうれい",
    "romaji": "chourei"
  },
  "期す": {
    "kana": "きす",
    "romaji": "kisu"
  },
  "期待": {
    "kana": "きたい",
    "romaji": "kitai"
  },
  "期間": {
    "kana": "きかん",
    "romaji": "kikan"
  },
  "期限": {
    "kana": "きげん",
    "romaji": "kigen"
  },
  "木星": {
    "kana": "もくせい",
    "romaji": "mokusei"
  },
  "木材": {
    "kana": "もくざい",
    "romaji": "mokuzai"
  },
  "木村": {
    "kana": "きむら",
    "romaji": "kimura"
  },
  "木片": {
    "kana": "もくへん",
    "romaji": "mokuhen"
  },
  "未然": {
    "kana": "みぜん",
    "romaji": "mizen"
  },
  "未知": {
    "kana": "みち",
    "romaji": "michi"
  },
  "本人": {
    "kana": "ほんにん",
    "romaji": "honnin"
  },
  "本当": {
    "kana": "ほんとう",
    "romaji": "hontou"
  },
  "本数": {
    "kana": "ほんすう",
    "romaji": "honsuu"
  },
  "本日": {
    "kana": "ほんじつ",
    "romaji": "honjitsu"
  },
  "本来": {
    "kana": "ほんらい",
    "romaji": "honrai"
  },
  "本棚": {
    "kana": "ほんだな",
    "romaji": "hondana"
  },
  "本状": {
    "kana": "ほんじょう",
    "romaji": "honjou"
  },
  "本社": {
    "kana": "ほんしゃ",
    "romaji": "honsha"
  },
  "本題": {
    "kana": "ほんだい",
    "romaji": "hondai"
  },
  "机上": {
    "kana": "きじょう",
    "romaji": "kijou"
  },
  "材料": {
    "kana": "ざいりょう",
    "romaji": "zairyou"
  },
  "村長": {
    "kana": "そんちょう",
    "romaji": "sonchou"
  },
  "条件": {
    "kana": "じょうけん",
    "romaji": "jouken"
  },
  "来る": {
    "kana": "くる",
    "romaji": "kuru"
  },
  "来年": {
    "kana": "らいねん",
    "romaji": "rainen"
  },
  "来店": {
    "kana": "らいてん",
    "romaji": "raiten"
  },
  "来月": {
    "kana": "らいげつ",
    "romaji": "raigetsu"
  },
  "来期": {
    "kana": "らいき",
    "romaji": "raiki"
  },
  "来歴": {
    "kana": "らいれき",
    "romaji": "raireki"
  },
  "来週": {
    "kana": "らいしゅう",
    "romaji": "raishuu"
  },
  "東京": {
    "kana": "とうきょう",
    "romaji": "Toukyou"
  },
  "東口": {
    "kana": "ひがしぐち",
    "romaji": "higashiguchi"
  },
  "林檎": {
    "kana": "りんご",
    "romaji": "ringo"
  },
  "果樹": {
    "kana": "かじゅ",
    "romaji": "kaju"
  },
  "果物": {
    "kana": "くだもの",
    "romaji": "kudamono"
  },
  "枠組": {
    "kana": "わくぐみ",
    "romaji": "wakugumi"
  },
  "枯渇": {
    "kana": "こかつ",
    "romaji": "kokatsu"
  },
  "架橋": {
    "kana": "かきょう",
    "romaji": "kakyou"
  },
  "染料": {
    "kana": "せんりょう",
    "romaji": "senryou"
  },
  "柔軟": {
    "kana": "じゅうなん",
    "romaji": "juunan"
  },
  "査収": {
    "kana": "さしゅう",
    "romaji": "sashuu"
  },
  "査読": {
    "kana": "さどく",
    "romaji": "sadoku"
  },
  "栄養": {
    "kana": "えいよう",
    "romaji": "eiyou"
  },
  "校庭": {
    "kana": "こうてい",
    "romaji": "koutei"
  },
  "核心": {
    "kana": "かくしん",
    "romaji": "kakushin"
  },
  "根回": {
    "kana": "ねかい",
    "romaji": "ne kai"
  },
  "根底": {
    "kana": "こんてい",
    "romaji": "kontei"
  },
  "根強": {
    "kana": "ねきょう",
    "romaji": "ne kyou"
  },
  "根拠": {
    "kana": "こんきょ",
    "romaji": "konkyo"
  },
  "根治": {
    "kana": "こんじ",
    "romaji": "konji"
  },
  "格別": {
    "kana": "かくべつ",
    "romaji": "kakubetsu"
  },
  "格差": {
    "kana": "かくさ",
    "romaji": "kakusa"
  },
  "格闘": {
    "kana": "かくとう",
    "romaji": "kakutou"
  },
  "栽培": {
    "kana": "さいばい",
    "romaji": "saibai"
  },
  "案内": {
    "kana": "あんない",
    "romaji": "annai"
  },
  "森林": {
    "kana": "しんりん",
    "romaji": "shinrin"
  },
  "椅子": {
    "kana": "いす",
    "romaji": "isu"
  },
  "植物": {
    "kana": "しょくぶつ",
    "romaji": "shokubutsu"
  },
  "検索": {
    "kana": "けんさく",
    "romaji": "kensaku"
  },
  "検討": {
    "kana": "けんとう",
    "romaji": "kentou"
  },
  "検診": {
    "kana": "けんしん",
    "romaji": "kenshin"
  },
  "検証": {
    "kana": "けんしょう",
    "romaji": "kenshou"
  },
  "業務": {
    "kana": "ぎょうむ",
    "romaji": "gyoumu"
  },
  "業者": {
    "kana": "ぎょうしゃ",
    "romaji": "gyousha"
  },
  "極限": {
    "kana": "きょくげん",
    "romaji": "kyokugen"
  },
  "概ね": {
    "kana": "おおむね",
    "romaji": "oomune"
  },
  "概念": {
    "kana": "がいねん",
    "romaji": "gainen"
  },
  "構文": {
    "kana": "こうぶん",
    "romaji": "koubun"
  },
  "構造": {
    "kana": "こうぞう",
    "romaji": "kouzou"
  },
  "様子": {
    "kana": "ようす",
    "romaji": "yousu"
  },
  "標的": {
    "kana": "ひょうてき",
    "romaji": "hyouteki"
  },
  "標高": {
    "kana": "ひょうこう",
    "romaji": "hyoukou"
  },
  "模倣": {
    "kana": "もほう",
    "romaji": "mohou"
  },
  "模索": {
    "kana": "もさく",
    "romaji": "mosaku"
  },
  "権利": {
    "kana": "けんり",
    "romaji": "kenri"
  },
  "権威": {
    "kana": "けんい",
    "romaji": "ken'i"
  },
  "横柄": {
    "kana": "おうへい",
    "romaji": "ouhei"
  },
  "樹木": {
    "kana": "じゅもく",
    "romaji": "jumoku"
  },
  "樹種": {
    "kana": "じゅしゅ",
    "romaji": "jushu"
  },
  "機会": {
    "kana": "きかい",
    "romaji": "kikai"
  },
  "機材": {
    "kana": "きざい",
    "romaji": "kizai"
  },
  "機械": {
    "kana": "きかい",
    "romaji": "kikai"
  },
  "機種": {
    "kana": "きしゅ",
    "romaji": "kishu"
  },
  "機能": {
    "kana": "きのう",
    "romaji": "kinou"
  },
  "機長": {
    "kana": "きちょう",
    "romaji": "kichou"
  },
  "機関": {
    "kana": "きかん",
    "romaji": "kikan"
  },
  "欠陥": {
    "kana": "けっかん",
    "romaji": "kekkan"
  },
  "次々": {
    "kana": "つぎつぎ",
    "romaji": "tsugitsugi"
  },
  "次の": {
    "kana": "つぎの",
    "romaji": "tsugi no"
  },
  "次元": {
    "kana": "じげん",
    "romaji": "jigen"
  },
  "次回": {
    "kana": "じかい",
    "romaji": "jikai"
  },
  "次第": {
    "kana": "しだい",
    "romaji": "shidai"
  },
  "欧米": {
    "kana": "おうべい",
    "romaji": "oubei"
  },
  "歌う": {
    "kana": "うたう",
    "romaji": "utau"
  },
  "歌詞": {
    "kana": "かし",
    "romaji": "kashi"
  },
  "歓声": {
    "kana": "かんせい",
    "romaji": "kansei"
  },
  "歓迎": {
    "kana": "かんげい",
    "romaji": "kangei"
  },
  "正式": {
    "kana": "せいしき",
    "romaji": "seishiki"
  },
  "正当": {
    "kana": "せいとう",
    "romaji": "seitou"
  },
  "正月": {
    "kana": "しょうがつ",
    "romaji": "shougatsu"
  },
  "正直": {
    "kana": "しょうじき",
    "romaji": "shoujiki"
  },
  "正確": {
    "kana": "せいかく",
    "romaji": "seikaku"
  },
  "正解": {
    "kana": "せいかい",
    "romaji": "seikai"
  },
  "正面": {
    "kana": "しょうめん",
    "romaji": "shoumen"
  },
  "歩く": {
    "kana": "あるく",
    "romaji": "aruku"
  },
  "歩調": {
    "kana": "ほちょう",
    "romaji": "hochou"
  },
  "歯切": {
    "kana": "はぎれ",
    "romaji": "hagire"
  },
  "歳刻": {
    "kana": "としこく",
    "romaji": "toshi koku"
  },
  "歳月": {
    "kana": "さいげつ",
    "romaji": "saigetsu"
  },
  "歴史": {
    "kana": "れきし",
    "romaji": "rekishi"
  },
  "死ぬ": {
    "kana": "しぬ",
    "romaji": "shinu"
  },
  "死角": {
    "kana": "しかく",
    "romaji": "shikaku"
  },
  "殆ど": {
    "kana": "ほとんど",
    "romaji": "hotondo"
  },
  "残り": {
    "kana": "のこり",
    "romaji": "nokori"
  },
  "残る": {
    "kana": "のこる",
    "romaji": "nokoru"
  },
  "残念": {
    "kana": "ざんねん",
    "romaji": "zannen"
  },
  "残業": {
    "kana": "ざんぎょう",
    "romaji": "zangyoushoku"
  },
  "段々": {
    "kana": "だんだん",
    "romaji": "dandan"
  },
  "段階": {
    "kana": "だんかい",
    "romaji": "dankai"
  },
  "殺す": {
    "kana": "ころす",
    "romaji": "korosu"
  },
  "殺到": {
    "kana": "さっとう",
    "romaji": "sattou"
  },
  "母語": {
    "kana": "ぼご",
    "romaji": "bogo"
  },
  "毎年": {
    "kana": "まいねん",
    "romaji": "mainen"
  },
  "毎日": {
    "kana": "まいにち",
    "romaji": "mainichi"
  },
  "毎晩": {
    "kana": "まいばん",
    "romaji": "maiban"
  },
  "毎月": {
    "kana": "まいつき",
    "romaji": "maitsuki"
  },
  "毎朝": {
    "kana": "まいあさ",
    "romaji": "maiasa"
  },
  "毎週": {
    "kana": "まいしゅう",
    "romaji": "maishuu"
  },
  "比率": {
    "kana": "ひりつ",
    "romaji": "hiritsu"
  },
  "毛布": {
    "kana": "もうふ",
    "romaji": "moufu"
  },
  "民家": {
    "kana": "みんか",
    "romaji": "minka"
  },
  "民宿": {
    "kana": "みんしゅく",
    "romaji": "minshuku"
  },
  "気候": {
    "kana": "きこう",
    "romaji": "kikou"
  },
  "気持": {
    "kana": "きもち",
    "romaji": "kimochi"
  },
  "気流": {
    "kana": "きりゅう",
    "romaji": "kiryuu"
  },
  "気温": {
    "kana": "きおん",
    "romaji": "kion"
  },
  "気軽": {
    "kana": "きがる",
    "romaji": "kigaru"
  },
  "気配": {
    "kana": "けはい",
    "romaji": "kehai"
  },
  "水分": {
    "kana": "すいぶん",
    "romaji": "suibun"
  },
  "水掛": {
    "kana": "みずがかり",
    "romaji": "mizugakari"
  },
  "水泳": {
    "kana": "すいえい",
    "romaji": "suiei"
  },
  "水田": {
    "kana": "すいでん",
    "romaji": "suiden"
  },
  "水質": {
    "kana": "すいしつ",
    "romaji": "suishitsu"
  },
  "水辺": {
    "kana": "すいへん",
    "romaji": "suihen"
  },
  "水道": {
    "kana": "すいどう",
    "romaji": "suidou"
  },
  "汗顔": {
    "kana": "かんがん",
    "romaji": "kangan"
  },
  "汚い": {
    "kana": "きたない",
    "romaji": "kitanai"
  },
  "汚す": {
    "kana": "よごす",
    "romaji": "yogosu"
  },
  "汚染": {
    "kana": "おせん",
    "romaji": "osen"
  },
  "決定": {
    "kana": "けってい",
    "romaji": "kettei"
  },
  "決心": {
    "kana": "けっしん",
    "romaji": "kesshin"
  },
  "決済": {
    "kana": "けっさい",
    "romaji": "kessai"
  },
  "決裂": {
    "kana": "けつれつ",
    "romaji": "ketsuretsu"
  },
  "沈黙": {
    "kana": "ちんもく",
    "romaji": "chinmoku"
  },
  "沢山": {
    "kana": "たくさん",
    "romaji": "takusan"
  },
  "河川": {
    "kana": "かせん",
    "romaji": "kasen"
  },
  "沸く": {
    "kana": "わく",
    "romaji": "waku"
  },
  "油断": {
    "kana": "ゆだん",
    "romaji": "yudan"
  },
  "治る": {
    "kana": "なおる",
    "romaji": "naoru"
  },
  "治療": {
    "kana": "ちりょう",
    "romaji": "chiryou"
  },
  "沿岸": {
    "kana": "えんがん",
    "romaji": "engan"
  },
  "波浪": {
    "kana": "はろう",
    "romaji": "harou"
  },
  "泣く": {
    "kana": "なく",
    "romaji": "naku"
  },
  "泥棒": {
    "kana": "どろぼう",
    "romaji": "dorobou"
  },
  "注射": {
    "kana": "ちゅうしゃ",
    "romaji": "chuusha"
  },
  "注意": {
    "kana": "ちゅうい",
    "romaji": "chuui"
  },
  "注文": {
    "kana": "ちゅうもん",
    "romaji": "chuumon"
  },
  "注目": {
    "kana": "ちゅうもく",
    "romaji": "chuumoku"
  },
  "泳ぐ": {
    "kana": "およぐ",
    "romaji": "oyogu"
  },
  "洗う": {
    "kana": "あらう",
    "romaji": "arau"
  },
  "洗濯": {
    "kana": "せんたく",
    "romaji": "sentaku"
  },
  "洪水": {
    "kana": "こうずい",
    "romaji": "kouzui"
  },
  "活動": {
    "kana": "かつどう",
    "romaji": "katsudou"
  },
  "活用": {
    "kana": "かつよう",
    "romaji": "katsuyou"
  },
  "活発": {
    "kana": "かっぱつ",
    "romaji": "kappatsu"
  },
  "流出": {
    "kana": "りゅうしゅつ",
    "romaji": "ryuushutsu"
  },
  "浅い": {
    "kana": "あさい",
    "romaji": "asai"
  },
  "浅草": {
    "kana": "あさくさ",
    "romaji": "asakusa"
  },
  "浪費": {
    "kana": "ろうひ",
    "romaji": "rouhi"
  },
  "浮上": {
    "kana": "ふじょう",
    "romaji": "fujou"
  },
  "海外": {
    "kana": "かいがい",
    "romaji": "kaigai"
  },
  "海岸": {
    "kana": "かいがん",
    "romaji": "kaigan"
  },
  "海底": {
    "kana": "かいてい",
    "romaji": "kaitei"
  },
  "海洋": {
    "kana": "かいよう",
    "romaji": "kaiyou"
  },
  "海辺": {
    "kana": "うみべ",
    "romaji": "umibe"
  },
  "消す": {
    "kana": "けす",
    "romaji": "kesu"
  },
  "涼風": {
    "kana": "すずかぜ",
    "romaji": "suzukaze"
  },
  "淘汰": {
    "kana": "とうた",
    "romaji": "touta"
  },
  "深い": {
    "kana": "ふかい",
    "romaji": "fukai"
  },
  "深刻": {
    "kana": "しんこく",
    "romaji": "shinkoku"
  },
  "深化": {
    "kana": "しんか",
    "romaji": "shinka"
  },
  "深謝": {
    "kana": "しんしゃ",
    "romaji": "shinsha"
  },
  "混入": {
    "kana": "こんにゅう",
    "romaji": "konnyuu"
  },
  "混在": {
    "kana": "こんざい",
    "romaji": "konzai"
  },
  "混雑": {
    "kana": "こんざつ",
    "romaji": "konzatsu"
  },
  "添う": {
    "kana": "そう",
    "romaji": "sou"
  },
  "添付": {
    "kana": "てんぷ",
    "romaji": "tenpu"
  },
  "清掃": {
    "kana": "せいそう",
    "romaji": "seisou"
  },
  "清栄": {
    "kana": "せいえい",
    "romaji": "seiei"
  },
  "渇水": {
    "kana": "かっすい",
    "romaji": "kassui"
  },
  "減光": {
    "kana": "げんこう",
    "romaji": "genkou"
  },
  "減少": {
    "kana": "げんしょう",
    "romaji": "genshou"
  },
  "渡す": {
    "kana": "わたす",
    "romaji": "watasu"
  },
  "渡る": {
    "kana": "わたる",
    "romaji": "wataru"
  },
  "温い": {
    "kana": "ぬるい",
    "romaji": "nurui"
  },
  "温存": {
    "kana": "おんぞん",
    "romaji": "onzon"
  },
  "温度": {
    "kana": "おんど",
    "romaji": "ondo"
  },
  "港町": {
    "kana": "みなとまち",
    "romaji": "minatomachi"
  },
  "湿度": {
    "kana": "しつど",
    "romaji": "shitsudo"
  },
  "満員": {
    "kana": "まんいん",
    "romaji": "man'in"
  },
  "満室": {
    "kana": "まんしつ",
    "romaji": "manshitsu"
  },
  "満潮": {
    "kana": "まんちょう",
    "romaji": "manchou"
  },
  "満足": {
    "kana": "まんぞく",
    "romaji": "manzoku"
  },
  "滞在": {
    "kana": "たいざい",
    "romaji": "taizai"
  },
  "滞留": {
    "kana": "たいりゅう",
    "romaji": "tairyuu"
  },
  "源泉": {
    "kana": "げんせん",
    "romaji": "gensen"
  },
  "準備": {
    "kana": "じゅんび",
    "romaji": "junbi"
  },
  "滑る": {
    "kana": "すべる",
    "romaji": "suberu"
  },
  "漁船": {
    "kana": "ぎょせん",
    "romaji": "gyosen"
  },
  "漂着": {
    "kana": "ひょうちゃく",
    "romaji": "hyouchaku"
  },
  "演出": {
    "kana": "えんしゅつ",
    "romaji": "enshutsu"
  },
  "演奏": {
    "kana": "えんそう",
    "romaji": "ensou"
  },
  "漢字": {
    "kana": "かんじ",
    "romaji": "kanji"
  },
  "漬物": {
    "kana": "つけもの",
    "romaji": "tsukemono"
  },
  "激励": {
    "kana": "げきれい",
    "romaji": "gekirei"
  },
  "激変": {
    "kana": "げきへん",
    "romaji": "gekihen"
  },
  "火事": {
    "kana": "かじ",
    "romaji": "kaji"
  },
  "灰皿": {
    "kana": "はいざら",
    "romaji": "haizara"
  },
  "災害": {
    "kana": "さいがい",
    "romaji": "saigai"
  },
  "点数": {
    "kana": "てんすう",
    "romaji": "tensuu"
  },
  "点検": {
    "kana": "てんけん",
    "romaji": "tenken"
  },
  "無事": {
    "kana": "ぶじ",
    "romaji": "buji"
  },
  "無償": {
    "kana": "むしょう",
    "romaji": "mushou"
  },
  "無念": {
    "kana": "むねん",
    "romaji": "munen"
  },
  "無料": {
    "kana": "むりょう",
    "romaji": "muryou"
  },
  "無断": {
    "kana": "むだん",
    "romaji": "mudan"
  },
  "無理": {
    "kana": "むり",
    "romaji": "muri"
  },
  "無視": {
    "kana": "むし",
    "romaji": "mushi"
  },
  "無難": {
    "kana": "ぶなん",
    "romaji": "bunan"
  },
  "無駄": {
    "kana": "むだ",
    "romaji": "muda"
  },
  "焦点": {
    "kana": "しょうてん",
    "romaji": "shouten"
  },
  "焼き": {
    "kana": "やき",
    "romaji": "yaki"
  },
  "焼く": {
    "kana": "やく",
    "romaji": "yaku"
  },
  "焼魚": {
    "kana": "やきざかな",
    "romaji": "yakizakana"
  },
  "煮る": {
    "kana": "にる",
    "romaji": "niru"
  },
  "照会": {
    "kana": "しょうかい",
    "romaji": "shoukai"
  },
  "照合": {
    "kana": "しょうごう",
    "romaji": "shougou"
  },
  "照明": {
    "kana": "しょうめい",
    "romaji": "shoumei"
  },
  "煩い": {
    "kana": "うるさい",
    "romaji": "urusai"
  },
  "煩雑": {
    "kana": "はんざつ",
    "romaji": "hanzatsu"
  },
  "蒸す": {
    "kana": "むす",
    "romaji": "musu"
  },
  "蒸発": {
    "kana": "じょうはつ",
    "romaji": "jouhatsu"
  },
  "熟練": {
    "kana": "じゅくれん",
    "romaji": "jukuren"
  },
  "熟議": {
    "kana": "じゅくぎ",
    "romaji": "jukugi"
  },
  "熱心": {
    "kana": "ねっしん",
    "romaji": "nesshin"
  },
  "熱水": {
    "kana": "ねっすい",
    "romaji": "nessui"
  },
  "黙認": {
    "kana": "もくにん",
    "romaji": "mokunin"
  },
  "片付": {
    "kana": "かたづけ",
    "romaji": "katazuke"
  },
  "牛乳": {
    "kana": "ぎゅうにゅう",
    "romaji": "gyuunyuu"
  },
  "牛肉": {
    "kana": "ぎゅうにく",
    "romaji": "gyuuniku"
  },
  "物差": {
    "kana": "ものさし",
    "romaji": "monosashi"
  },
  "物語": {
    "kana": "ものがたり",
    "romaji": "monogatari"
  },
  "特別": {
    "kana": "とくべつ",
    "romaji": "tokubetsu"
  },
  "特定": {
    "kana": "とくてい",
    "romaji": "tokutei"
  },
  "特急": {
    "kana": "とっきゅう",
    "romaji": "tokkyuu"
  },
  "特筆": {
    "kana": "とくひつ",
    "romaji": "tokuhitsu"
  },
  "牽引": {
    "kana": "けんいん",
    "romaji": "ken'in"
  },
  "犯罪": {
    "kana": "はんざい",
    "romaji": "hanzai"
  },
  "状況": {
    "kana": "じょうきょう",
    "romaji": "joukyou"
  },
  "独立": {
    "kana": "どくりつ",
    "romaji": "dokuritsu"
  },
  "独習": {
    "kana": "どくしゅう",
    "romaji": "dokushuu"
  },
  "独自": {
    "kana": "どくじ",
    "romaji": "dokuji"
  },
  "狭い": {
    "kana": "せまい",
    "romaji": "semai"
  },
  "猛暑": {
    "kana": "もうしょ",
    "romaji": "mousho"
  },
  "献立": {
    "kana": "こんだて",
    "romaji": "kondate"
  },
  "玄関": {
    "kana": "げんかん",
    "romaji": "genkan"
  },
  "率直": {
    "kana": "そっちょく",
    "romaji": "socchoku"
  },
  "玉葱": {
    "kana": "たまねぎ",
    "romaji": "tamanegi"
  },
  "玩具": {
    "kana": "おもちゃ",
    "romaji": "omocha"
  },
  "現代": {
    "kana": "げんだい",
    "romaji": "gendai"
  },
  "現在": {
    "kana": "げんざい",
    "romaji": "genzai"
  },
  "現地": {
    "kana": "げんち",
    "romaji": "genchi"
  },
  "現場": {
    "kana": "げんば",
    "romaji": "genba"
  },
  "現実": {
    "kana": "げんじつ",
    "romaji": "genjitsu"
  },
  "現状": {
    "kana": "げんじょう",
    "romaji": "genjou"
  },
  "現象": {
    "kana": "げんしょう",
    "romaji": "genshou"
  },
  "現金": {
    "kana": "げんきん",
    "romaji": "genkin"
  },
  "理想": {
    "kana": "りそう",
    "romaji": "risou"
  },
  "理由": {
    "kana": "りゆう",
    "romaji": "riyuu"
  },
  "理解": {
    "kana": "りかい",
    "romaji": "rikai"
  },
  "瑕疵": {
    "kana": "かし",
    "romaji": "kashi"
  },
  "環境": {
    "kana": "かんきょう",
    "romaji": "kankyou"
  },
  "瓦解": {
    "kana": "がかい",
    "romaji": "gakai"
  },
  "甘い": {
    "kana": "あまい",
    "romaji": "amai"
  },
  "生命": {
    "kana": "せいめい",
    "romaji": "seimei"
  },
  "生姜": {
    "kana": "しょうが",
    "romaji": "shouga"
  },
  "生徒": {
    "kana": "せいと",
    "romaji": "seito"
  },
  "生活": {
    "kana": "せいかつ",
    "romaji": "seikatsu"
  },
  "生涯": {
    "kana": "しょうがい",
    "romaji": "shougai"
  },
  "生煮": {
    "kana": "なまに",
    "romaji": "nama ni"
  },
  "生物": {
    "kana": "せいぶつ",
    "romaji": "seibutsu"
  },
  "生計": {
    "kana": "せいけい",
    "romaji": "seikei"
  },
  "生身": {
    "kana": "なまみ",
    "romaji": "namami"
  },
  "産地": {
    "kana": "さんち",
    "romaji": "sanchi"
  },
  "産業": {
    "kana": "さんぎょう",
    "romaji": "sangyou"
  },
  "用事": {
    "kana": "ようじ",
    "romaji": "youji"
  },
  "用件": {
    "kana": "ようけん",
    "romaji": "youken"
  },
  "用意": {
    "kana": "ようい",
    "romaji": "youi"
  },
  "用済": {
    "kana": "ようすみ",
    "romaji": "you sumi"
  },
  "田中": {
    "kana": "たなか",
    "romaji": "Tanaka"
  },
  "田園": {
    "kana": "でんえん",
    "romaji": "den'en"
  },
  "田畑": {
    "kana": "たはた",
    "romaji": "tahata"
  },
  "田舎": {
    "kana": "いなか",
    "romaji": "inaka"
  },
  "甲斐": {
    "kana": "かい",
    "romaji": "kai"
  },
  "画面": {
    "kana": "がめん",
    "romaji": "gamen"
  },
  "留学": {
    "kana": "りゅうがく",
    "romaji": "ryuugaku"
  },
  "略儀": {
    "kana": "りゃくぎ",
    "romaji": "ryakugi"
  },
  "略奪": {
    "kana": "りゃくだつ",
    "romaji": "ryakudatsu"
  },
  "異動": {
    "kana": "いどう",
    "romaji": "idou"
  },
  "異常": {
    "kana": "いじょう",
    "romaji": "ijou"
  },
  "異論": {
    "kana": "いろん",
    "romaji": "iron"
  },
  "異議": {
    "kana": "いぎ",
    "romaji": "igi"
  },
  "異質": {
    "kana": "いしつ",
    "romaji": "ishitsu"
  },
  "番人": {
    "kana": "ばんにん",
    "romaji": "bannin"
  },
  "番組": {
    "kana": "ばんぐみ",
    "romaji": "bangumi"
  },
  "疑問": {
    "kana": "ぎもん",
    "romaji": "gimon"
  },
  "疲れ": {
    "kana": "つかれ",
    "romaji": "tsukare"
  },
  "病気": {
    "kana": "びょうき",
    "romaji": "byouki"
  },
  "病状": {
    "kana": "びょうじょう",
    "romaji": "byoujou"
  },
  "病院": {
    "kana": "びょういん",
    "romaji": "byouin"
  },
  "痛い": {
    "kana": "いたい",
    "romaji": "itai"
  },
  "痛恨": {
    "kana": "つうこん",
    "romaji": "tsuukon"
  },
  "発効": {
    "kana": "はっこう",
    "romaji": "hakkou"
  },
  "発想": {
    "kana": "はっそう",
    "romaji": "hassou"
  },
  "発症": {
    "kana": "はっしょう",
    "romaji": "hasshou"
  },
  "発行": {
    "kana": "はっこう",
    "romaji": "hakkou"
  },
  "発表": {
    "kana": "はっぴょう",
    "romaji": "happyou"
  },
  "発見": {
    "kana": "はっけん",
    "romaji": "hakken"
  },
  "発覚": {
    "kana": "はっかく",
    "romaji": "hakkaku"
  },
  "発言": {
    "kana": "はつげん",
    "romaji": "hatsugen"
  },
  "発話": {
    "kana": "はつわ",
    "romaji": "hatsuwa"
  },
  "発送": {
    "kana": "はっそう",
    "romaji": "hassou"
  },
  "発達": {
    "kana": "はったつ",
    "romaji": "hattatsu"
  },
  "発音": {
    "kana": "はつおん",
    "romaji": "hatsuon"
  },
  "登る": {
    "kana": "のぼる",
    "romaji": "noboru"
  },
  "登山": {
    "kana": "とざん",
    "romaji": "tozan"
  },
  "登録": {
    "kana": "とうろく",
    "romaji": "touroku"
  },
  "白い": {
    "kana": "しろい",
    "romaji": "shiroi"
  },
  "白紙": {
    "kana": "はくし",
    "romaji": "hakushi"
  },
  "百人": {
    "kana": "ひゃくにん",
    "romaji": "hyakunin"
  },
  "百円": {
    "kana": "ひゃくえん",
    "romaji": "hyakuen"
  },
  "百年": {
    "kana": "ひゃくねん",
    "romaji": "hyakunen"
  },
  "百度": {
    "kana": "ひゃくど",
    "romaji": "hyaku do"
  },
  "益々": {
    "kana": "ますます",
    "romaji": "masumasu"
  },
  "盗む": {
    "kana": "ぬすむ",
    "romaji": "nusumu"
  },
  "監査": {
    "kana": "かんさ",
    "romaji": "kansa"
  },
  "監視": {
    "kana": "かんし",
    "romaji": "kanshi"
  },
  "目先": {
    "kana": "めさき",
    "romaji": "mesaki"
  },
  "目指": {
    "kana": "もくし",
    "romaji": "mokushi"
  },
  "目標": {
    "kana": "もくひょう",
    "romaji": "mokuhyou"
  },
  "目的": {
    "kana": "もくてき",
    "romaji": "mokuteki"
  },
  "目視": {
    "kana": "もくし",
    "romaji": "mokushi"
  },
  "目立": {
    "kana": "めだち",
    "romaji": "medachi"
  },
  "目覚": {
    "kana": "めざまし",
    "romaji": "mezamashi"
  },
  "目通": {
    "kana": "めとおり",
    "romaji": "me toori"
  },
  "盲点": {
    "kana": "もうてん",
    "romaji": "mouten"
  },
  "直す": {
    "kana": "なおす",
    "romaji": "naosu"
  },
  "直前": {
    "kana": "ちょくぜん",
    "romaji": "chokuzen"
  },
  "直後": {
    "kana": "ちょくご",
    "romaji": "chokugo"
  },
  "直接": {
    "kana": "ちょくせつ",
    "romaji": "chokusetsu"
  },
  "直結": {
    "kana": "ちょっけつ",
    "romaji": "chokketsu"
  },
  "直面": {
    "kana": "ちょくめん",
    "romaji": "chokumen"
  },
  "相場": {
    "kana": "そうば",
    "romaji": "souba"
  },
  "相手": {
    "kana": "あいて",
    "romaji": "aite"
  },
  "相次": {
    "kana": "あいつぎ",
    "romaji": "aitsugi"
  },
  "相談": {
    "kana": "そうだん",
    "romaji": "soudan"
  },
  "省略": {
    "kana": "しょうりゃく",
    "romaji": "shouryaku"
  },
  "看板": {
    "kana": "かんばん",
    "romaji": "kanban"
  },
  "看過": {
    "kana": "かんか",
    "romaji": "kanka"
  },
  "真価": {
    "kana": "しんか",
    "romaji": "shinka"
  },
  "真冬": {
    "kana": "まふゆ",
    "romaji": "mafuyu"
  },
  "真剣": {
    "kana": "しんけん",
    "romaji": "shinken"
  },
  "真理": {
    "kana": "しんり",
    "romaji": "shinri"
  },
  "眠い": {
    "kana": "ねむい",
    "romaji": "nemui"
  },
  "眼鏡": {
    "kana": "めがね",
    "romaji": "megane"
  },
  "着く": {
    "kana": "つく",
    "romaji": "tsuku"
  },
  "着る": {
    "kana": "きる",
    "romaji": "kiru"
  },
  "着実": {
    "kana": "ちゃくじつ",
    "romaji": "chakujitsu"
  },
  "着想": {
    "kana": "ちゃくそう",
    "romaji": "chakusou"
  },
  "着手": {
    "kana": "ちゃくしゅ",
    "romaji": "chakushu"
  },
  "着払": {
    "kana": "ちゃくばらい",
    "romaji": "chakubarai"
  },
  "着服": {
    "kana": "ちゃくふく",
    "romaji": "chakufuku"
  },
  "着物": {
    "kana": "きもの",
    "romaji": "kimono"
  },
  "睡眠": {
    "kana": "すいみん",
    "romaji": "suimin"
  },
  "瞬時": {
    "kana": "しゅんじ",
    "romaji": "shunji"
  },
  "瞬間": {
    "kana": "しゅんかん",
    "romaji": "shunkan"
  },
  "矛盾": {
    "kana": "むじゅん",
    "romaji": "mujun"
  },
  "知る": {
    "kana": "しる",
    "romaji": "shiru"
  },
  "知的": {
    "kana": "ちてき",
    "romaji": "chiteki"
  },
  "知見": {
    "kana": "ちけん",
    "romaji": "chiken"
  },
  "知覚": {
    "kana": "ちかく",
    "romaji": "chikaku"
  },
  "知識": {
    "kana": "ちしき",
    "romaji": "chishiki"
  },
  "短い": {
    "kana": "みじかい",
    "romaji": "mijikai"
  },
  "石鹸": {
    "kana": "せっけん",
    "romaji": "sekken"
  },
  "砂浜": {
    "kana": "すなはま",
    "romaji": "sunahama"
  },
  "砂糖": {
    "kana": "さとう",
    "romaji": "satou"
  },
  "研究": {
    "kana": "けんきゅう",
    "romaji": "kenkyuu"
  },
  "破る": {
    "kana": "やぶる",
    "romaji": "yaburu"
  },
  "硬直": {
    "kana": "こうちょく",
    "romaji": "kouchoku"
  },
  "硬貨": {
    "kana": "こうか",
    "romaji": "kouka"
  },
  "確保": {
    "kana": "かくほ",
    "romaji": "kakuho"
  },
  "確定": {
    "kana": "かくてい",
    "romaji": "kakutei"
  },
  "確認": {
    "kana": "かくにん",
    "romaji": "kakunin"
  },
  "磨く": {
    "kana": "みがく",
    "romaji": "migaku"
  },
  "示唆": {
    "kana": "しさ",
    "romaji": "shisa"
  },
  "社会": {
    "kana": "しゃかい",
    "romaji": "shakai"
  },
  "社内": {
    "kana": "しゃない",
    "romaji": "shanai"
  },
  "社員": {
    "kana": "しゃいん",
    "romaji": "shain"
  },
  "社外": {
    "kana": "しゃがい",
    "romaji": "shagai"
  },
  "社長": {
    "kana": "しゃちょう",
    "romaji": "shachou"
  },
  "祈る": {
    "kana": "いのる",
    "romaji": "inoru"
  },
  "祖母": {
    "kana": "そぼ",
    "romaji": "sobo"
  },
  "祖父": {
    "kana": "そふ",
    "romaji": "sofu"
  },
  "祝う": {
    "kana": "いわう",
    "romaji": "iwau"
  },
  "神社": {
    "kana": "じんじゃ",
    "romaji": "jinja"
  },
  "祭り": {
    "kana": "まつり",
    "romaji": "matsuri"
  },
  "視座": {
    "kana": "しざ",
    "romaji": "shiza"
  },
  "視点": {
    "kana": "してん",
    "romaji": "shiten"
  },
  "禁止": {
    "kana": "きんし",
    "romaji": "kinshi"
  },
  "禍根": {
    "kana": "かこん",
    "romaji": "kakon"
  },
  "福岡": {
    "kana": "ふくおか",
    "romaji": "fukuoka"
  },
  "私の": {
    "kana": "わたしの",
    "romaji": "watashi no"
  },
  "私財": {
    "kana": "しざい",
    "romaji": "shizai"
  },
  "科学": {
    "kana": "かがく",
    "romaji": "kagaku"
  },
  "秘匿": {
    "kana": "ひとく",
    "romaji": "hitoku"
  },
  "秘密": {
    "kana": "ひみつ",
    "romaji": "himitsu"
  },
  "称賛": {
    "kana": "しょうさん",
    "romaji": "shousan"
  },
  "移動": {
    "kana": "いどう",
    "romaji": "idou"
  },
  "移行": {
    "kana": "いこう",
    "romaji": "ikou"
  },
  "移転": {
    "kana": "いてん",
    "romaji": "iten"
  },
  "税金": {
    "kana": "ぜいきん",
    "romaji": "zeikin"
  },
  "稟議": {
    "kana": "りんぎ",
    "romaji": "ringi"
  },
  "種類": {
    "kana": "しゅるい",
    "romaji": "shurui"
  },
  "空気": {
    "kana": "くうき",
    "romaji": "kuuki"
  },
  "空港": {
    "kana": "くうこう",
    "romaji": "kuukou"
  },
  "空白": {
    "kana": "くうはく",
    "romaji": "kuuhaku"
  },
  "空論": {
    "kana": "くうろん",
    "romaji": "kuuron"
  },
  "空輸": {
    "kana": "くうゆ",
    "romaji": "kuuyu"
  },
  "空間": {
    "kana": "くうかん",
    "romaji": "kuukan"
  },
  "突く": {
    "kana": "つく",
    "romaji": "tsuku"
  },
  "突然": {
    "kana": "とつぜん",
    "romaji": "totsuzen"
  },
  "窃取": {
    "kana": "せっしゅ",
    "romaji": "sesshu"
  },
  "窓口": {
    "kana": "まどぐち",
    "romaji": "madoguchi"
  },
  "立つ": {
    "kana": "たつ",
    "romaji": "tatsu"
  },
  "立場": {
    "kana": "たちば",
    "romaji": "tachiba"
  },
  "立春": {
    "kana": "りっしゅん",
    "romaji": "risshun"
  },
  "立派": {
    "kana": "りっぱ",
    "romaji": "rippa"
  },
  "競る": {
    "kana": "せる",
    "romaji": "seru"
  },
  "笑う": {
    "kana": "わらう",
    "romaji": "warau"
  },
  "笑顔": {
    "kana": "えがお",
    "romaji": "egao"
  },
  "第三": {
    "kana": "だいさん",
    "romaji": "daisan"
  },
  "筆者": {
    "kana": "ひっしゃ",
    "romaji": "hissha"
  },
  "筋道": {
    "kana": "すじみち",
    "romaji": "sujimichi"
  },
  "答え": {
    "kana": "こたえ",
    "romaji": "kotae"
  },
  "箇所": {
    "kana": "かしょ",
    "romaji": "kasho"
  },
  "管理": {
    "kana": "かんり",
    "romaji": "kanri"
  },
  "簡単": {
    "kana": "かんたん",
    "romaji": "kantan"
  },
  "簡素": {
    "kana": "かんそ",
    "romaji": "kanso"
  },
  "精密": {
    "kana": "せいみつ",
    "romaji": "seimitsu"
  },
  "精巧": {
    "kana": "せいこう",
    "romaji": "seikou"
  },
  "精査": {
    "kana": "せいさ",
    "romaji": "seisa"
  },
  "精緻": {
    "kana": "せいち",
    "romaji": "seichi"
  },
  "糸口": {
    "kana": "いとぐち",
    "romaji": "itoguchi"
  },
  "約八": {
    "kana": "やくはち",
    "romaji": "yaku hachi"
  },
  "約束": {
    "kana": "やくそく",
    "romaji": "yakusoku"
  },
  "紅茶": {
    "kana": "こうちゃ",
    "romaji": "koucha"
  },
  "紅葉": {
    "kana": "こうよう",
    "romaji": "kouyou"
  },
  "納期": {
    "kana": "のうき",
    "romaji": "nouki"
  },
  "紛糾": {
    "kana": "ふんきゅう",
    "romaji": "funkyuu"
  },
  "素人": {
    "kana": "しろうと",
    "romaji": "shirouto"
  },
  "素敵": {
    "kana": "すてき",
    "romaji": "suteki"
  },
  "素晴": {
    "kana": "もとせい",
    "romaji": "moto sei"
  },
  "素材": {
    "kana": "そざい",
    "romaji": "sozai"
  },
  "素直": {
    "kana": "すなお",
    "romaji": "sunao"
  },
  "細い": {
    "kana": "ほそい",
    "romaji": "hosoi"
  },
  "紹介": {
    "kana": "しょうかい",
    "romaji": "shoukai"
  },
  "終了": {
    "kana": "しゅうりょう",
    "romaji": "shuuryou"
  },
  "終始": {
    "kana": "しゅうし",
    "romaji": "shuushi"
  },
  "終日": {
    "kana": "しゅうじつ",
    "romaji": "shuujitsu"
  },
  "組織": {
    "kana": "そしき",
    "romaji": "soshiki"
  },
  "経営": {
    "kana": "けいえい",
    "romaji": "keiei"
  },
  "経済": {
    "kana": "けいざい",
    "romaji": "keizai"
  },
  "経緯": {
    "kana": "けいい",
    "romaji": "keii"
  },
  "経路": {
    "kana": "けいろ",
    "romaji": "keiro"
  },
  "経験": {
    "kana": "けいけん",
    "romaji": "keiken"
  },
  "結ぶ": {
    "kana": "むすぶ",
    "romaji": "musubu"
  },
  "結婚": {
    "kana": "けっこん",
    "romaji": "kekkon"
  },
  "結局": {
    "kana": "けっきょく",
    "romaji": "kekkyoku"
  },
  "結果": {
    "kana": "けっか",
    "romaji": "kekka"
  },
  "結論": {
    "kana": "けつろん",
    "romaji": "ketsuron"
  },
  "給食": {
    "kana": "きゅうしょく",
    "romaji": "kyuushoku"
  },
  "統合": {
    "kana": "とうごう",
    "romaji": "tougou"
  },
  "統治": {
    "kana": "とうち",
    "romaji": "touchi"
  },
  "統計": {
    "kana": "とうけい",
    "romaji": "toukei"
  },
  "絵本": {
    "kana": "えほん",
    "romaji": "ehon"
  },
  "絶妙": {
    "kana": "ぜつみょう",
    "romaji": "zetsumyou"
  },
  "絶対": {
    "kana": "ぜったい",
    "romaji": "zettai"
  },
  "絶賛": {
    "kana": "ぜっさん",
    "romaji": "zessan"
  },
  "継承": {
    "kana": "けいしょう",
    "romaji": "keishou"
  },
  "継続": {
    "kana": "けいぞく",
    "romaji": "keizoku"
  },
  "続き": {
    "kana": "つづき",
    "romaji": "tsuzuki"
  },
  "続く": {
    "kana": "つづく",
    "romaji": "tsuzuku"
  },
  "維持": {
    "kana": "いじ",
    "romaji": "iji"
  },
  "網羅": {
    "kana": "もうら",
    "romaji": "moura"
  },
  "綺麗": {
    "kana": "きれい",
    "romaji": "kirei"
  },
  "綿密": {
    "kana": "めんみつ",
    "romaji": "menmitsu"
  },
  "緊張": {
    "kana": "きんちょう",
    "romaji": "kinchou"
  },
  "緊迫": {
    "kana": "きんぱく",
    "romaji": "kinpaku"
  },
  "総量": {
    "kana": "そうりょう",
    "romaji": "souryou"
  },
  "緑化": {
    "kana": "りょっか",
    "romaji": "ryokka"
  },
  "緑地": {
    "kana": "りょくち",
    "romaji": "ryokuchi"
  },
  "緩和": {
    "kana": "かんわ",
    "romaji": "kanwa"
  },
  "練習": {
    "kana": "れんしゅう",
    "romaji": "renshuu"
  },
  "緻密": {
    "kana": "ちみつ",
    "romaji": "chimitsu"
  },
  "縛る": {
    "kana": "しばる",
    "romaji": "shibaru"
  },
  "縮小": {
    "kana": "しゅくしょう",
    "romaji": "shukushou"
  },
  "繊細": {
    "kana": "せんさい",
    "romaji": "sensai"
  },
  "繋ぐ": {
    "kana": "つなぐ",
    "romaji": "tsunagu"
  },
  "置く": {
    "kana": "おく",
    "romaji": "oku"
  },
  "置け": {
    "kana": "おけ",
    "romaji": "oke"
  },
  "署名": {
    "kana": "しょめい",
    "romaji": "shomei"
  },
  "罰則": {
    "kana": "ばっそく",
    "romaji": "bassoku"
  },
  "美化": {
    "kana": "びか",
    "romaji": "bika"
  },
  "美観": {
    "kana": "びかん",
    "romaji": "bikan"
  },
  "翌日": {
    "kana": "よくじつ",
    "romaji": "yokujitsu"
  },
  "習う": {
    "kana": "ならう",
    "romaji": "narau"
  },
  "習得": {
    "kana": "しゅうとく",
    "romaji": "shuutoku"
  },
  "習慣": {
    "kana": "しゅうかん",
    "romaji": "shuukan"
  },
  "翻訳": {
    "kana": "ほんやく",
    "romaji": "honyaku"
  },
  "老人": {
    "kana": "ろうじん",
    "romaji": "roujin"
  },
  "老舗": {
    "kana": "しにせ",
    "romaji": "shinise"
  },
  "考証": {
    "kana": "こうしょう",
    "romaji": "koushou"
  },
  "耳当": {
    "kana": "みみとう",
    "romaji": "mimi tou"
  },
  "耳慣": {
    "kana": "みみかん",
    "romaji": "mimi kan"
  },
  "聞く": {
    "kana": "きく",
    "romaji": "kiku"
  },
  "聴衆": {
    "kana": "ちょうしゅう",
    "romaji": "choushuu"
  },
  "聴解": {
    "kana": "ちょうかい",
    "romaji": "choukai"
  },
  "職人": {
    "kana": "しょくにん",
    "romaji": "shokunin"
  },
  "職員": {
    "kana": "しょくいん",
    "romaji": "shokuin"
  },
  "職場": {
    "kana": "しょくば",
    "romaji": "shokuba"
  },
  "職業": {
    "kana": "しょくぎょう",
    "romaji": "shokugyou"
  },
  "職種": {
    "kana": "しょくしゅ",
    "romaji": "shokushu"
  },
  "肉眼": {
    "kana": "にくがん",
    "romaji": "nikugan"
  },
  "肝要": {
    "kana": "かんよう",
    "romaji": "kanyou"
  },
  "育成": {
    "kana": "いくせい",
    "romaji": "ikusei"
  },
  "背中": {
    "kana": "せなか",
    "romaji": "senaka"
  },
  "背信": {
    "kana": "はいしん",
    "romaji": "haishin"
  },
  "背景": {
    "kana": "はいけい",
    "romaji": "haikei"
  },
  "胡瓜": {
    "kana": "きゅうり",
    "romaji": "kyuuri"
  },
  "能力": {
    "kana": "のうりょく",
    "romaji": "nouryoku"
  },
  "脅威": {
    "kana": "きょうい",
    "romaji": "kyoui"
  },
  "脱ぐ": {
    "kana": "ぬぐ",
    "romaji": "nugu"
  },
  "脱却": {
    "kana": "だっきゃく",
    "romaji": "dakkyaku"
  },
  "腐る": {
    "kana": "くさる",
    "romaji": "kusaru"
  },
  "腸内": {
    "kana": "ちょうない",
    "romaji": "chounai"
  },
  "膠着": {
    "kana": "こうちゃく",
    "romaji": "kouchaku"
  },
  "膨大": {
    "kana": "ぼうだい",
    "romaji": "boudai"
  },
  "膨張": {
    "kana": "ぼうちょう",
    "romaji": "bouchou"
  },
  "自体": {
    "kana": "じたい",
    "romaji": "jitai"
  },
  "自作": {
    "kana": "じさく",
    "romaji": "jisaku"
  },
  "自分": {
    "kana": "じぶん",
    "romaji": "jibun"
  },
  "自動": {
    "kana": "じどう",
    "romaji": "jidou"
  },
  "自国": {
    "kana": "じこく",
    "romaji": "jikoku"
  },
  "自宅": {
    "kana": "じたく",
    "romaji": "jitaku"
  },
  "自己": {
    "kana": "じこ",
    "romaji": "jiko"
  },
  "自明": {
    "kana": "じめい",
    "romaji": "jimei"
  },
  "自然": {
    "kana": "しぜん",
    "romaji": "shizen"
  },
  "自由": {
    "kana": "じゆう",
    "romaji": "jiyuu"
  },
  "自覚": {
    "kana": "じかく",
    "romaji": "jikaku"
  },
  "至芸": {
    "kana": "しげい",
    "romaji": "shigei"
  },
  "興味": {
    "kana": "きょうみ",
    "romaji": "kyoumi"
  },
  "舞妓": {
    "kana": "まいこ",
    "romaji": "maiko"
  },
  "船便": {
    "kana": "ふなびん",
    "romaji": "funabin"
  },
  "良い": {
    "kana": "よい",
    "romaji": "yoi"
  },
  "良心": {
    "kana": "りょうしん",
    "romaji": "ryoushin"
  },
  "色々": {
    "kana": "いろいろ",
    "romaji": "iroiro"
  },
  "色彩": {
    "kana": "しきさい",
    "romaji": "shikisai"
  },
  "色調": {
    "kana": "しきちょう",
    "romaji": "shikichou"
  },
  "花壇": {
    "kana": "かだん",
    "romaji": "kadan"
  },
  "花屋": {
    "kana": "はなや",
    "romaji": "hanaya"
  },
  "花束": {
    "kana": "はなたば",
    "romaji": "hanataba"
  },
  "花火": {
    "kana": "はなび",
    "romaji": "hanabi"
  },
  "花瓶": {
    "kana": "かびん",
    "romaji": "kabin"
  },
  "花畑": {
    "kana": "はなはた",
    "romaji": "hanahata"
  },
  "若い": {
    "kana": "わかい",
    "romaji": "wakai"
  },
  "若手": {
    "kana": "わかて",
    "romaji": "wakate"
  },
  "若者": {
    "kana": "わかもの",
    "romaji": "wakamono"
  },
  "苦い": {
    "kana": "にがい",
    "romaji": "nigai"
  },
  "苦手": {
    "kana": "にがて",
    "romaji": "nigate"
  },
  "英語": {
    "kana": "えいご",
    "romaji": "eigo"
  },
  "茄子": {
    "kana": "なす",
    "romaji": "nasu"
  },
  "茶碗": {
    "kana": "ちゃわん",
    "romaji": "chawan"
  },
  "草案": {
    "kana": "そうあん",
    "romaji": "souan"
  },
  "荒廃": {
    "kana": "こうはい",
    "romaji": "kouhai"
  },
  "荷主": {
    "kana": "にぬし",
    "romaji": "ninushi"
  },
  "荷物": {
    "kana": "にもつ",
    "romaji": "nimotsu"
  },
  "荷造": {
    "kana": "にづくり",
    "romaji": "nizukuri"
  },
  "莫大": {
    "kana": "ばくだい",
    "romaji": "bakudai"
  },
  "菓子": {
    "kana": "かし",
    "romaji": "kashi"
  },
  "菜園": {
    "kana": "さいえん",
    "romaji": "saien"
  },
  "華々": {
    "kana": "はな々",
    "romaji": "hana"
  },
  "萎縮": {
    "kana": "いしゅく",
    "romaji": "ishuku"
  },
  "著名": {
    "kana": "ちょめい",
    "romaji": "chomei"
  },
  "著者": {
    "kana": "ちょしゃ",
    "romaji": "chosha"
  },
  "葉書": {
    "kana": "はがき",
    "romaji": "hagaki"
  },
  "葡萄": {
    "kana": "ぶどう",
    "romaji": "budou"
  },
  "蒔絵": {
    "kana": "まきえ",
    "romaji": "makie"
  },
  "蓄積": {
    "kana": "ちくせき",
    "romaji": "chikuseki"
  },
  "蔓延": {
    "kana": "まんえん",
    "romaji": "man'en"
  },
  "蔵書": {
    "kana": "ぞうしょ",
    "romaji": "zousho"
  },
  "薬屋": {
    "kana": "くすりや",
    "romaji": "kusuriya"
  },
  "薬缶": {
    "kana": "やかん",
    "romaji": "yakan"
  },
  "蛇口": {
    "kana": "じゃぐち",
    "romaji": "jaguchi"
  },
  "蜜柑": {
    "kana": "みかん",
    "romaji": "mikan"
  },
  "融合": {
    "kana": "ゆうごう",
    "romaji": "yuugou"
  },
  "融資": {
    "kana": "ゆうし",
    "romaji": "yuushi"
  },
  "血相": {
    "kana": "けっそう",
    "romaji": "kessou"
  },
  "行う": {
    "kana": "おこなう",
    "romaji": "okonau"
  },
  "行く": {
    "kana": "いく",
    "romaji": "iku"
  },
  "行け": {
    "kana": "いけ",
    "romaji": "ike"
  },
  "行事": {
    "kana": "ぎょうじ",
    "romaji": "gyouji"
  },
  "行列": {
    "kana": "ぎょうれつ",
    "romaji": "gyouretsu"
  },
  "行動": {
    "kana": "こうどう",
    "romaji": "koudou"
  },
  "行政": {
    "kana": "ぎょうせい",
    "romaji": "gyousei"
  },
  "行方": {
    "kana": "なめがた",
    "romaji": "namegata"
  },
  "行為": {
    "kana": "こうい",
    "romaji": "koui"
  },
  "行間": {
    "kana": "ぎょうかん",
    "romaji": "gyoukan"
  },
  "街並": {
    "kana": "まちなみ",
    "romaji": "machinami"
  },
  "街灯": {
    "kana": "がいとう",
    "romaji": "gaitou"
  },
  "衛星": {
    "kana": "えいせい",
    "romaji": "eisei"
  },
  "衝突": {
    "kana": "しょうとつ",
    "romaji": "shoutotsu"
  },
  "表情": {
    "kana": "ひょうじょう",
    "romaji": "hyoujou"
  },
  "表現": {
    "kana": "ひょうげん",
    "romaji": "hyougen"
  },
  "表示": {
    "kana": "ひょうじ",
    "romaji": "hyouji"
  },
  "表面": {
    "kana": "ひょうめん",
    "romaji": "hyoumen"
  },
  "被害": {
    "kana": "ひがい",
    "romaji": "higai"
  },
  "裁量": {
    "kana": "さいりょう",
    "romaji": "sairyou"
  },
  "裏付": {
    "kana": "うらづけ",
    "romaji": "urazuke"
  },
  "製品": {
    "kana": "せいひん",
    "romaji": "seihin"
  },
  "製造": {
    "kana": "せいぞう",
    "romaji": "seizou"
  },
  "複数": {
    "kana": "ふくすう",
    "romaji": "fukusuu"
  },
  "複雑": {
    "kana": "ふくざつ",
    "romaji": "fukuzatsu"
  },
  "西口": {
    "kana": "にしぐち",
    "romaji": "nishiguchi"
  },
  "西瓜": {
    "kana": "すいか",
    "romaji": "suika"
  },
  "要る": {
    "kana": "いる",
    "romaji": "iru"
  },
  "要件": {
    "kana": "ようけん",
    "romaji": "youken"
  },
  "要因": {
    "kana": "よういん",
    "romaji": "youin"
  },
  "要旨": {
    "kana": "ようし",
    "romaji": "youshi"
  },
  "要望": {
    "kana": "ようぼう",
    "romaji": "youbou"
  },
  "要求": {
    "kana": "ようきゅう",
    "romaji": "youkyuu"
  },
  "要点": {
    "kana": "ようてん",
    "romaji": "youten"
  },
  "要素": {
    "kana": "ようそ",
    "romaji": "youso"
  },
  "要請": {
    "kana": "ようせい",
    "romaji": "yousei"
  },
  "要領": {
    "kana": "ようりょう",
    "romaji": "youryou"
  },
  "覆す": {
    "kana": "くつがえす",
    "romaji": "kutsugaesu"
  },
  "覇権": {
    "kana": "はけん",
    "romaji": "haken"
  },
  "見た": {
    "kana": "みた",
    "romaji": "mita"
  },
  "見て": {
    "kana": "みて",
    "romaji": "mite"
  },
  "見る": {
    "kana": "みる",
    "romaji": "miru"
  },
  "見上": {
    "kana": "みかみ",
    "romaji": "mikami"
  },
  "見分": {
    "kana": "みわけ",
    "romaji": "miwake"
  },
  "見受": {
    "kana": "みうけ",
    "romaji": "miuke"
  },
  "見合": {
    "kana": "みあい",
    "romaji": "miai"
  },
  "見学": {
    "kana": "けんがく",
    "romaji": "kengaku"
  },
  "見守": {
    "kana": "けんしゅ",
    "romaji": "ken shu"
  },
  "見当": {
    "kana": "けんとう",
    "romaji": "kentou"
  },
  "見据": {
    "kana": "けんすえ",
    "romaji": "ken sue"
  },
  "見方": {
    "kana": "みかた",
    "romaji": "mikata"
  },
  "見直": {
    "kana": "みなおし",
    "romaji": "minaoshi"
  },
  "見知": {
    "kana": "けんち",
    "romaji": "kenchi"
  },
  "見積": {
    "kana": "みつもり",
    "romaji": "mitsumori"
  },
  "見解": {
    "kana": "けんかい",
    "romaji": "kenkai"
  },
  "見込": {
    "kana": "みこみ",
    "romaji": "mikomi"
  },
  "見逃": {
    "kana": "けんとう",
    "romaji": "ken tou"
  },
  "見通": {
    "kana": "みとおし",
    "romaji": "mitooshi"
  },
  "見過": {
    "kana": "けんか",
    "romaji": "ken ka"
  },
  "規則": {
    "kana": "きそく",
    "romaji": "kisoku"
  },
  "規定": {
    "kana": "きてい",
    "romaji": "kitei"
  },
  "覚悟": {
    "kana": "かくご",
    "romaji": "kakugo"
  },
  "親切": {
    "kana": "しんせつ",
    "romaji": "shinsetsu"
  },
  "親友": {
    "kana": "しんゆう",
    "romaji": "shinyuu"
  },
  "親戚": {
    "kana": "しんせき",
    "romaji": "shinseki"
  },
  "観光": {
    "kana": "かんこう",
    "romaji": "kankou"
  },
  "観客": {
    "kana": "かんきゃく",
    "romaji": "kankyaku"
  },
  "観察": {
    "kana": "かんさつ",
    "romaji": "kansatsu"
  },
  "観測": {
    "kana": "かんそく",
    "romaji": "kansoku"
  },
  "観衆": {
    "kana": "かんしゅう",
    "romaji": "kanshuu"
  },
  "解体": {
    "kana": "かいたい",
    "romaji": "kaitai"
  },
  "解明": {
    "kana": "かいめい",
    "romaji": "kaimei"
  },
  "解決": {
    "kana": "かいけつ",
    "romaji": "kaiketsu"
  },
  "解消": {
    "kana": "かいしょう",
    "romaji": "kaishou"
  },
  "解説": {
    "kana": "かいせつ",
    "romaji": "kaisetsu"
  },
  "解読": {
    "kana": "かいどく",
    "romaji": "kaidoku"
  },
  "解釈": {
    "kana": "かいしゃく",
    "romaji": "kaishaku"
  },
  "触る": {
    "kana": "さわる",
    "romaji": "sawaru"
  },
  "言う": {
    "kana": "いう",
    "romaji": "iu"
  },
  "言動": {
    "kana": "げんどう",
    "romaji": "gendou"
  },
  "言葉": {
    "kana": "ことば",
    "romaji": "kotoba"
  },
  "言語": {
    "kana": "げんご",
    "romaji": "gengo"
  },
  "計る": {
    "kana": "はかる",
    "romaji": "hakaru"
  },
  "計上": {
    "kana": "けいじょう",
    "romaji": "keijou"
  },
  "計画": {
    "kana": "けいかく",
    "romaji": "keikaku"
  },
  "計算": {
    "kana": "けいさん",
    "romaji": "keisan"
  },
  "訓練": {
    "kana": "くんれん",
    "romaji": "kunren"
  },
  "記事": {
    "kana": "きじ",
    "romaji": "kiji"
  },
  "記入": {
    "kana": "きにゅう",
    "romaji": "kinyuu"
  },
  "記憶": {
    "kana": "きおく",
    "romaji": "kioku"
  },
  "記者": {
    "kana": "きしゃ",
    "romaji": "kisha"
  },
  "記載": {
    "kana": "きさい",
    "romaji": "kisai"
  },
  "記述": {
    "kana": "きじゅつ",
    "romaji": "kijutsu"
  },
  "記録": {
    "kana": "きろく",
    "romaji": "kiroku"
  },
  "設備": {
    "kana": "せつび",
    "romaji": "setsubi"
  },
  "設定": {
    "kana": "せってい",
    "romaji": "settei"
  },
  "設置": {
    "kana": "せっち",
    "romaji": "setchi"
  },
  "設計": {
    "kana": "せっけい",
    "romaji": "sekkei"
  },
  "許可": {
    "kana": "きょか",
    "romaji": "kyoka"
  },
  "訳者": {
    "kana": "やくしゃ",
    "romaji": "yakusha"
  },
  "診断": {
    "kana": "しんだん",
    "romaji": "shindan"
  },
  "証人": {
    "kana": "しょうにん",
    "romaji": "shounin"
  },
  "証拠": {
    "kana": "しょうこ",
    "romaji": "shouko"
  },
  "評価": {
    "kana": "ひょうか",
    "romaji": "hyouka"
  },
  "試す": {
    "kana": "ためす",
    "romaji": "tamesu"
  },
  "試合": {
    "kana": "しあい",
    "romaji": "shiai"
  },
  "試練": {
    "kana": "しれん",
    "romaji": "shiren"
  },
  "試行": {
    "kana": "しこう",
    "romaji": "shikou"
  },
  "試験": {
    "kana": "しけん",
    "romaji": "shiken"
  },
  "話す": {
    "kana": "はなす",
    "romaji": "hanasu"
  },
  "話そ": {
    "kana": "はなそ",
    "romaji": "hanaso"
  },
  "話を": {
    "kana": "はなしを",
    "romaji": "hanashi o"
  },
  "話者": {
    "kana": "わしゃ",
    "romaji": "washa"
  },
  "話題": {
    "kana": "わだい",
    "romaji": "wadai"
  },
  "詳細": {
    "kana": "しょうさい",
    "romaji": "shousai"
  },
  "誇示": {
    "kana": "こじ",
    "romaji": "koji"
  },
  "誠実": {
    "kana": "せいじつ",
    "romaji": "seijitsu"
  },
  "認知": {
    "kana": "にんち",
    "romaji": "ninchi"
  },
  "認識": {
    "kana": "にんしき",
    "romaji": "ninshiki"
  },
  "誕生": {
    "kana": "たんじょう",
    "romaji": "tanjou"
  },
  "誘う": {
    "kana": "さそう",
    "romaji": "sasou"
  },
  "誘因": {
    "kana": "ゆういん",
    "romaji": "yuuin"
  },
  "誘導": {
    "kana": "ゆうどう",
    "romaji": "yuudou"
  },
  "語彙": {
    "kana": "ごい",
    "romaji": "goi"
  },
  "語気": {
    "kana": "ごき",
    "romaji": "goki"
  },
  "誤字": {
    "kana": "ごじ",
    "romaji": "goji"
  },
  "誤解": {
    "kana": "ごかい",
    "romaji": "gokai"
  },
  "誤訳": {
    "kana": "ごやく",
    "romaji": "goyaku"
  },
  "誤認": {
    "kana": "ごにん",
    "romaji": "gonin"
  },
  "説得": {
    "kana": "せっとく",
    "romaji": "settoku"
  },
  "説明": {
    "kana": "せつめい",
    "romaji": "setsumei"
  },
  "読む": {
    "kana": "よむ",
    "romaji": "yomu"
  },
  "読書": {
    "kana": "どくしょ",
    "romaji": "dokusho"
  },
  "読者": {
    "kana": "どくしゃ",
    "romaji": "dokusha"
  },
  "課長": {
    "kana": "かちょう",
    "romaji": "kachou"
  },
  "課題": {
    "kana": "かだい",
    "romaji": "kadai"
  },
  "調停": {
    "kana": "ちょうてい",
    "romaji": "choutei"
  },
  "調和": {
    "kana": "ちょうわ",
    "romaji": "chouwa"
  },
  "調子": {
    "kana": "ちょうし",
    "romaji": "choushi"
  },
  "調整": {
    "kana": "ちょうせい",
    "romaji": "chousei"
  },
  "調査": {
    "kana": "ちょうさ",
    "romaji": "chousa"
  },
  "調達": {
    "kana": "ちょうたつ",
    "romaji": "choutatsu"
  },
  "論文": {
    "kana": "ろんぶん",
    "romaji": "ronbun"
  },
  "論点": {
    "kana": "ろんてん",
    "romaji": "ronten"
  },
  "論理": {
    "kana": "ろんり",
    "romaji": "ronri"
  },
  "論考": {
    "kana": "ろんこう",
    "romaji": "ronkou"
  },
  "謙遜": {
    "kana": "けんそん",
    "romaji": "kenson"
  },
  "講師": {
    "kana": "こうし",
    "romaji": "koushi"
  },
  "謝る": {
    "kana": "あやまる",
    "romaji": "ayamaru"
  },
  "謝罪": {
    "kana": "しゃざい",
    "romaji": "shazai"
  },
  "警官": {
    "kana": "けいかん",
    "romaji": "keikan"
  },
  "警戒": {
    "kana": "けいかい",
    "romaji": "keikai"
  },
  "議事": {
    "kana": "ぎじ",
    "romaji": "giji"
  },
  "議場": {
    "kana": "ぎじょう",
    "romaji": "gijou"
  },
  "議論": {
    "kana": "ぎろん",
    "romaji": "giron"
  },
  "議題": {
    "kana": "ぎだい",
    "romaji": "gidai"
  },
  "譲歩": {
    "kana": "じょうほ",
    "romaji": "jouho"
  },
  "護岸": {
    "kana": "ごがん",
    "romaji": "gogan"
  },
  "豊富": {
    "kana": "ほうふ",
    "romaji": "houfu"
  },
  "豚肉": {
    "kana": "ぶたにく",
    "romaji": "butaniku"
  },
  "豪雨": {
    "kana": "ごうう",
    "romaji": "gouu"
  },
  "負担": {
    "kana": "ふたん",
    "romaji": "futan"
  },
  "負荷": {
    "kana": "ふか",
    "romaji": "fuka"
  },
  "財布": {
    "kana": "さいふ",
    "romaji": "saifu"
  },
  "財産": {
    "kana": "ざいさん",
    "romaji": "zaisan"
  },
  "貧困": {
    "kana": "ひんこん",
    "romaji": "hinkon"
  },
  "貧弱": {
    "kana": "ひんじゃく",
    "romaji": "hinjaku"
  },
  "責任": {
    "kana": "せきにん",
    "romaji": "sekinin"
  },
  "責務": {
    "kana": "せきむ",
    "romaji": "sekimu"
  },
  "貯金": {
    "kana": "ちょきん",
    "romaji": "chokin"
  },
  "貰う": {
    "kana": "もらう",
    "romaji": "morau"
  },
  "貴社": {
    "kana": "きしゃ",
    "romaji": "kisha"
  },
  "貴重": {
    "kana": "きちょう",
    "romaji": "kichou"
  },
  "買う": {
    "kana": "かう",
    "romaji": "kau"
  },
  "買収": {
    "kana": "ばいしゅう",
    "romaji": "baishuu"
  },
  "貸す": {
    "kana": "かす",
    "romaji": "kasu"
  },
  "貸出": {
    "kana": "たいしゅつ",
    "romaji": "taishutsu"
  },
  "費用": {
    "kana": "ひよう",
    "romaji": "hiyou"
  },
  "貼る": {
    "kana": "はる",
    "romaji": "haru"
  },
  "資料": {
    "kana": "しりょう",
    "romaji": "shiryou"
  },
  "資格": {
    "kana": "しかく",
    "romaji": "shikaku"
  },
  "資質": {
    "kana": "ししつ",
    "romaji": "shishitsu"
  },
  "資金": {
    "kana": "しきん",
    "romaji": "shikin"
  },
  "賜物": {
    "kana": "たまもの",
    "romaji": "tamamono"
  },
  "質問": {
    "kana": "しつもん",
    "romaji": "shitsumon"
  },
  "赤い": {
    "kana": "あかい",
    "romaji": "akai"
  },
  "赤面": {
    "kana": "せきめん",
    "romaji": "sekimen"
  },
  "走る": {
    "kana": "はしる",
    "romaji": "hashiru"
  },
  "起草": {
    "kana": "きそう",
    "romaji": "kisou"
  },
  "趣味": {
    "kana": "しゅみ",
    "romaji": "shumi"
  },
  "足元": {
    "kana": "あしもと",
    "romaji": "ashimoto"
  },
  "足腰": {
    "kana": "あしこし",
    "romaji": "ashikoshi"
  },
  "足音": {
    "kana": "あしおと",
    "romaji": "ashioto"
  },
  "足首": {
    "kana": "あしくび",
    "romaji": "ashikubi"
  },
  "距離": {
    "kana": "きょり",
    "romaji": "kyori"
  },
  "路線": {
    "kana": "ろせん",
    "romaji": "rosen"
  },
  "踊り": {
    "kana": "おどり",
    "romaji": "odori"
  },
  "踊る": {
    "kana": "おどる",
    "romaji": "odoru"
  },
  "踏め": {
    "kana": "ふめ",
    "romaji": "fume"
  },
  "踏襲": {
    "kana": "とうしゅう",
    "romaji": "toushuu"
  },
  "身体": {
    "kana": "しんたい",
    "romaji": "shintai"
  },
  "車両": {
    "kana": "しゃりょう",
    "romaji": "sharyou"
  },
  "車内": {
    "kana": "しゃない",
    "romaji": "shanai"
  },
  "車窓": {
    "kana": "しゃそう",
    "romaji": "shasou"
  },
  "車輪": {
    "kana": "しゃりん",
    "romaji": "sharin"
  },
  "軋轢": {
    "kana": "あつれき",
    "romaji": "atsureki"
  },
  "転嫁": {
    "kana": "てんか",
    "romaji": "tenka"
  },
  "転換": {
    "kana": "てんかん",
    "romaji": "tenkan"
  },
  "転職": {
    "kana": "てんしょく",
    "romaji": "tenshoku"
  },
  "転送": {
    "kana": "てんそう",
    "romaji": "tensou"
  },
  "軽い": {
    "kana": "かるい",
    "romaji": "karui"
  },
  "軽率": {
    "kana": "けいそつ",
    "romaji": "keisotsu"
  },
  "輝く": {
    "kana": "かがやく",
    "romaji": "kagayaku"
  },
  "輪郭": {
    "kana": "りんかく",
    "romaji": "rinkaku"
  },
  "輸送": {
    "kana": "ゆそう",
    "romaji": "yusou"
  },
  "辛い": {
    "kana": "からい",
    "romaji": "karai"
  },
  "辛さ": {
    "kana": "からさ",
    "romaji": "karasa"
  },
  "辞書": {
    "kana": "じしょ",
    "romaji": "jisho"
  },
  "農家": {
    "kana": "のうか",
    "romaji": "nouka"
  },
  "農業": {
    "kana": "のうぎょう",
    "romaji": "nougyou"
  },
  "迅速": {
    "kana": "じんそく",
    "romaji": "jinsoku"
  },
  "迎合": {
    "kana": "げいごう",
    "romaji": "geigou"
  },
  "近い": {
    "kana": "ちかい",
    "romaji": "chikai"
  },
  "近く": {
    "kana": "ちかく",
    "romaji": "chikaku"
  },
  "近年": {
    "kana": "きんねん",
    "romaji": "kinnen"
  },
  "近所": {
    "kana": "きんじょ",
    "romaji": "kinjo"
  },
  "近隣": {
    "kana": "きんりん",
    "romaji": "kinrin"
  },
  "返す": {
    "kana": "かえす",
    "romaji": "kaesu"
  },
  "返事": {
    "kana": "へんじ",
    "romaji": "henji"
  },
  "返信": {
    "kana": "へんしん",
    "romaji": "henshin"
  },
  "返却": {
    "kana": "へんきゃく",
    "romaji": "henkyaku"
  },
  "返答": {
    "kana": "へんとう",
    "romaji": "hentou"
  },
  "返納": {
    "kana": "へんのう",
    "romaji": "hennou"
  },
  "返送": {
    "kana": "へんそう",
    "romaji": "hensou"
  },
  "返還": {
    "kana": "へんかん",
    "romaji": "henkan"
  },
  "返金": {
    "kana": "へんきん",
    "romaji": "henkin"
  },
  "迫る": {
    "kana": "せまる",
    "romaji": "semaru"
  },
  "迷惑": {
    "kana": "めいわく",
    "romaji": "meiwaku"
  },
  "追求": {
    "kana": "ついきゅう",
    "romaji": "tsuikyuu"
  },
  "追認": {
    "kana": "ついにん",
    "romaji": "tsuinin"
  },
  "退官": {
    "kana": "たいかん",
    "romaji": "taikan"
  },
  "退屈": {
    "kana": "たいくつ",
    "romaji": "taikutsu"
  },
  "退職": {
    "kana": "たいしょく",
    "romaji": "taishoku"
  },
  "退色": {
    "kana": "たいしょく",
    "romaji": "taishoku"
  },
  "退院": {
    "kana": "たいいん",
    "romaji": "taiin"
  },
  "送る": {
    "kana": "おくる",
    "romaji": "okuru"
  },
  "送料": {
    "kana": "そうりょう",
    "romaji": "souryou"
  },
  "逆境": {
    "kana": "ぎゃっきょう",
    "romaji": "gyakkyou"
  },
  "逆説": {
    "kana": "ぎゃくせつ",
    "romaji": "gyakusetsu"
  },
  "途中": {
    "kana": "とちゅう",
    "romaji": "tochuu"
  },
  "途絶": {
    "kana": "とぜつ",
    "romaji": "tozetsu"
  },
  "通信": {
    "kana": "つうしん",
    "romaji": "tsuushin"
  },
  "通勤": {
    "kana": "つうきん",
    "romaji": "tsuukin"
  },
  "通告": {
    "kana": "つうこく",
    "romaji": "tsuukoku"
  },
  "通学": {
    "kana": "つうがく",
    "romaji": "tsuugaku"
  },
  "通知": {
    "kana": "つうち",
    "romaji": "tsuuchi"
  },
  "通説": {
    "kana": "つうせつ",
    "romaji": "tsuusetsu"
  },
  "通貨": {
    "kana": "つうか",
    "romaji": "tsuuka"
  },
  "通院": {
    "kana": "つういん",
    "romaji": "tsuuin"
  },
  "速い": {
    "kana": "はやい",
    "romaji": "hayai"
  },
  "速度": {
    "kana": "そくど",
    "romaji": "sokudo"
  },
  "連日": {
    "kana": "れんじつ",
    "romaji": "renjitsu"
  },
  "連絡": {
    "kana": "れんらく",
    "romaji": "renraku"
  },
  "連続": {
    "kana": "れんぞく",
    "romaji": "renzoku"
  },
  "連鎖": {
    "kana": "れんさ",
    "romaji": "rensa"
  },
  "週末": {
    "kana": "しゅうまつ",
    "romaji": "shuumatsu"
  },
  "進む": {
    "kana": "すすむ",
    "romaji": "susumu"
  },
  "進学": {
    "kana": "しんがく",
    "romaji": "shingaku"
  },
  "進展": {
    "kana": "しんてん",
    "romaji": "shinten"
  },
  "進捗": {
    "kana": "しんちょく",
    "romaji": "shinchoku"
  },
  "進歩": {
    "kana": "しんぽ",
    "romaji": "shinpo"
  },
  "進行": {
    "kana": "しんこう",
    "romaji": "shinkou"
  },
  "進路": {
    "kana": "しんろ",
    "romaji": "shinro"
  },
  "逸脱": {
    "kana": "いつだつ",
    "romaji": "itsudatsu"
  },
  "逼迫": {
    "kana": "ひっぱく",
    "romaji": "hippaku"
  },
  "遅い": {
    "kana": "おそい",
    "romaji": "osoi"
  },
  "遅く": {
    "kana": "おそく",
    "romaji": "osoku"
  },
  "遅刻": {
    "kana": "ちこく",
    "romaji": "chikoku"
  },
  "遅延": {
    "kana": "ちえん",
    "romaji": "chien"
  },
  "遊ぶ": {
    "kana": "あそぶ",
    "romaji": "asobu"
  },
  "運ぶ": {
    "kana": "はこぶ",
    "romaji": "hakobu"
  },
  "運べ": {
    "kana": "はこべ",
    "romaji": "hakobe"
  },
  "運動": {
    "kana": "うんどう",
    "romaji": "undou"
  },
  "運営": {
    "kana": "うんえい",
    "romaji": "un'ei"
  },
  "運搬": {
    "kana": "うんぱん",
    "romaji": "unpan"
  },
  "運用": {
    "kana": "うんよう",
    "romaji": "unyou"
  },
  "運賃": {
    "kana": "うんちん",
    "romaji": "unchin"
  },
  "運転": {
    "kana": "うんてん",
    "romaji": "unten"
  },
  "過信": {
    "kana": "かしん",
    "romaji": "kashin"
  },
  "過剰": {
    "kana": "かじょう",
    "romaji": "kajou"
  },
  "過去": {
    "kana": "かこ",
    "romaji": "kako"
  },
  "過度": {
    "kana": "かど",
    "romaji": "kado"
  },
  "過程": {
    "kana": "かてい",
    "romaji": "katei"
  },
  "過酷": {
    "kana": "かこく",
    "romaji": "kakoku"
  },
  "道具": {
    "kana": "どうぐ",
    "romaji": "dougu"
  },
  "道路": {
    "kana": "どうろ",
    "romaji": "douro"
  },
  "違い": {
    "kana": "ちがい",
    "romaji": "chigai"
  },
  "違う": {
    "kana": "ちがう",
    "romaji": "chigau"
  },
  "遠い": {
    "kana": "とおい",
    "romaji": "tooi"
  },
  "遠く": {
    "kana": "とおく",
    "romaji": "tooku"
  },
  "遠慮": {
    "kana": "えんりょ",
    "romaji": "enryo"
  },
  "遠方": {
    "kana": "えんぽう",
    "romaji": "enpou"
  },
  "遠足": {
    "kana": "えんそく",
    "romaji": "ensoku"
  },
  "遡及": {
    "kana": "そきゅう",
    "romaji": "sokyuu"
  },
  "適切": {
    "kana": "てきせつ",
    "romaji": "tekisetsu"
  },
  "適応": {
    "kana": "てきおう",
    "romaji": "tekiou"
  },
  "適正": {
    "kana": "てきせい",
    "romaji": "tekisei"
  },
  "適用": {
    "kana": "てきよう",
    "romaji": "tekiyou"
  },
  "遮断": {
    "kana": "しゃだん",
    "romaji": "shadan"
  },
  "遵守": {
    "kana": "じゅんしゅ",
    "romaji": "junshu"
  },
  "選ぶ": {
    "kana": "えらぶ",
    "romaji": "erabu"
  },
  "選手": {
    "kana": "せんしゅ",
    "romaji": "senshu"
  },
  "選択": {
    "kana": "せんたく",
    "romaji": "sentaku"
  },
  "遺憾": {
    "kana": "いかん",
    "romaji": "ikan"
  },
  "避難": {
    "kana": "ひなん",
    "romaji": "hinan"
  },
  "還元": {
    "kana": "かんげん",
    "romaji": "kangen"
  },
  "郊外": {
    "kana": "こうがい",
    "romaji": "kougai"
  },
  "部分": {
    "kana": "ぶぶん",
    "romaji": "bubun"
  },
  "部品": {
    "kana": "ぶひん",
    "romaji": "buhin"
  },
  "部員": {
    "kana": "ぶいん",
    "romaji": "buin"
  },
  "部屋": {
    "kana": "へや",
    "romaji": "heya"
  },
  "部活": {
    "kana": "ぶかつ",
    "romaji": "bukatsu"
  },
  "部署": {
    "kana": "ぶしょ",
    "romaji": "busho"
  },
  "部長": {
    "kana": "ぶちょう",
    "romaji": "buchou"
  },
  "部頼": {
    "kana": "ぶらい",
    "romaji": "bu rai"
  },
  "郵便": {
    "kana": "ゆうびん",
    "romaji": "yuubin"
  },
  "郵送": {
    "kana": "ゆうそう",
    "romaji": "yuusou"
  },
  "都会": {
    "kana": "とかい",
    "romaji": "tokai"
  },
  "都合": {
    "kana": "つごう",
    "romaji": "tsugou"
  },
  "都市": {
    "kana": "とし",
    "romaji": "toshi"
  },
  "配る": {
    "kana": "くばる",
    "romaji": "kubaru"
  },
  "配信": {
    "kana": "はいしん",
    "romaji": "haishin"
  },
  "配分": {
    "kana": "はいぶん",
    "romaji": "haibun"
  },
  "配置": {
    "kana": "はいち",
    "romaji": "haichi"
  },
  "配車": {
    "kana": "はいしゃ",
    "romaji": "haisha"
  },
  "醸成": {
    "kana": "じょうせい",
    "romaji": "jousei"
  },
  "里山": {
    "kana": "さとやま",
    "romaji": "satoyama"
  },
  "重い": {
    "kana": "おもい",
    "romaji": "omoi"
  },
  "重く": {
    "kana": "おもく",
    "romaji": "omoku"
  },
  "重大": {
    "kana": "じゅうだい",
    "romaji": "juudai"
  },
  "重心": {
    "kana": "じゅうしん",
    "romaji": "juushin"
  },
  "重機": {
    "kana": "じゅうき",
    "romaji": "juuki"
  },
  "重視": {
    "kana": "じゅうし",
    "romaji": "juushi"
  },
  "重複": {
    "kana": "ちょうふく",
    "romaji": "choufuku"
  },
  "重要": {
    "kana": "じゅうよう",
    "romaji": "juuyou"
  },
  "野球": {
    "kana": "やきゅう",
    "romaji": "yakyuu"
  },
  "野菜": {
    "kana": "やさい",
    "romaji": "yasai"
  },
  "金融": {
    "kana": "きんゆう",
    "romaji": "kinyuu"
  },
  "金魚": {
    "kana": "きんぎょ",
    "romaji": "kingyo"
  },
  "鈴木": {
    "kana": "すずき",
    "romaji": "suzuki"
  },
  "鉄道": {
    "kana": "てつどう",
    "romaji": "tetsudou"
  },
  "鉛筆": {
    "kana": "えんぴつ",
    "romaji": "enpitsu"
  },
  "銀行": {
    "kana": "ぎんこう",
    "romaji": "ginkou"
  },
  "銘柄": {
    "kana": "めいがら",
    "romaji": "meigara"
  },
  "錯綜": {
    "kana": "さくそう",
    "romaji": "sakusou"
  },
  "録音": {
    "kana": "ろくおん",
    "romaji": "rokuon"
  },
  "鎌倉": {
    "kana": "かまくら",
    "romaji": "kamakura"
  },
  "鑑賞": {
    "kana": "かんしょう",
    "romaji": "kanshou"
  },
  "長い": {
    "kana": "ながい",
    "romaji": "nagai"
  },
  "長大": {
    "kana": "ちょうだい",
    "romaji": "choudai"
  },
  "長年": {
    "kana": "ながねん",
    "romaji": "naganen"
  },
  "長引": {
    "kana": "ちょうひき",
    "romaji": "chou hiki"
  },
  "長文": {
    "kana": "ちょうぶん",
    "romaji": "choubun"
  },
  "長期": {
    "kana": "ちょうき",
    "romaji": "chouki"
  },
  "閉店": {
    "kana": "へいてん",
    "romaji": "heiten"
  },
  "閉館": {
    "kana": "へいかん",
    "romaji": "heikan"
  },
  "開催": {
    "kana": "かいさい",
    "romaji": "kaisai"
  },
  "開始": {
    "kana": "かいし",
    "romaji": "kaishi"
  },
  "開拓": {
    "kana": "かいたく",
    "romaji": "kaitaku"
  },
  "開発": {
    "kana": "かいはつ",
    "romaji": "kaihatsu"
  },
  "開示": {
    "kana": "かいじ",
    "romaji": "kaiji"
  },
  "開通": {
    "kana": "かいつう",
    "romaji": "kaitsuu"
  },
  "開館": {
    "kana": "かいかん",
    "romaji": "kaikan"
  },
  "閑散": {
    "kana": "かんさん",
    "romaji": "kansan"
  },
  "間口": {
    "kana": "まぐち",
    "romaji": "maiguchi"
  },
  "間合": {
    "kana": "まあい",
    "romaji": "maai"
  },
  "間違": {
    "kana": "かんい",
    "romaji": "kan i"
  },
  "関係": {
    "kana": "かんけい",
    "romaji": "kankei"
  },
  "閾値": {
    "kana": "いきち",
    "romaji": "ikichi"
  },
  "防ぐ": {
    "kana": "ふせぐ",
    "romaji": "fusegu"
  },
  "防災": {
    "kana": "ぼうさい",
    "romaji": "bousai"
  },
  "降る": {
    "kana": "ふる",
    "romaji": "furu"
  },
  "限る": {
    "kana": "かぎる",
    "romaji": "kagiru"
  },
  "限界": {
    "kana": "げんかい",
    "romaji": "genkai"
  },
  "陥穽": {
    "kana": "かんせい",
    "romaji": "kansei"
  },
  "陽気": {
    "kana": "ようき",
    "romaji": "youki"
  },
  "隆盛": {
    "kana": "りゅうせい",
    "romaji": "ryuusei"
  },
  "階段": {
    "kana": "かいだん",
    "romaji": "kaidan"
  },
  "隠蔽": {
    "kana": "いんぺい",
    "romaji": "inpei"
  },
  "集中": {
    "kana": "しゅうちゅう",
    "romaji": "shuuchuu"
  },
  "集団": {
    "kana": "しゅうだん",
    "romaji": "shuudan"
  },
  "集客": {
    "kana": "しゅうきゃく",
    "romaji": "shuukyaku"
  },
  "集計": {
    "kana": "しゅうけい",
    "romaji": "shuukei"
  },
  "雇用": {
    "kana": "こよう",
    "romaji": "koyou"
  },
  "雑煮": {
    "kana": "ぞうに",
    "romaji": "zouni"
  },
  "雑誌": {
    "kana": "ざっし",
    "romaji": "zasshi"
  },
  "離職": {
    "kana": "りしょく",
    "romaji": "rishoku"
  },
  "難航": {
    "kana": "なんこう",
    "romaji": "nankou"
  },
  "難解": {
    "kana": "なんかい",
    "romaji": "nankai"
  },
  "雨上": {
    "kana": "うじょう",
    "romaji": "ujou"
  },
  "雨具": {
    "kana": "あまぐ",
    "romaji": "amagu"
  },
  "雨水": {
    "kana": "あまみず",
    "romaji": "amamizu"
  },
  "雨漏": {
    "kana": "あまもり",
    "romaji": "amamori"
  },
  "雪深": {
    "kana": "ゆきしん",
    "romaji": "yuki shin"
  },
  "雷門": {
    "kana": "かみなりもん",
    "romaji": "kaminarimon"
  },
  "電力": {
    "kana": "でんりょく",
    "romaji": "denryoku"
  },
  "電子": {
    "kana": "でんし",
    "romaji": "denshi"
  },
  "電気": {
    "kana": "でんき",
    "romaji": "denki"
  },
  "電池": {
    "kana": "でんち",
    "romaji": "denchi"
  },
  "電波": {
    "kana": "でんぱ",
    "romaji": "denpa"
  },
  "電源": {
    "kana": "でんげん",
    "romaji": "dengen"
  },
  "電球": {
    "kana": "でんきゅう",
    "romaji": "denkyuu"
  },
  "電話": {
    "kana": "でんわ",
    "romaji": "denwa"
  },
  "電車": {
    "kana": "でんしゃ",
    "romaji": "densha"
  },
  "需要": {
    "kana": "じゅよう",
    "romaji": "juyou"
  },
  "露呈": {
    "kana": "ろてい",
    "romaji": "rotei"
  },
  "青い": {
    "kana": "あおい",
    "romaji": "aoi"
  },
  "青空": {
    "kana": "あおぞら",
    "romaji": "aozora"
  },
  "静か": {
    "kana": "しずか",
    "romaji": "shizuka"
  },
  "非常": {
    "kana": "ひじょう",
    "romaji": "hijou"
  },
  "非難": {
    "kana": "ひなん",
    "romaji": "hinan"
  },
  "面倒": {
    "kana": "めんどう",
    "romaji": "mendou"
  },
  "面接": {
    "kana": "めんせつ",
    "romaji": "mensetsu"
  },
  "面白": {
    "kana": "おもしろ",
    "romaji": "omoshiro"
  },
  "面積": {
    "kana": "めんせき",
    "romaji": "menseki"
  },
  "靴下": {
    "kana": "くつした",
    "romaji": "kutsushita"
  },
  "鞭撻": {
    "kana": "べんたつ",
    "romaji": "bentatsu"
  },
  "韓国": {
    "kana": "かんこく",
    "romaji": "kankoku"
  },
  "音声": {
    "kana": "おんせい",
    "romaji": "onsei"
  },
  "音楽": {
    "kana": "おんがく",
    "romaji": "ongaku"
  },
  "頂上": {
    "kana": "ちょうじょう",
    "romaji": "choujou"
  },
  "順番": {
    "kana": "じゅんばん",
    "romaji": "junban"
  },
  "預金": {
    "kana": "よきん",
    "romaji": "yokin"
  },
  "頓挫": {
    "kana": "とんざ",
    "romaji": "tonza"
  },
  "頭打": {
    "kana": "とうだ",
    "romaji": "touda"
  },
  "頼む": {
    "kana": "たのむ",
    "romaji": "tanomu"
  },
  "顔が": {
    "kana": "かおが",
    "romaji": "kao ga"
  },
  "顕著": {
    "kana": "けんちょ",
    "romaji": "kencho"
  },
  "顧問": {
    "kana": "こもん",
    "romaji": "komon"
  },
  "顧客": {
    "kana": "こきゃく",
    "romaji": "kokyaku"
  },
  "風力": {
    "kana": "ふうりょく",
    "romaji": "fuuryoku"
  },
  "風向": {
    "kana": "ふうこう",
    "romaji": "fuukou"
  },
  "風呂": {
    "kana": "ふろ",
    "romaji": "furo"
  },
  "風味": {
    "kana": "ふうみ",
    "romaji": "fuumi"
  },
  "風景": {
    "kana": "ふうけい",
    "romaji": "fuukei"
  },
  "風潮": {
    "kana": "ふうちょう",
    "romaji": "fuuchou"
  },
  "風評": {
    "kana": "ふうひょう",
    "romaji": "fuuhyou"
  },
  "風通": {
    "kana": "ふうつう",
    "romaji": "fuutsuu"
  },
  "風道": {
    "kana": "かざみち",
    "romaji": "kazamichi"
  },
  "風邪": {
    "kana": "かぜ",
    "romaji": "kaze"
  },
  "飛ぶ": {
    "kana": "とぶ",
    "romaji": "tobu"
  },
  "食事": {
    "kana": "しょくじ",
    "romaji": "shokuji"
  },
  "食品": {
    "kana": "しょくひん",
    "romaji": "shokuhin"
  },
  "食器": {
    "kana": "しょっき",
    "romaji": "shokki"
  },
  "食堂": {
    "kana": "しょくどう",
    "romaji": "shokudou"
  },
  "食材": {
    "kana": "しょくざい",
    "romaji": "shokuzai"
  },
  "食欲": {
    "kana": "しょくよく",
    "romaji": "shokuyoku"
  },
  "飲む": {
    "kana": "のむ",
    "romaji": "nomu"
  },
  "飲料": {
    "kana": "いんりょう",
    "romaji": "inryou"
  },
  "飼う": {
    "kana": "かう",
    "romaji": "kau"
  },
  "飽和": {
    "kana": "ほうわ",
    "romaji": "houwa"
  },
  "飾る": {
    "kana": "かざる",
    "romaji": "kazaru"
  },
  "館長": {
    "kana": "かんちょう",
    "romaji": "kanchou"
  },
  "駄目": {
    "kana": "だめ",
    "romaji": "dame"
  },
  "駅前": {
    "kana": "えきまえ",
    "romaji": "ekimae"
  },
  "駅員": {
    "kana": "えきいん",
    "romaji": "ekiin"
  },
  "驚く": {
    "kana": "おどろく",
    "romaji": "odoroku"
  },
  "驚嘆": {
    "kana": "きょうたん",
    "romaji": "kyoutan"
  },
  "骨格": {
    "kana": "こっかく",
    "romaji": "kokkaku"
  },
  "高い": {
    "kana": "たかい",
    "romaji": "takai"
  },
  "高く": {
    "kana": "たかく",
    "romaji": "takaku"
  },
  "高台": {
    "kana": "たかだい",
    "romaji": "takadai"
  },
  "高度": {
    "kana": "こうど",
    "romaji": "koudo"
  },
  "高校": {
    "kana": "こうこう",
    "romaji": "koukou"
  },
  "高橋": {
    "kana": "たかはし",
    "romaji": "takahashi"
  },
  "高温": {
    "kana": "こうおん",
    "romaji": "kouon"
  },
  "高覧": {
    "kana": "こうらん",
    "romaji": "kouran"
  },
  "高配": {
    "kana": "こうはい",
    "romaji": "kouhai"
  },
  "高騰": {
    "kana": "こうとう",
    "romaji": "koutou"
  },
  "高齢": {
    "kana": "こうれい",
    "romaji": "kourei"
  },
  "魅力": {
    "kana": "みりょく",
    "romaji": "miryoku"
  },
  "魚屋": {
    "kana": "さかなや",
    "romaji": "sakanaya"
  },
  "鮮度": {
    "kana": "せんど",
    "romaji": "sendo"
  },
  "鳴く": {
    "kana": "なく",
    "romaji": "naku"
  },
  "鶏肉": {
    "kana": "とりにく",
    "romaji": "toriniku"
  },
  "麦茶": {
    "kana": "むぎちゃ",
    "romaji": "mugicha"
  },
  "麻痺": {
    "kana": "まひ",
    "romaji": "mahi"
  },
  "黒い": {
    "kana": "くろい",
    "romaji": "kuroi"
  },
  "黒板": {
    "kana": "こくばん",
    "romaji": "kokuban"
  },
  "黒雲": {
    "kana": "くろくも",
    "romaji": "kurokumo"
  },
  "墨守": {
    "kana": "ぼくしゅ",
    "romaji": "bokushu"
  },
  "齟齬": {
    "kana": "そご",
    "romaji": "sogo"
  },
  "一": {
    "kana": "いち",
    "romaji": "ichi"
  },
  "七": {
    "kana": "なな",
    "romaji": "nana"
  },
  "万": {
    "kana": "まん",
    "romaji": "man"
  },
  "三": {
    "kana": "さん",
    "romaji": "san"
  },
  "上": {
    "kana": "うえ",
    "romaji": "ue"
  },
  "下": {
    "kana": "した",
    "romaji": "shita"
  },
  "与": {
    "kana": "よ",
    "romaji": "yo"
  },
  "並": {
    "kana": "なみ",
    "romaji": "nami"
  },
  "中": {
    "kana": "なか",
    "romaji": "naka"
  },
  "丸": {
    "kana": "まる",
    "romaji": "maru"
  },
  "主": {
    "kana": "しゅ",
    "romaji": "shu"
  },
  "久": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "乏": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "乗": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "九": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "乱": {
    "kana": "らん",
    "romaji": "ran"
  },
  "亀": {
    "kana": "かめ",
    "romaji": "kame"
  },
  "事": {
    "kana": "こと",
    "romaji": "koto"
  },
  "二": {
    "kana": "に",
    "romaji": "ni"
  },
  "互": {
    "kana": "ご",
    "romaji": "go"
  },
  "五": {
    "kana": "ご",
    "romaji": "go"
  },
  "交": {
    "kana": "こう",
    "romaji": "kou"
  },
  "人": {
    "kana": "ひと",
    "romaji": "hito"
  },
  "今": {
    "kana": "いま",
    "romaji": "ima"
  },
  "他": {
    "kana": "ほか",
    "romaji": "hoka"
  },
  "付": {
    "kana": "つき",
    "romaji": "tsuki"
  },
  "代": {
    "kana": "だい",
    "romaji": "dai"
  },
  "仲": {
    "kana": "なか",
    "romaji": "naka"
  },
  "任": {
    "kana": "にん",
    "romaji": "nin"
  },
  "休": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "会": {
    "kana": "かい",
    "romaji": "kai"
  },
  "伝": {
    "kana": "でん",
    "romaji": "den"
  },
  "伴": {
    "kana": "はん",
    "romaji": "han"
  },
  "伸": {
    "kana": "しん",
    "romaji": "shin"
  },
  "低": {
    "kana": "てい",
    "romaji": "tei"
  },
  "住": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "体": {
    "kana": "からだ",
    "romaji": "karada"
  },
  "何": {
    "kana": "なに",
    "romaji": "nani"
  },
  "余": {
    "kana": "よ",
    "romaji": "yo"
  },
  "作": {
    "kana": "さく",
    "romaji": "saku"
  },
  "使": {
    "kana": "し",
    "romaji": "shi"
  },
  "例": {
    "kana": "れい",
    "romaji": "rei"
  },
  "侮": {
    "kana": "ぶ",
    "romaji": "bu"
  },
  "係": {
    "kana": "かかり",
    "romaji": "kakari"
  },
  "促": {
    "kana": "そく",
    "romaji": "soku"
  },
  "保": {
    "kana": "ほ",
    "romaji": "ho"
  },
  "信": {
    "kana": "しん",
    "romaji": "shin"
  },
  "俺": {
    "kana": "おれ",
    "romaji": "ore"
  },
  "個": {
    "kana": "こ",
    "romaji": "ko"
  },
  "倒": {
    "kana": "とう",
    "romaji": "tou"
  },
  "借": {
    "kana": "しゃく",
    "romaji": "shaku"
  },
  "偏": {
    "kana": "へん",
    "romaji": "hen"
  },
  "停": {
    "kana": "てい",
    "romaji": "tei"
  },
  "側": {
    "kana": "そば",
    "romaji": "soba"
  },
  "傘": {
    "kana": "かさ",
    "romaji": "kasa"
  },
  "催": {
    "kana": "さい",
    "romaji": "sai"
  },
  "傷": {
    "kana": "きず",
    "romaji": "kizu"
  },
  "働": {
    "kana": "どう",
    "romaji": "dou"
  },
  "僕": {
    "kana": "ぼく",
    "romaji": "boku"
  },
  "優": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "兄": {
    "kana": "あに",
    "romaji": "ani"
  },
  "充": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "光": {
    "kana": "ひかり",
    "romaji": "hikari"
  },
  "免": {
    "kana": "めん",
    "romaji": "men"
  },
  "兎": {
    "kana": "うさぎ",
    "romaji": "usagi"
  },
  "入": {
    "kana": "にゅう",
    "romaji": "nyuu"
  },
  "八": {
    "kana": "はち",
    "romaji": "hachi"
  },
  "六": {
    "kana": "ろく",
    "romaji": "roku"
  },
  "共": {
    "kana": "とも",
    "romaji": "tomo"
  },
  "内": {
    "kana": "うち",
    "romaji": "uchi"
  },
  "再": {
    "kana": "さい",
    "romaji": "sai"
  },
  "最": {
    "kana": "さい",
    "romaji": "sai"
  },
  "写": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "冬": {
    "kana": "ふゆ",
    "romaji": "fuyu"
  },
  "冷": {
    "kana": "れい",
    "romaji": "rei"
  },
  "凝": {
    "kana": "ぎょう",
    "romaji": "gyou"
  },
  "出": {
    "kana": "しゅつ",
    "romaji": "shutsu"
  },
  "分": {
    "kana": "ふん",
    "romaji": "fun"
  },
  "切": {
    "kana": "せつ",
    "romaji": "setsu"
  },
  "列": {
    "kana": "れつ",
    "romaji": "retsu"
  },
  "初": {
    "kana": "はつ",
    "romaji": "hatsu"
  },
  "別": {
    "kana": "べつ",
    "romaji": "betsu"
  },
  "削": {
    "kana": "さく",
    "romaji": "saku"
  },
  "前": {
    "kana": "まえ",
    "romaji": "mae"
  },
  "割": {
    "kana": "わり",
    "romaji": "wari"
  },
  "力": {
    "kana": "ちから",
    "romaji": "chikara"
  },
  "加": {
    "kana": "か",
    "romaji": "ka"
  },
  "助": {
    "kana": "じょ",
    "romaji": "jo"
  },
  "効": {
    "kana": "こう",
    "romaji": "kou"
  },
  "動": {
    "kana": "どう",
    "romaji": "dou"
  },
  "勤": {
    "kana": "つとむ",
    "romaji": "tsutomu"
  },
  "勧": {
    "kana": "かん",
    "romaji": "kan"
  },
  "匂": {
    "kana": "にお",
    "romaji": "nio"
  },
  "北": {
    "kana": "きた",
    "romaji": "kita"
  },
  "十": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "千": {
    "kana": "せん",
    "romaji": "sen"
  },
  "半": {
    "kana": "はん",
    "romaji": "han"
  },
  "南": {
    "kana": "みなみ",
    "romaji": "minami"
  },
  "単": {
    "kana": "たん",
    "romaji": "tan"
  },
  "占": {
    "kana": "せん",
    "romaji": "sen"
  },
  "危": {
    "kana": "き",
    "romaji": "ki"
  },
  "即": {
    "kana": "そく",
    "romaji": "soku"
  },
  "卵": {
    "kana": "たまご",
    "romaji": "tamago"
  },
  "厚": {
    "kana": "あつし",
    "romaji": "atsushi"
  },
  "厳": {
    "kana": "げん",
    "romaji": "gen"
  },
  "去": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "及": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "友": {
    "kana": "とも",
    "romaji": "tomo"
  },
  "取": {
    "kana": "しゅ",
    "romaji": "shu"
  },
  "受": {
    "kana": "じゅ",
    "romaji": "ju"
  },
  "口": {
    "kana": "くち",
    "romaji": "kuchi"
  },
  "古": {
    "kana": "こ",
    "romaji": "ko"
  },
  "叫": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "右": {
    "kana": "みぎ",
    "romaji": "migi"
  },
  "合": {
    "kana": "ごう",
    "romaji": "gou"
  },
  "同": {
    "kana": "どう",
    "romaji": "dou"
  },
  "名": {
    "kana": "めい",
    "romaji": "mei"
  },
  "向": {
    "kana": "こう",
    "romaji": "kou"
  },
  "君": {
    "kana": "きみ",
    "romaji": "kimi"
  },
  "含": {
    "kana": "がん",
    "romaji": "gan"
  },
  "吹": {
    "kana": "すい",
    "romaji": "sui"
  },
  "味": {
    "kana": "あじ",
    "romaji": "aji"
  },
  "呼": {
    "kana": "こ",
    "romaji": "ko"
  },
  "命": {
    "kana": "いのち",
    "romaji": "inochi"
  },
  "和": {
    "kana": "わ",
    "romaji": "wa"
  },
  "咲": {
    "kana": "さき",
    "romaji": "saki"
  },
  "品": {
    "kana": "ひん",
    "romaji": "hin"
  },
  "問": {
    "kana": "とん",
    "romaji": "ton"
  },
  "営": {
    "kana": "えい",
    "romaji": "ei"
  },
  "嘆": {
    "kana": "たん",
    "romaji": "tan"
  },
  "嘘": {
    "kana": "うそ",
    "romaji": "uso"
  },
  "噂": {
    "kana": "うわさ",
    "romaji": "ue-no"
  },
  "噛": {
    "kana": "ごう",
    "romaji": "gou"
  },
  "噴": {
    "kana": "ふん",
    "romaji": "fun"
  },
  "器": {
    "kana": "うつわ",
    "romaji": "utsuwa"
  },
  "四": {
    "kana": "し",
    "romaji": "shi"
  },
  "回": {
    "kana": "かい",
    "romaji": "kai"
  },
  "困": {
    "kana": "こん",
    "romaji": "kon"
  },
  "固": {
    "kana": "こ",
    "romaji": "ko"
  },
  "国": {
    "kana": "くに",
    "romaji": "kuni"
  },
  "土": {
    "kana": "つち",
    "romaji": "tsuchi"
  },
  "地": {
    "kana": "ち",
    "romaji": "chi"
  },
  "坂": {
    "kana": "さか",
    "romaji": "saka"
  },
  "埋": {
    "kana": "まい",
    "romaji": "mai"
  },
  "基": {
    "kana": "もと",
    "romaji": "moto"
  },
  "場": {
    "kana": "ば",
    "romaji": "ba"
  },
  "塞": {
    "kana": "さい",
    "romaji": "sai"
  },
  "塩": {
    "kana": "しお",
    "romaji": "shio"
  },
  "塵": {
    "kana": "ごみ",
    "romaji": "gomi"
  },
  "増": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "壁": {
    "kana": "かべ",
    "romaji": "kabe"
  },
  "声": {
    "kana": "こえ",
    "romaji": "koe"
  },
  "売": {
    "kana": "ばい",
    "romaji": "bai"
  },
  "変": {
    "kana": "へん",
    "romaji": "hen"
  },
  "夏": {
    "kana": "なつ",
    "romaji": "natsu"
  },
  "外": {
    "kana": "そと",
    "romaji": "soto"
  },
  "多": {
    "kana": "た",
    "romaji": "ta"
  },
  "夜": {
    "kana": "よる",
    "romaji": "yoru"
  },
  "夢": {
    "kana": "ゆめ",
    "romaji": "yume"
  },
  "大": {
    "kana": "だい",
    "romaji": "dai"
  },
  "天": {
    "kana": "てん",
    "romaji": "ten"
  },
  "失": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "奥": {
    "kana": "おく",
    "romaji": "oku"
  },
  "奪": {
    "kana": "だつ",
    "romaji": "datsu"
  },
  "女": {
    "kana": "おんな",
    "romaji": "onna"
  },
  "好": {
    "kana": "こう",
    "romaji": "kou"
  },
  "妨": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "妹": {
    "kana": "いもうと",
    "romaji": "imouto"
  },
  "姉": {
    "kana": "あね",
    "romaji": "ane"
  },
  "始": {
    "kana": "し",
    "romaji": "shi"
  },
  "委": {
    "kana": "い",
    "romaji": "i"
  },
  "姿": {
    "kana": "すがた",
    "romaji": "sugata"
  },
  "嫌": {
    "kana": "いや",
    "romaji": "iya"
  },
  "子": {
    "kana": "こ",
    "romaji": "ko"
  },
  "孕": {
    "kana": "よう",
    "romaji": "you"
  },
  "学": {
    "kana": "がく",
    "romaji": "gaku"
  },
  "孫": {
    "kana": "まご",
    "romaji": "mago"
  },
  "守": {
    "kana": "しゅ",
    "romaji": "shu"
  },
  "安": {
    "kana": "あん",
    "romaji": "an"
  },
  "定": {
    "kana": "てい",
    "romaji": "tei"
  },
  "実": {
    "kana": "み",
    "romaji": "mi"
  },
  "客": {
    "kana": "きゃく",
    "romaji": "kyaku"
  },
  "家": {
    "kana": "いえ",
    "romaji": "ie"
  },
  "宿": {
    "kana": "やど",
    "romaji": "yado"
  },
  "寄": {
    "kana": "より",
    "romaji": "yori"
  },
  "寒": {
    "kana": "かん",
    "romaji": "kan"
  },
  "寝": {
    "kana": "ね",
    "romaji": "ne"
  },
  "寮": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "対": {
    "kana": "つい",
    "romaji": "tsui"
  },
  "尊": {
    "kana": "みこと",
    "romaji": "mikoto"
  },
  "尋": {
    "kana": "じん",
    "romaji": "jin"
  },
  "導": {
    "kana": "どう",
    "romaji": "dou"
  },
  "小": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "少": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "届": {
    "kana": "とどけ",
    "romaji": "todoke"
  },
  "屋": {
    "kana": "や",
    "romaji": "ya"
  },
  "層": {
    "kana": "そう",
    "romaji": "sou"
  },
  "山": {
    "kana": "やま",
    "romaji": "yama"
  },
  "岸": {
    "kana": "きし",
    "romaji": "kishi"
  },
  "島": {
    "kana": "しま",
    "romaji": "shima"
  },
  "川": {
    "kana": "かわ",
    "romaji": "kawa"
  },
  "左": {
    "kana": "ひだり",
    "romaji": "hidari"
  },
  "巧": {
    "kana": "こう",
    "romaji": "kou"
  },
  "差": {
    "kana": "さ",
    "romaji": "sa"
  },
  "市": {
    "kana": "し",
    "romaji": "shi"
  },
  "席": {
    "kana": "せき",
    "romaji": "seki"
  },
  "帰": {
    "kana": "き",
    "romaji": "ki"
  },
  "常": {
    "kana": "つね",
    "romaji": "tsune"
  },
  "幅": {
    "kana": "はば",
    "romaji": "haba"
  },
  "干": {
    "kana": "かん",
    "romaji": "kan"
  },
  "年": {
    "kana": "ねん",
    "romaji": "nen"
  },
  "広": {
    "kana": "こう",
    "romaji": "kou"
  },
  "床": {
    "kana": "ゆか",
    "romaji": "yuka"
  },
  "店": {
    "kana": "みせ",
    "romaji": "mise"
  },
  "座": {
    "kana": "ざ",
    "romaji": "za"
  },
  "庭": {
    "kana": "にわ",
    "romaji": "niwa"
  },
  "建": {
    "kana": "けん",
    "romaji": "ken"
  },
  "引": {
    "kana": "ひき",
    "romaji": "hiki"
  },
  "弟": {
    "kana": "おとうと",
    "romaji": "otouto"
  },
  "弱": {
    "kana": "じゃく",
    "romaji": "jaku"
  },
  "強": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "当": {
    "kana": "とう",
    "romaji": "tou"
  },
  "形": {
    "kana": "かたち",
    "romaji": "katachi"
  },
  "影": {
    "kana": "かげ",
    "romaji": "kage"
  },
  "彼": {
    "kana": "かれ",
    "romaji": "kare"
  },
  "待": {
    "kana": "たい",
    "romaji": "tai"
  },
  "後": {
    "kana": "あと",
    "romaji": "ato"
  },
  "得": {
    "kana": "え",
    "romaji": "e"
  },
  "心": {
    "kana": "こころ",
    "romaji": "kokoro"
  },
  "必": {
    "kana": "ひつ",
    "romaji": "hitsu"
  },
  "忘": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "忙": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "応": {
    "kana": "おう",
    "romaji": "ou"
  },
  "怖": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "思": {
    "kana": "おもい",
    "romaji": "omoi"
  },
  "急": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "恐": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "恵": {
    "kana": "めぐみ",
    "romaji": "megumi"
  },
  "悩": {
    "kana": "のう",
    "romaji": "nou"
  },
  "悪": {
    "kana": "あく",
    "romaji": "aku"
  },
  "惜": {
    "kana": "せき",
    "romaji": "seki"
  },
  "愛": {
    "kana": "あい",
    "romaji": "ai"
  },
  "感": {
    "kana": "かん",
    "romaji": "kan"
  },
  "慣": {
    "kana": "かん",
    "romaji": "kan"
  },
  "憩": {
    "kana": "けい",
    "romaji": "kei"
  },
  "懐": {
    "kana": "ふところ",
    "romaji": "futokoro"
  },
  "成": {
    "kana": "せい",
    "romaji": "sei"
  },
  "戻": {
    "kana": "れい",
    "romaji": "rei"
  },
  "所": {
    "kana": "ところ",
    "romaji": "tokoro"
  },
  "扉": {
    "kana": "とびら",
    "romaji": "tobira"
  },
  "手": {
    "kana": "て",
    "romaji": "te"
  },
  "打": {
    "kana": "だ",
    "romaji": "da"
  },
  "払": {
    "kana": "ふつ",
    "romaji": "futsu"
  },
  "扱": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "技": {
    "kana": "わざ",
    "romaji": "waza"
  },
  "抑": {
    "kana": "よく",
    "romaji": "yoku"
  },
  "投": {
    "kana": "とう",
    "romaji": "tou"
  },
  "抱": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "押": {
    "kana": "おう",
    "romaji": "ou"
  },
  "担": {
    "kana": "たん",
    "romaji": "tan"
  },
  "招": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "拭": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "拾": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "持": {
    "kana": "じ",
    "romaji": "ji"
  },
  "指": {
    "kana": "ゆび",
    "romaji": "yubi"
  },
  "挑": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "挙": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "捉": {
    "kana": "そく",
    "romaji": "soku"
  },
  "捨": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "排": {
    "kana": "はい",
    "romaji": "hai"
  },
  "採": {
    "kana": "さい",
    "romaji": "sai"
  },
  "控": {
    "kana": "ひかえ",
    "romaji": "hikae"
  },
  "推": {
    "kana": "すい",
    "romaji": "sui"
  },
  "掲": {
    "kana": "けい",
    "romaji": "kei"
  },
  "描": {
    "kana": "びょう",
    "romaji": "byou"
  },
  "換": {
    "kana": "かん",
    "romaji": "kan"
  },
  "握": {
    "kana": "あく",
    "romaji": "aku"
  },
  "揺": {
    "kana": "よう",
    "romaji": "you"
  },
  "損": {
    "kana": "そん",
    "romaji": "son"
  },
  "撮": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "支": {
    "kana": "し",
    "romaji": "shi"
  },
  "改": {
    "kana": "かい",
    "romaji": "kai"
  },
  "救": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "教": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "数": {
    "kana": "かず",
    "romaji": "kazu"
  },
  "整": {
    "kana": "せい",
    "romaji": "sei"
  },
  "敷": {
    "kana": "しき",
    "romaji": "shiki"
  },
  "新": {
    "kana": "しん",
    "romaji": "shin"
  },
  "方": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "旅": {
    "kana": "たび",
    "romaji": "tabi"
  },
  "日": {
    "kana": "にち",
    "romaji": "nichi"
  },
  "旨": {
    "kana": "むね",
    "romaji": "mune"
  },
  "早": {
    "kana": "そう",
    "romaji": "sou"
  },
  "明": {
    "kana": "めい",
    "romaji": "mei"
  },
  "昔": {
    "kana": "むかし",
    "romaji": "mukashi"
  },
  "星": {
    "kana": "ほし",
    "romaji": "hoshi"
  },
  "映": {
    "kana": "えい",
    "romaji": "ei"
  },
  "春": {
    "kana": "はる",
    "romaji": "haru"
  },
  "昼": {
    "kana": "ひる",
    "romaji": "hiru"
  },
  "時": {
    "kana": "じ",
    "romaji": "ji"
  },
  "晩": {
    "kana": "ばん",
    "romaji": "ban"
  },
  "晴": {
    "kana": "せい",
    "romaji": "sei"
  },
  "暑": {
    "kana": "しょ",
    "romaji": "sho"
  },
  "暇": {
    "kana": "ひま",
    "romaji": "hima"
  },
  "暖": {
    "kana": "だん",
    "romaji": "dan"
  },
  "暗": {
    "kana": "あん",
    "romaji": "an"
  },
  "暮": {
    "kana": "くれ",
    "romaji": "kure"
  },
  "暴": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "曲": {
    "kana": "きょく",
    "romaji": "kyoku"
  },
  "書": {
    "kana": "かき",
    "romaji": "kaki"
  },
  "替": {
    "kana": "かえ",
    "romaji": "kae"
  },
  "月": {
    "kana": "つき",
    "romaji": "tsuki"
  },
  "服": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "望": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "朝": {
    "kana": "あさ",
    "romaji": "asa"
  },
  "木": {
    "kana": "き",
    "romaji": "ki"
  },
  "本": {
    "kana": "ほん",
    "romaji": "hon"
  },
  "札": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "机": {
    "kana": "つくえ",
    "romaji": "tsukue"
  },
  "村": {
    "kana": "むら",
    "romaji": "mura"
  },
  "束": {
    "kana": "そく",
    "romaji": "soku"
  },
  "来": {
    "kana": "らい",
    "romaji": "rai"
  },
  "東": {
    "kana": "ひがし",
    "romaji": "higashi"
  },
  "枕": {
    "kana": "まくら",
    "romaji": "makura"
  },
  "林": {
    "kana": "はやし",
    "romaji": "hayashi"
  },
  "枚": {
    "kana": "まい",
    "romaji": "mai"
  },
  "果": {
    "kana": "か",
    "romaji": "ka"
  },
  "枝": {
    "kana": "えだ",
    "romaji": "eda"
  },
  "枠": {
    "kana": "わく",
    "romaji": "waku"
  },
  "柱": {
    "kana": "はしら",
    "romaji": "hashira"
  },
  "根": {
    "kana": "ね",
    "romaji": "ne"
  },
  "桃": {
    "kana": "もも",
    "romaji": "momo"
  },
  "桜": {
    "kana": "さくら",
    "romaji": "sakura"
  },
  "梅": {
    "kana": "うめ",
    "romaji": "ume"
  },
  "梨": {
    "kana": "なし",
    "romaji": "nashi"
  },
  "棚": {
    "kana": "たな",
    "romaji": "tana"
  },
  "森": {
    "kana": "もり",
    "romaji": "mori"
  },
  "植": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "極": {
    "kana": "きょく",
    "romaji": "kyoku"
  },
  "楽": {
    "kana": "らく",
    "romaji": "raku"
  },
  "横": {
    "kana": "よこ",
    "romaji": "yoko"
  },
  "橋": {
    "kana": "はし",
    "romaji": "hashi"
  },
  "櫛": {
    "kana": "くし",
    "romaji": "kushi"
  },
  "欠": {
    "kana": "けつ",
    "romaji": "ketsu"
  },
  "次": {
    "kana": "つぎ",
    "romaji": "tsugi"
  },
  "歌": {
    "kana": "うた",
    "romaji": "uta"
  },
  "止": {
    "kana": "し",
    "romaji": "shi"
  },
  "歩": {
    "kana": "ほ",
    "romaji": "ho"
  },
  "歪": {
    "kana": "ひずみ",
    "romaji": "hizumi"
  },
  "歯": {
    "kana": "は",
    "romaji": "ha"
  },
  "残": {
    "kana": "ざん",
    "romaji": "zan"
  },
  "母": {
    "kana": "はは",
    "romaji": "haha"
  },
  "比": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "毛": {
    "kana": "け",
    "romaji": "ke"
  },
  "気": {
    "kana": "き",
    "romaji": "ki"
  },
  "水": {
    "kana": "みず",
    "romaji": "mizu"
  },
  "氷": {
    "kana": "こおり",
    "romaji": "koori"
  },
  "汁": {
    "kana": "しる",
    "romaji": "shiru"
  },
  "求": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "決": {
    "kana": "けつ",
    "romaji": "ketsu"
  },
  "油": {
    "kana": "あぶら",
    "romaji": "abura"
  },
  "沿": {
    "kana": "えん",
    "romaji": "en"
  },
  "泊": {
    "kana": "はく",
    "romaji": "haku"
  },
  "波": {
    "kana": "なみ",
    "romaji": "nami"
  },
  "泣": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "泳": {
    "kana": "えい",
    "romaji": "ei"
  },
  "洗": {
    "kana": "せん",
    "romaji": "sen"
  },
  "流": {
    "kana": "りゅう",
    "romaji": "ryuu"
  },
  "浅": {
    "kana": "せん",
    "romaji": "sen"
  },
  "浮": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "海": {
    "kana": "うみ",
    "romaji": "umi"
  },
  "消": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "涙": {
    "kana": "なみだ",
    "romaji": "namida"
  },
  "涼": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "混": {
    "kana": "こん",
    "romaji": "kon"
  },
  "添": {
    "kana": "そえ",
    "romaji": "soe"
  },
  "減": {
    "kana": "げん",
    "romaji": "gen"
  },
  "渡": {
    "kana": "わたり",
    "romaji": "watari"
  },
  "温": {
    "kana": "おん",
    "romaji": "on"
  },
  "測": {
    "kana": "そく",
    "romaji": "soku"
  },
  "港": {
    "kana": "みなと",
    "romaji": "minato"
  },
  "湖": {
    "kana": "みずうみ",
    "romaji": "mizuumi"
  },
  "湿": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "満": {
    "kana": "まん",
    "romaji": "man"
  },
  "溶": {
    "kana": "よう",
    "romaji": "you"
  },
  "滑": {
    "kana": "かつ",
    "romaji": "katsu"
  },
  "漁": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "潜": {
    "kana": "せん",
    "romaji": "sen"
  },
  "澄": {
    "kana": "すみ",
    "romaji": "sumi"
  },
  "濁": {
    "kana": "だく",
    "romaji": "daku"
  },
  "火": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "点": {
    "kana": "てん",
    "romaji": "ten"
  },
  "焼": {
    "kana": "やき",
    "romaji": "yaki"
  },
  "照": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "熊": {
    "kana": "くま",
    "romaji": "kuma"
  },
  "熱": {
    "kana": "ねつ",
    "romaji": "netsu"
  },
  "黙": {
    "kana": "もく",
    "romaji": "moku"
  },
  "父": {
    "kana": "ちち",
    "romaji": "chichi"
  },
  "片": {
    "kana": "へん",
    "romaji": "hen"
  },
  "牛": {
    "kana": "うし",
    "romaji": "ushi"
  },
  "物": {
    "kana": "もの",
    "romaji": "mono"
  },
  "特": {
    "kana": "とく",
    "romaji": "toku"
  },
  "犬": {
    "kana": "いぬ",
    "romaji": "inu"
  },
  "狙": {
    "kana": "そ",
    "romaji": "so"
  },
  "狭": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "猫": {
    "kana": "ねこ",
    "romaji": "neko"
  },
  "猿": {
    "kana": "さる",
    "romaji": "saru"
  },
  "率": {
    "kana": "りつ",
    "romaji": "ritsu"
  },
  "玉": {
    "kana": "たま",
    "romaji": "tama"
  },
  "珍": {
    "kana": "ちん",
    "romaji": "chin"
  },
  "班": {
    "kana": "はん",
    "romaji": "han"
  },
  "現": {
    "kana": "げん",
    "romaji": "gen"
  },
  "生": {
    "kana": "なま",
    "romaji": "nama"
  },
  "用": {
    "kana": "よう",
    "romaji": "you"
  },
  "申": {
    "kana": "さる",
    "romaji": "saru"
  },
  "男": {
    "kana": "おとこ",
    "romaji": "otoko"
  },
  "町": {
    "kana": "まち",
    "romaji": "machi"
  },
  "畑": {
    "kana": "はたけ",
    "romaji": "hatake"
  },
  "留": {
    "kana": "りゅう",
    "romaji": "ryuu"
  },
  "異": {
    "kana": "い",
    "romaji": "i"
  },
  "畳": {
    "kana": "たたみ",
    "romaji": "tatami"
  },
  "疑": {
    "kana": "ぎ",
    "romaji": "gi"
  },
  "疲": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "痛": {
    "kana": "つう",
    "romaji": "tsuu"
  },
  "痩": {
    "kana": "そう",
    "romaji": "sou"
  },
  "癖": {
    "kana": "くせ",
    "romaji": "kuse"
  },
  "登": {
    "kana": "とう",
    "romaji": "tou"
  },
  "白": {
    "kana": "しろ",
    "romaji": "shiro"
  },
  "百": {
    "kana": "ひゃく",
    "romaji": "hyaku"
  },
  "皆": {
    "kana": "みんな",
    "romaji": "minna"
  },
  "皿": {
    "kana": "さら",
    "romaji": "sara"
  },
  "目": {
    "kana": "め",
    "romaji": "me"
  },
  "直": {
    "kana": "ちょく",
    "romaji": "choku"
  },
  "盾": {
    "kana": "たて",
    "romaji": "tate"
  },
  "眠": {
    "kana": "みん",
    "romaji": "min"
  },
  "眺": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "着": {
    "kana": "ちゃく",
    "romaji": "chaku"
  },
  "知": {
    "kana": "ち",
    "romaji": "chi"
  },
  "短": {
    "kana": "たん",
    "romaji": "tan"
  },
  "石": {
    "kana": "いし",
    "romaji": "ishi"
  },
  "砂": {
    "kana": "すな",
    "romaji": "suna"
  },
  "砕": {
    "kana": "さい",
    "romaji": "sai"
  },
  "確": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "磨": {
    "kana": "ま",
    "romaji": "ma"
  },
  "礎": {
    "kana": "いしずえ",
    "romaji": "ishizue"
  },
  "示": {
    "kana": "じ",
    "romaji": "ji"
  },
  "礼": {
    "kana": "れい",
    "romaji": "rei"
  },
  "祝": {
    "kana": "しゅく",
    "romaji": "shuku"
  },
  "祭": {
    "kana": "まつり",
    "romaji": "matsuri"
  },
  "私": {
    "kana": "わたし",
    "romaji": "watashi"
  },
  "秋": {
    "kana": "あき",
    "romaji": "aki"
  },
  "移": {
    "kana": "い",
    "romaji": "i"
  },
  "種": {
    "kana": "たね",
    "romaji": "tane"
  },
  "積": {
    "kana": "せき",
    "romaji": "seki"
  },
  "空": {
    "kana": "そら",
    "romaji": "sora"
  },
  "突": {
    "kana": "とつ",
    "romaji": "totsu"
  },
  "窓": {
    "kana": "まど",
    "romaji": "mado"
  },
  "立": {
    "kana": "りつ",
    "romaji": "ritsu"
  },
  "競": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "竹": {
    "kana": "たけ",
    "romaji": "take"
  },
  "笑": {
    "kana": "わら",
    "romaji": "wara"
  },
  "答": {
    "kana": "こたえ",
    "romaji": "kotae"
  },
  "箱": {
    "kana": "はこ",
    "romaji": "hako"
  },
  "築": {
    "kana": "ちく",
    "romaji": "chiku"
  },
  "米": {
    "kana": "こめ",
    "romaji": "kome"
  },
  "糊": {
    "kana": "のり",
    "romaji": "nori"
  },
  "紙": {
    "kana": "かみ",
    "romaji": "kami"
  },
  "紫": {
    "kana": "むらさき",
    "romaji": "murasaki"
  },
  "細": {
    "kana": "さい",
    "romaji": "sai"
  },
  "終": {
    "kana": "おわり",
    "romaji": "owari"
  },
  "組": {
    "kana": "くみ",
    "romaji": "kumi"
  },
  "結": {
    "kana": "けつ",
    "romaji": "ketsu"
  },
  "絞": {
    "kana": "こう",
    "romaji": "kou"
  },
  "絵": {
    "kana": "え",
    "romaji": "e"
  },
  "絶": {
    "kana": "ぜつ",
    "romaji": "zetsu"
  },
  "継": {
    "kana": "けい",
    "romaji": "kei"
  },
  "続": {
    "kana": "ぞく",
    "romaji": "zoku"
  },
  "緑": {
    "kana": "みどり",
    "romaji": "midori"
  },
  "締": {
    "kana": "てい",
    "romaji": "tei"
  },
  "緩": {
    "kana": "かん",
    "romaji": "kan"
  },
  "縦": {
    "kana": "たて",
    "romaji": "tate"
  },
  "繋": {
    "kana": "けい",
    "romaji": "kei"
  },
  "繰": {
    "kana": "そう",
    "romaji": "sou"
  },
  "缶": {
    "kana": "かん",
    "romaji": "kan"
  },
  "置": {
    "kana": "ち",
    "romaji": "chi"
  },
  "羊": {
    "kana": "ひつじ",
    "romaji": "hitsuji"
  },
  "習": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "考": {
    "kana": "こう",
    "romaji": "kou"
  },
  "者": {
    "kana": "もの",
    "romaji": "mono"
  },
  "耐": {
    "kana": "たい",
    "romaji": "tai"
  },
  "耳": {
    "kana": "みみ",
    "romaji": "mimi"
  },
  "聞": {
    "kana": "ぶん",
    "romaji": "bun"
  },
  "肉": {
    "kana": "にく",
    "romaji": "niku"
  },
  "肩": {
    "kana": "かた",
    "romaji": "kata"
  },
  "育": {
    "kana": "いく",
    "romaji": "iku"
  },
  "胸": {
    "kana": "むね",
    "romaji": "mune"
  },
  "脆": {
    "kana": "ぜい",
    "romaji": "zei"
  },
  "脱": {
    "kana": "だつ",
    "romaji": "datsu"
  },
  "腕": {
    "kana": "うで",
    "romaji": "ude"
  },
  "腰": {
    "kana": "こし",
    "romaji": "koshi"
  },
  "自": {
    "kana": "じ",
    "romaji": "ji"
  },
  "至": {
    "kana": "いた",
    "romaji": "ita"
  },
  "船": {
    "kana": "ふね",
    "romaji": "fune"
  },
  "良": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "色": {
    "kana": "いろ",
    "romaji": "iro"
  },
  "芋": {
    "kana": "いも",
    "romaji": "imo"
  },
  "花": {
    "kana": "はな",
    "romaji": "hana"
  },
  "若": {
    "kana": "じゃく",
    "romaji": "jaku"
  },
  "苺": {
    "kana": "いちご",
    "romaji": "ichigo"
  },
  "茶": {
    "kana": "ちゃ",
    "romaji": "cha"
  },
  "草": {
    "kana": "くさ",
    "romaji": "kusa"
  },
  "著": {
    "kana": "ちょ",
    "romaji": "cho"
  },
  "落": {
    "kana": "らく",
    "romaji": "raku"
  },
  "葉": {
    "kana": "は",
    "romaji": "ha"
  },
  "蓄": {
    "kana": "ちく",
    "romaji": "chiku"
  },
  "薄": {
    "kana": "はく",
    "romaji": "haku"
  },
  "薦": {
    "kana": "せん",
    "romaji": "sen"
  },
  "薬": {
    "kana": "くすり",
    "romaji": "kusuri"
  },
  "虎": {
    "kana": "とら",
    "romaji": "tora"
  },
  "虫": {
    "kana": "むし",
    "romaji": "mushi"
  },
  "蛇": {
    "kana": "へび",
    "romaji": "hebi"
  },
  "蝶": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "蟻": {
    "kana": "あり",
    "romaji": "ari"
  },
  "血": {
    "kana": "ち",
    "romaji": "chi"
  },
  "行": {
    "kana": "ぎょう",
    "romaji": "gyou"
  },
  "術": {
    "kana": "じゅつ",
    "romaji": "jutsu"
  },
  "街": {
    "kana": "まち",
    "romaji": "machi"
  },
  "表": {
    "kana": "ひょう",
    "romaji": "hyou"
  },
  "袋": {
    "kana": "ふくろ",
    "romaji": "fukuro"
  },
  "被": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "裁": {
    "kana": "さい",
    "romaji": "sai"
  },
  "裏": {
    "kana": "うら",
    "romaji": "ura"
  },
  "補": {
    "kana": "ほ",
    "romaji": "ho"
  },
  "西": {
    "kana": "にし",
    "romaji": "nishi"
  },
  "要": {
    "kana": "よう",
    "romaji": "you"
  },
  "覆": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "見": {
    "kana": "けん",
    "romaji": "ken"
  },
  "覚": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "親": {
    "kana": "おや",
    "romaji": "oya"
  },
  "角": {
    "kana": "かど",
    "romaji": "kado"
  },
  "解": {
    "kana": "かい",
    "romaji": "kai"
  },
  "触": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "言": {
    "kana": "げん",
    "romaji": "gen"
  },
  "記": {
    "kana": "き",
    "romaji": "ki"
  },
  "訪": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "設": {
    "kana": "せつ",
    "romaji": "setsu"
  },
  "許": {
    "kana": "もと",
    "romaji": "moto"
  },
  "訳": {
    "kana": "わけ",
    "romaji": "wake"
  },
  "訴": {
    "kana": "そ",
    "romaji": "so"
  },
  "試": {
    "kana": "し",
    "romaji": "shi"
  },
  "詰": {
    "kana": "つめ",
    "romaji": "tsume"
  },
  "話": {
    "kana": "はなし",
    "romaji": "hanashi"
  },
  "詳": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "認": {
    "kana": "にん",
    "romaji": "nin"
  },
  "誘": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "語": {
    "kana": "ご",
    "romaji": "go"
  },
  "誤": {
    "kana": "ご",
    "romaji": "go"
  },
  "読": {
    "kana": "どく",
    "romaji": "doku"
  },
  "誰": {
    "kana": "だれ",
    "romaji": "dare"
  },
  "調": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "請": {
    "kana": "せい",
    "romaji": "sei"
  },
  "諭": {
    "kana": "さとし",
    "romaji": "satoshi"
  },
  "譲": {
    "kana": "ゆずる",
    "romaji": "yuzuru"
  },
  "豊": {
    "kana": "ゆたか",
    "romaji": "yutaka"
  },
  "豚": {
    "kana": "ぶた",
    "romaji": "buta"
  },
  "象": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "負": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "財": {
    "kana": "ざい",
    "romaji": "zai"
  },
  "買": {
    "kana": "ばい",
    "romaji": "bai"
  },
  "賄": {
    "kana": "わい",
    "romaji": "wai"
  },
  "資": {
    "kana": "し",
    "romaji": "shi"
  },
  "賑": {
    "kana": "しん",
    "romaji": "shin"
  },
  "質": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "赤": {
    "kana": "あか",
    "romaji": "aka"
  },
  "走": {
    "kana": "そう",
    "romaji": "sou"
  },
  "起": {
    "kana": "き",
    "romaji": "ki"
  },
  "超": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "越": {
    "kana": "えつ",
    "romaji": "etsu"
  },
  "足": {
    "kana": "あし",
    "romaji": "ashi"
  },
  "踏": {
    "kana": "とう",
    "romaji": "tou"
  },
  "身": {
    "kana": "み",
    "romaji": "mi"
  },
  "車": {
    "kana": "くるま",
    "romaji": "kuruma"
  },
  "転": {
    "kana": "てん",
    "romaji": "ten"
  },
  "軽": {
    "kana": "けい",
    "romaji": "kei"
  },
  "辞": {
    "kana": "じ",
    "romaji": "ji"
  },
  "辺": {
    "kana": "へん",
    "romaji": "hen"
  },
  "込": {
    "kana": "こみ",
    "romaji": "komi"
  },
  "迎": {
    "kana": "げい",
    "romaji": "gei"
  },
  "近": {
    "kana": "きん",
    "romaji": "kin"
  },
  "返": {
    "kana": "へん",
    "romaji": "hen"
  },
  "迫": {
    "kana": "さこ",
    "romaji": "sako"
  },
  "述": {
    "kana": "じゅつ",
    "romaji": "jutsu"
  },
  "追": {
    "kana": "つい",
    "romaji": "tsui"
  },
  "退": {
    "kana": "たい",
    "romaji": "tai"
  },
  "送": {
    "kana": "そう",
    "romaji": "sou"
  },
  "逆": {
    "kana": "ぎゃく",
    "romaji": "gyaku"
  },
  "通": {
    "kana": "とおり",
    "romaji": "toori"
  },
  "速": {
    "kana": "そく",
    "romaji": "soku"
  },
  "造": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "連": {
    "kana": "れん",
    "romaji": "ren"
  },
  "週": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "進": {
    "kana": "すすむ",
    "romaji": "susumu"
  },
  "遅": {
    "kana": "ち",
    "romaji": "chi"
  },
  "遊": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "運": {
    "kana": "うん",
    "romaji": "un"
  },
  "過": {
    "kana": "か",
    "romaji": "ka"
  },
  "道": {
    "kana": "みち",
    "romaji": "michi"
  },
  "達": {
    "kana": "とおる",
    "romaji": "tooru"
  },
  "違": {
    "kana": "い",
    "romaji": "i"
  },
  "遠": {
    "kana": "えん",
    "romaji": "en"
  },
  "遮": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "選": {
    "kana": "せん",
    "romaji": "sen"
  },
  "避": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "配": {
    "kana": "はい",
    "romaji": "hai"
  },
  "酒": {
    "kana": "さけ",
    "romaji": "sake"
  },
  "重": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "量": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "鉄": {
    "kana": "てつ",
    "romaji": "tetsu"
  },
  "鋏": {
    "kana": "はさみ",
    "romaji": "hasami"
  },
  "鋭": {
    "kana": "えい",
    "romaji": "ei"
  },
  "鍋": {
    "kana": "なべ",
    "romaji": "nabe"
  },
  "鍛": {
    "kana": "たん",
    "romaji": "tan"
  },
  "鍵": {
    "kana": "かぎ",
    "romaji": "kagi"
  },
  "鏡": {
    "kana": "かがみ",
    "romaji": "kagami"
  },
  "鑑": {
    "kana": "かん",
    "romaji": "kan"
  },
  "長": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "閉": {
    "kana": "へい",
    "romaji": "hei"
  },
  "開": {
    "kana": "かい",
    "romaji": "kai"
  },
  "間": {
    "kana": "あいだ",
    "romaji": "aida"
  },
  "関": {
    "kana": "かん",
    "romaji": "kan"
  },
  "防": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "阻": {
    "kana": "そ",
    "romaji": "so"
  },
  "降": {
    "kana": "こう",
    "romaji": "kou"
  },
  "限": {
    "kana": "げん",
    "romaji": "gen"
  },
  "除": {
    "kana": "じょ",
    "romaji": "jo"
  },
  "陥": {
    "kana": "かん",
    "romaji": "kan"
  },
  "隅": {
    "kana": "すみ",
    "romaji": "sumi"
  },
  "隔": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "際": {
    "kana": "きわ",
    "romaji": "kiwa"
  },
  "隠": {
    "kana": "いん",
    "romaji": "in"
  },
  "隣": {
    "kana": "となり",
    "romaji": "tonari"
  },
  "集": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "離": {
    "kana": "り",
    "romaji": "ri"
  },
  "難": {
    "kana": "なん",
    "romaji": "nan"
  },
  "雨": {
    "kana": "あめ",
    "romaji": "ame"
  },
  "雪": {
    "kana": "ゆき",
    "romaji": "yuki"
  },
  "雲": {
    "kana": "くも",
    "romaji": "kumo"
  },
  "雷": {
    "kana": "かみなり",
    "romaji": "kaminari"
  },
  "霧": {
    "kana": "きり",
    "romaji": "kiri"
  },
  "青": {
    "kana": "あお",
    "romaji": "ao"
  },
  "静": {
    "kana": "せい",
    "romaji": "sei"
  },
  "靴": {
    "kana": "くつ",
    "romaji": "kutsu"
  },
  "鞄": {
    "kana": "かばん",
    "romaji": "kaban"
  },
  "音": {
    "kana": "おと",
    "romaji": "oto"
  },
  "響": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "頃": {
    "kana": "ころ",
    "romaji": "koro"
  },
  "順": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "頭": {
    "kana": "あたま",
    "romaji": "atama"
  },
  "頼": {
    "kana": "らい",
    "romaji": "rai"
  },
  "顔": {
    "kana": "かお",
    "romaji": "kao"
  },
  "顧": {
    "kana": "こ",
    "romaji": "ko"
  },
  "風": {
    "kana": "かぜ",
    "romaji": "kaze"
  },
  "飛": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "食": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "飲": {
    "kana": "いん",
    "romaji": "in"
  },
  "餅": {
    "kana": "もち",
    "romaji": "mochi"
  },
  "館": {
    "kana": "かん",
    "romaji": "kan"
  },
  "首": {
    "kana": "くび",
    "romaji": "kubi"
  },
  "馬": {
    "kana": "うま",
    "romaji": "uma"
  },
  "駅": {
    "kana": "えき",
    "romaji": "eki"
  },
  "驚": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "高": {
    "kana": "たか",
    "romaji": "taka"
  },
  "髭": {
    "kana": "ひげ",
    "romaji": "hige"
  },
  "魚": {
    "kana": "さかな",
    "romaji": "sakana"
  },
  "鮭": {
    "kana": "さけ",
    "romaji": "sake"
  },
  "鳥": {
    "kana": "とり",
    "romaji": "tori"
  },
  "麹": {
    "kana": "こうじ",
    "romaji": "kouji"
  },
  "黒": {
    "kana": "くろ",
    "romaji": "kuro"
  },
  "鼠": {
    "kana": "ねずみ",
    "romaji": "nezumi"
  }
};

  var STEMS = {
  "申請手続": "しんせいてつづ",
  "再起動": "さいきどう",
  "出来上": "できあ",
  "一人": "ひとり",
  "上手": "じょうず",
  "上陸": "じょうりく",
  "下手": "へた",
  "不便": "ふべん",
  "不味": "まず",
  "両替": "りょうがえ",
  "中止": "ちゅうし",
  "了承": "りょうしょう",
  "予約": "よやく",
  "予防": "よぼう",
  "交換": "こうかん",
  "仕事": "しごと",
  "仕組": "しく",
  "仕舞": "しま",
  "休憩": "きゅうけい",
  "体操": "たいそう",
  "体験": "たいけん",
  "作成": "さくせい",
  "使用": "しよう",
  "依然": "いぜん",
  "依頼": "いらい",
  "便利": "べんり",
  "保証": "ほしょう",
  "信用": "しんよう",
  "修理": "しゅうり",
  "値上": "ねあ",
  "傷付": "きずつ",
  "優先": "ゆうせん",
  "優勝": "ゆうしょう",
  "元気": "げんき",
  "充満": "じゅうまん",
  "入力": "にゅうりょく",
  "入浴": "にゅうよく",
  "内包": "ないほう",
  "冗談": "じょうだん",
  "凌駕": "りょうが",
  "処理": "しょり",
  "出来": "でき",
  "出発": "しゅっぱつ",
  "分別": "ぶんべつ",
  "分析": "ぶんせき",
  "分解": "ぶんかい",
  "判断": "はんだん",
  "到着": "とうちゃく",
  "前向": "まえむ",
  "加熱": "かねつ",
  "努力": "どりょく",
  "勉強": "べんきょう",
  "協力": "きょうりょく",
  "参加": "さんか",
  "反対": "はんたい",
  "反省": "はんせい",
  "収斂": "しゅうれん",
  "受験": "じゅけん",
  "可笑": "おか",
  "吃驚": "びっくり",
  "合格": "ごうかく",
  "向上": "こうじょう",
  "商売": "しょうばい",
  "喚起": "かんき",
  "喧嘩": "けんか",
  "噴射": "ふんしゃ",
  "回転": "かいてん",
  "報告": "ほうこく",
  "大切": "たいせつ",
  "大好": "だいす",
  "失敗": "しっぱい",
  "失業": "しつぎょう",
  "失礼": "しつれい",
  "妊娠": "にんしん",
  "子育": "こそだ",
  "実施": "じっし",
  "実習": "じっしゅう",
  "実行": "じっこう",
  "寝坊": "ねぼう",
  "対策": "たいさく",
  "尊敬": "そんけい",
  "就職": "しゅうしょく",
  "展示": "てんじ",
  "工程": "こうてい",
  "帰属": "きぞく",
  "年上": "としうえ",
  "延期": "えんき",
  "引越": "ひっこ",
  "引退": "いんたい",
  "心配": "しんぱい",
  "必要": "ひつよう",
  "応募": "おうぼ",
  "怪我": "けが",
  "感動": "かんどう",
  "感染": "かんせん",
  "感謝": "かんしゃ",
  "成功": "せいこう",
  "我慢": "がまん",
  "手伝": "てつだ",
  "手続": "てつづ",
  "手違": "てちが",
  "承認": "しょうにん",
  "担保": "たんぽ",
  "招待": "しょうたい",
  "掃除": "そうじ",
  "操作": "そうさ",
  "改正": "かいせい",
  "改造": "かいぞう",
  "故障": "こしょう",
  "教育": "きょういく",
  "散歩": "さんぽ",
  "断水": "だんすい",
  "旅行": "りょこう",
  "日焼": "ひや",
  "早退": "そうたい",
  "暗記": "あんき",
  "有名": "ゆうめい",
  "期待": "きたい",
  "根回": "ねまわ",
  "案内": "あんない",
  "検査": "けんさ",
  "検証": "けんしょう",
  "欠勤": "けっきん",
  "欠席": "けっせき",
  "歓迎": "かんげい",
  "正確": "せいかく",
  "残業": "ざんぎょう",
  "段取": "だんど",
  "気持": "きも",
  "気軽": "きがる",
  "水没": "すいぼつ",
  "汚染": "おせん",
  "治療": "ちりょう",
  "注意": "ちゅうい",
  "注文": "ちゅうもん",
  "洗濯": "せんたく",
  "消火": "しょうか",
  "添付": "てんぷ",
  "満足": "まんぞく",
  "準備": "じゅんび",
  "演奏": "えんそう",
  "点呼": "てんこ",
  "点灯": "てんとう",
  "無理": "むり",
  "片付": "かたづ",
  "牽引": "けんいん",
  "生産": "せいさん",
  "用意": "ようい",
  "田中": "たなか",
  "申請": "しんせい",
  "病気": "びょうき",
  "発展": "はってん",
  "発明": "はつめい",
  "発生": "はっせい",
  "発表": "はっぴょう",
  "発見": "はっけん",
  "発車": "はっしゃ",
  "登録": "とうろく",
  "目立": "めだ",
  "目覚": "めざ",
  "相次": "あいつ",
  "相談": "そうだん",
  "着替": "きが",
  "短縮": "たんしゅく",
  "確認": "かくにん",
  "移動": "いどう",
  "節水": "せっすい",
  "節約": "せつやく",
  "管理": "かんり",
  "簡単": "かんたん",
  "精査": "せいさ",
  "約束": "やくそく",
  "素晴": "すば",
  "紹介": "しょうかい",
  "終了": "しゅうりょう",
  "経験": "けいけん",
  "結婚": "けっこん",
  "綺麗": "きれい",
  "緊張": "きんちょう",
  "練習": "れんしゅう",
  "署名": "しょめい",
  "美味": "おい",
  "翻訳": "ほんやく",
  "自殺": "じさつ",
  "興味": "きょうみ",
  "苦労": "くろう",
  "茶色": "ちゃいろ",
  "行動": "こうどう",
  "表示": "ひょうじ",
  "裏切": "うらぎ",
  "補完": "ほかん",
  "見学": "けんがく",
  "見据": "みす",
  "見渡": "みわた",
  "見物": "けんぶつ",
  "見直": "みなお",
  "見舞": "みまい",
  "見逃": "みのが",
  "見通": "みとお",
  "親切": "しんせつ",
  "計画": "けいかく",
  "計算": "けいさん",
  "記入": "きにゅう",
  "設定": "せってい",
  "許可": "きょか",
  "試着": "しちゃく",
  "誘拐": "ゆうかい",
  "説明": "せつめい",
  "調整": "ちょうせい",
  "調理": "ちょうり",
  "調節": "ちょうせつ",
  "請求": "せいきゅう",
  "警戒": "けいかい",
  "貢献": "こうけん",
  "販売": "はんばい",
  "貯金": "ちょきん",
  "質問": "しつもん",
  "購入": "こうにゅう",
  "通訳": "つうやく",
  "通話": "つうわ",
  "連絡": "れんらく",
  "進学": "しんがく",
  "遅刻": "ちこく",
  "運動": "うんどう",
  "運転": "うんてん",
  "違反": "いはん",
  "遠慮": "えんりょ",
  "避難": "ひなん",
  "開催": "かいさい",
  "開始": "かいし",
  "間違": "まちが",
  "関連": "かんれん",
  "阻害": "そがい",
  "集中": "しゅうちゅう",
  "集合": "しゅうごう",
  "電話": "でんわ",
  "面白": "おもしろ",
  "頑張": "がんば",
  "食事": "しょくじ",
  "駄目": "だめ",
  "黄色": "きいろ",
  "々": "々",
  "一": "ひと",
  "丁": "ちょう",
  "七": "なな",
  "万": "まん",
  "丈": "たけ",
  "三": "みっ",
  "上": "あ",
  "下": "さ",
  "不": "ふ",
  "与": "あた",
  "世": "よ",
  "両": "りょう",
  "並": "なら",
  "丸": "まる",
  "主": "おも",
  "乖": "かい",
  "乗": "の",
  "九": "きゅう",
  "也": "や",
  "乳": "ちち",
  "乾": "かわ",
  "了": "りょう",
  "予": "よ",
  "争": "そう",
  "事": "じ",
  "二": "ふた",
  "五": "ご",
  "井": "い",
  "亡": "ぼう",
  "享": "きょう",
  "京": "きょう",
  "亭": "てい",
  "人": "ひと",
  "今": "いま",
  "介": "すけ",
  "仕": "し",
  "他": "ほか",
  "付": "つ",
  "代": "か",
  "令": "れい",
  "以": "い",
  "仮": "かり",
  "仰": "あお",
  "件": "けん",
  "任": "まか",
  "企": "き",
  "伐": "ばつ",
  "休": "やす",
  "会": "あ",
  "伝": "つた",
  "伴": "ともな",
  "伺": "うかがい",
  "位": "くらい",
  "低": "ひく",
  "住": "す",
  "佐": "さ",
  "体": "たい",
  "何": "なに",
  "作": "つく",
  "併": "あわ",
  "使": "つか",
  "例": "たと",
  "供": "とも",
  "依": "い",
  "価": "あたい",
  "便": "べん",
  "促": "うなが",
  "俗": "ぞく",
  "俟": "し",
  "信": "しん",
  "修": "おさむ",
  "俯": "ふ",
  "倉": "くら",
  "倍": "ばい",
  "倒": "たお",
  "候": "そうろう",
  "借": "か",
  "倣": "ほう",
  "値": "あたい",
  "倫": "りん",
  "停": "と",
  "健": "たけし",
  "偶": "ぐう",
  "偽": "にせ",
  "傍": "ぼう",
  "備": "び",
  "債": "さい",
  "傷": "いた",
  "傾": "かたむ",
  "働": "はたら",
  "像": "ぞう",
  "僕": "ぼく",
  "僚": "りょう",
  "儀": "ぎ",
  "償": "しょう",
  "優": "やさ",
  "元": "もと",
  "兄": "あに",
  "兆": "ちょう",
  "先": "さき",
  "光": "ひか",
  "克": "かつ",
  "児": "じ",
  "兜": "かぶと",
  "入": "い",
  "全": "ぜん",
  "八": "はち",
  "公": "こう",
  "六": "ろく",
  "具": "ぐ",
  "典": "てん",
  "円": "えん",
  "冊": "さつ",
  "冒": "ぼう",
  "最": "もっと",
  "冗": "じょう",
  "冠": "かん",
  "冬": "ふゆ",
  "冷": "つめ",
  "凄": "すご",
  "凌": "りょう",
  "凍": "とう",
  "処": "ところ",
  "出": "だ",
  "分": "わ",
  "切": "き",
  "刊": "かん",
  "刑": "けい",
  "初": "しょ",
  "判": "はん",
  "別": "べつ",
  "利": "り",
  "到": "とう",
  "制": "せい",
  "刷": "さつ",
  "券": "けん",
  "刺": "さし",
  "刻": "こく",
  "則": "のり",
  "削": "けず",
  "剣": "つるぎ",
  "剤": "ざい",
  "剰": "じょう",
  "割": "わ",
  "創": "そう",
  "劇": "げき",
  "功": "こう",
  "劣": "れつ",
  "助": "たす",
  "努": "つとむ",
  "励": "れい",
  "労": "ろう",
  "効": "き",
  "勉": "つとむ",
  "動": "うご",
  "勘": "かん",
  "務": "つとむ",
  "勝": "かち",
  "募": "ぼ",
  "勢": "せい",
  "勤": "つと",
  "勧": "すす",
  "匂": "にお",
  "包": "つつ",
  "化": "か",
  "匠": "たくみ",
  "匹": "ひき",
  "区": "く",
  "医": "い",
  "匿": "とく",
  "十": "じゅう",
  "千": "せん",
  "午": "うま",
  "半": "はん",
  "卒": "そつ",
  "協": "きょう",
  "単": "たん",
  "博": "ひろし",
  "印": "いん",
  "危": "き",
  "却": "きゃく",
  "原": "はら",
  "参": "さん",
  "友": "とも",
  "双": "そう",
  "反": "はん",
  "収": "しゅう",
  "叔": "しゅく",
  "取": "と",
  "受": "う",
  "叙": "じょ",
  "古": "ふる",
  "句": "く",
  "叩": "たた",
  "叫": "さけ",
  "召": "しょう",
  "可": "か",
  "台": "だい",
  "史": "し",
  "号": "ごう",
  "司": "つかさ",
  "吃": "きつ",
  "各": "かく",
  "合": "あ",
  "同": "おな",
  "名": "めい",
  "向": "む",
  "君": "きみ",
  "否": "ひ",
  "含": "ふく",
  "吸": "す",
  "呂": "ろ",
  "呈": "てい",
  "告": "こく",
  "呑": "どん",
  "周": "まわ",
  "味": "あじ",
  "呵": "か",
  "呼": "よ",
  "命": "めい",
  "員": "いん",
  "唆": "さ",
  "唯": "ただ",
  "商": "しょう",
  "啓": "けい",
  "善": "ぜん",
  "喋": "しゃべ",
  "喚": "かん",
  "喜": "よろこ",
  "喝": "かつ",
  "喧": "けん",
  "喪": "も",
  "喫": "きつ",
  "嘘": "うそ",
  "嘩": "か",
  "噌": "そ",
  "四": "よん",
  "回": "まわ",
  "因": "いん",
  "団": "だん",
  "困": "こま",
  "囲": "い",
  "図": "はか",
  "固": "かた",
  "圏": "けん",
  "園": "その",
  "圧": "あつ",
  "在": "ざい",
  "地": "じ",
  "均": "ひとし",
  "坊": "ぼう",
  "型": "かた",
  "域": "いき",
  "執": "しつ",
  "培": "つちか",
  "基": "もと",
  "堂": "どう",
  "堆": "つい",
  "堤": "つつみ",
  "堪": "かん",
  "報": "ほう",
  "塀": "へい",
  "塗": "ぬ",
  "塩": "しお",
  "境": "さかい",
  "増": "ふ",
  "墜": "つい",
  "壇": "だん",
  "壊": "こわ",
  "壌": "じょう",
  "士": "さむらい",
  "声": "こえ",
  "売": "う",
  "変": "か",
  "夏": "なつ",
  "夕": "ゆう",
  "外": "はず",
  "多": "おお",
  "夜": "よる",
  "夢": "ゆめ",
  "大": "おお",
  "天": "てん",
  "太": "ふと",
  "夫": "おっと",
  "央": "おう",
  "失": "うしな",
  "奈": "な",
  "奏": "そう",
  "契": "けい",
  "奥": "おく",
  "奨": "しょう",
  "女": "おんな",
  "好": "す",
  "妊": "にん",
  "妙": "みょう",
  "妥": "だ",
  "妹": "いもうと",
  "姉": "あね",
  "始": "はじ",
  "委": "ゆだ",
  "姜": "きょう",
  "威": "い",
  "娠": "しん",
  "婚": "こん",
  "婦": "ふ",
  "嫁": "よめ",
  "嫌": "きら",
  "嬉": "うれ",
  "子": "こ",
  "孔": "あな",
  "字": "じ",
  "存": "そん",
  "季": "き",
  "孤": "こ",
  "宅": "たく",
  "守": "まも",
  "安": "やす",
  "完": "かん",
  "宗": "しゅう",
  "官": "かん",
  "定": "てい",
  "宛": "あて",
  "宝": "たから",
  "客": "きゃく",
  "宣": "せん",
  "室": "しつ",
  "宮": "みや",
  "害": "がい",
  "家": "いえ",
  "容": "よう",
  "寂": "さび",
  "寄": "よ",
  "密": "みつ",
  "富": "と",
  "寒": "さむ",
  "寝": "ね",
  "察": "さつ",
  "寡": "か",
  "寧": "ねい",
  "審": "しん",
  "寺": "てら",
  "対": "たい",
  "寿": "ひさし",
  "封": "ふう",
  "専": "もっぱ",
  "将": "しょう",
  "射": "しゃ",
  "小": "ちい",
  "少": "すく",
  "就": "しゅう",
  "尺": "しゃく",
  "尻": "しり",
  "尽": "じん",
  "尾": "お",
  "局": "きょく",
  "居": "きょ",
  "屈": "くつ",
  "届": "とど",
  "屏": "びょう",
  "展": "てん",
  "属": "ぞく",
  "履": "は",
  "山": "やま",
  "岡": "おか",
  "崇": "すう",
  "崩": "ほう",
  "川": "かわ",
  "工": "こう",
  "巨": "きょ",
  "己": "おのれ",
  "巻": "かん",
  "布": "ぬの",
  "希": "まれ",
  "師": "し",
  "帯": "おび",
  "帰": "かえ",
  "帽": "ぼう",
  "平": "たいら",
  "幸": "さち",
  "幹": "かん",
  "幻": "まぼろし",
  "幾": "いく",
  "広": "ひろ",
  "序": "じょ",
  "底": "そこ",
  "店": "みせ",
  "府": "ふ",
  "度": "ど",
  "座": "すわ",
  "庫": "こ",
  "康": "やすし",
  "廃": "はい",
  "廊": "ろう",
  "廉": "れん",
  "延": "の",
  "建": "た",
  "弁": "べん",
  "弊": "へい",
  "式": "しき",
  "引": "ひ",
  "弟": "おとうと",
  "弱": "よわ",
  "張": "ちょう",
  "強": "つよ",
  "弾": "だん",
  "彙": "い",
  "彩": "さい",
  "役": "やく",
  "彼": "かれ",
  "往": "おう",
  "待": "ま",
  "律": "りつ",
  "後": "うし",
  "徒": "と",
  "従": "じゅう",
  "得": "え",
  "御": "お",
  "復": "ふく",
  "循": "じゅん",
  "微": "び",
  "徳": "とく",
  "徴": "ちょう",
  "心": "しん",
  "忍": "にん",
  "忖": "そん",
  "志": "こころざし",
  "忘": "わす",
  "忙": "いそが",
  "応": "おう",
  "快": "かい",
  "念": "ねん",
  "怒": "おこ",
  "怖": "こわ",
  "思": "おも",
  "怠": "たい",
  "急": "いそ",
  "性": "せい",
  "怪": "かい",
  "恋": "こい",
  "恣": "し",
  "恥": "は",
  "恨": "こん",
  "恩": "おん",
  "息": "いき",
  "悔": "かい",
  "悟": "さとし",
  "患": "かん",
  "悪": "わる",
  "悲": "かな",
  "情": "じょう",
  "惑": "わく",
  "惣": "そう",
  "惧": "く",
  "想": "そう",
  "意": "い",
  "愚": "ぐ",
  "感": "かん",
  "愧": "き",
  "態": "たい",
  "慌": "こう",
  "慎": "しん",
  "慙": "ざん",
  "慢": "まん",
  "慣": "な",
  "慮": "りょ",
  "慶": "よし",
  "憂": "ゆう",
  "憶": "おく",
  "憾": "かん",
  "懇": "こん",
  "懐": "なつ",
  "懸": "けん",
  "我": "われ",
  "戒": "かい",
  "戚": "せき",
  "戦": "せん",
  "戸": "こ",
  "戻": "もど",
  "房": "ぼう",
  "払": "はら",
  "扱": "あつか",
  "批": "ひ",
  "承": "しょう",
  "把": "は",
  "抑": "おさ",
  "投": "な",
  "抗": "こう",
  "折": "お",
  "抜": "ぬ",
  "択": "たく",
  "抱": "いだ",
  "抵": "てい",
  "押": "お",
  "抽": "ちゅう",
  "担": "かつ",
  "拍": "はく",
  "拐": "かい",
  "拓": "たく",
  "拗": "よう",
  "拘": "こう",
  "招": "まね",
  "拝": "はい",
  "拠": "きょ",
  "拡": "かく",
  "括": "くく",
  "拭": "ふ",
  "拮": "きつ",
  "拶": "さつ",
  "拾": "ひろ",
  "持": "も",
  "指": "さ",
  "挟": "はさ",
  "挨": "あい",
  "挫": "ざ",
  "振": "しん",
  "捏": "ねつ",
  "捗": "ちょく",
  "捨": "す",
  "据": "すえ",
  "掃": "そう",
  "授": "じゅ",
  "掘": "ほ",
  "掛": "か",
  "探": "さが",
  "接": "せっ",
  "控": "ひか",
  "措": "そ",
  "提": "てい",
  "揚": "あ",
  "換": "か",
  "握": "にぎ",
  "揮": "き",
  "援": "えん",
  "揺": "ゆ",
  "損": "そこ",
  "搬": "はん",
  "携": "けい",
  "摂": "と",
  "摘": "てき",
  "撃": "げき",
  "撤": "てつ",
  "撻": "たつ",
  "擁": "よう",
  "操": "みさお",
  "擢": "てき",
  "擦": "こす",
  "攻": "こう",
  "放": "ほう",
  "政": "まつりごと",
  "故": "ゆえ",
  "敗": "はい",
  "教": "おし",
  "散": "さん",
  "敬": "たかし",
  "数": "かぞ",
  "整": "ととの",
  "敵": "てき",
  "斂": "れん",
  "斃": "へい",
  "文": "ぶん",
  "斉": "せい",
  "斐": "ひ",
  "料": "りょう",
  "斜": "なな",
  "斟": "しん",
  "斬": "ざん",
  "断": "ことわ",
  "新": "あたら",
  "施": "し",
  "旅": "たび",
  "旋": "せん",
  "族": "ぞく",
  "既": "がい",
  "日": "ひ",
  "旧": "きゅう",
  "早": "はや",
  "旬": "じゅん",
  "昆": "こん",
  "昇": "のぼる",
  "明": "あか",
  "易": "やさ",
  "春": "はる",
  "昧": "まい",
  "昨": "さく",
  "是": "これ",
  "昼": "ひる",
  "時": "とき",
  "普": "ふ",
  "景": "けい",
  "晴": "ば",
  "暑": "あつ",
  "暇": "ひま",
  "暖": "あたた",
  "暗": "くら",
  "暦": "こよみ",
  "暫": "ざん",
  "暮": "く",
  "曇": "くも",
  "曖": "あい",
  "曜": "よう",
  "曲": "ま",
  "更": "こう",
  "書": "か",
  "有": "ゆう",
  "朝": "あさ",
  "期": "き",
  "未": "ひつじ",
  "末": "まつ",
  "本": "ほん",
  "朽": "きゅう",
  "材": "ざい",
  "条": "じょう",
  "来": "く",
  "杯": "はい",
  "板": "いた",
  "析": "せき",
  "果": "くだ",
  "枯": "こ",
  "架": "か",
  "柄": "がら",
  "柑": "かん",
  "染": "そめ",
  "柔": "やわ",
  "査": "さ",
  "栄": "さかえ",
  "校": "こう",
  "株": "かぶ",
  "核": "かく",
  "格": "かく",
  "栽": "さい",
  "案": "あん",
  "梁": "はり",
  "械": "かい",
  "棄": "き",
  "棒": "ぼう",
  "椅": "い",
  "検": "けん",
  "業": "ぎょう",
  "楽": "たの",
  "概": "おおむ",
  "構": "こう",
  "様": "さま",
  "標": "しるべ",
  "模": "も",
  "権": "けん",
  "樹": "き",
  "機": "き",
  "檎": "ご",
  "欄": "らん",
  "次": "つぎ",
  "欧": "おう",
  "欲": "よく",
  "歌": "うた",
  "歓": "かん",
  "止": "と",
  "正": "せい",
  "歩": "ある",
  "歳": "とし",
  "歴": "れき",
  "死": "し",
  "殆": "ほとん",
  "残": "のこ",
  "殖": "しょく",
  "段": "だん",
  "殺": "ころ",
  "母": "はは",
  "毎": "まい",
  "比": "くら",
  "氏": "し",
  "民": "たみ",
  "気": "き",
  "水": "みず",
  "永": "えい",
  "求": "もと",
  "汗": "あせ",
  "汚": "よご",
  "江": "こう",
  "池": "いけ",
  "汰": "た",
  "決": "き",
  "沈": "ちん",
  "没": "ぼつ",
  "沢": "さわ",
  "河": "かわ",
  "沸": "わ",
  "治": "なお",
  "況": "きょう",
  "泉": "いずみ",
  "泊": "と",
  "法": "ほう",
  "泣": "な",
  "泥": "どろ",
  "注": "ちゅう",
  "泳": "およ",
  "洋": "ひろし",
  "洗": "あら",
  "洞": "ほら",
  "津": "つ",
  "洪": "こう",
  "活": "い",
  "派": "は",
  "流": "なが",
  "浅": "あさ",
  "浜": "はま",
  "浪": "なみ",
  "浴": "あ",
  "海": "うみ",
  "浸": "しん",
  "消": "き",
  "涯": "がい",
  "涼": "すず",
  "淘": "とう",
  "深": "ふか",
  "混": "ま",
  "添": "そ",
  "清": "きよし",
  "渇": "かつ",
  "済": "すみ",
  "渉": "わたる",
  "渋": "しぶ",
  "減": "へ",
  "渡": "わた",
  "温": "あたた",
  "港": "こう",
  "湯": "ゆ",
  "滞": "たい",
  "源": "げん",
  "準": "じゅん",
  "溢": "いつ",
  "滑": "すべ",
  "滴": "しずく",
  "漂": "ひょう",
  "漏": "も",
  "演": "えん",
  "漢": "かん",
  "漫": "まん",
  "漬": "つ",
  "漸": "ぜん",
  "潮": "しお",
  "激": "げき",
  "濃": "のう",
  "濡": "ぬ",
  "濫": "らん",
  "濯": "たく",
  "灯": "ともしび",
  "灰": "はい",
  "災": "さい",
  "炉": "ろ",
  "炊": "すい",
  "炒": "しょう",
  "炭": "すみ",
  "点": "つ",
  "為": "ため",
  "無": "む",
  "焦": "しょう",
  "然": "ぜん",
  "焼": "や",
  "煮": "に",
  "煙": "けむり",
  "煩": "うるさ",
  "蒸": "む",
  "熟": "じゅく",
  "燃": "も",
  "父": "ちち",
  "爽": "そう",
  "版": "はん",
  "牛": "ぎゅう",
  "物": "もの",
  "特": "とく",
  "牽": "けん",
  "犯": "はん",
  "状": "じょう",
  "独": "どく",
  "狭": "せま",
  "猛": "たけし",
  "献": "けん",
  "玄": "げん",
  "玩": "がん",
  "現": "あらわ",
  "球": "たま",
  "理": "り",
  "瑕": "きず",
  "環": "かん",
  "瓜": "うり",
  "瓦": "かわら",
  "瓶": "かめ",
  "甘": "あま",
  "甚": "はなは",
  "生": "せい",
  "産": "さん",
  "田": "た",
  "由": "ゆ",
  "甲": "かぶと",
  "男": "おとこ",
  "町": "まち",
  "画": "が",
  "界": "かい",
  "略": "りゃく",
  "番": "ばん",
  "疫": "えき",
  "疲": "つか",
  "疵": "きず",
  "疾": "しつ",
  "病": "びょう",
  "症": "しょう",
  "痛": "いた",
  "痩": "や",
  "痴": "ち",
  "痺": "ひ",
  "療": "りょう",
  "発": "はつ",
  "登": "のぼ",
  "白": "しろ",
  "百": "ひゃく",
  "的": "てき",
  "皆": "みな",
  "皮": "かわ",
  "益": "ます",
  "盗": "ぬす",
  "盛": "じょう",
  "盟": "めい",
  "監": "かん",
  "盤": "ばん",
  "盲": "もう",
  "直": "なお",
  "相": "そう",
  "省": "しょう",
  "眉": "まゆ",
  "看": "かん",
  "真": "まこと",
  "眠": "ねむ",
  "眼": "め",
  "着": "き",
  "督": "とく",
  "睡": "すい",
  "瞬": "しゅん",
  "瞰": "かん",
  "矛": "ほこ",
  "知": "し",
  "短": "みじか",
  "研": "けん",
  "破": "やぶ",
  "硫": "りゅう",
  "硬": "こう",
  "碗": "わん",
  "磨": "みが",
  "社": "しゃ",
  "祈": "いの",
  "祉": "し",
  "祖": "そ",
  "祝": "いわ",
  "神": "かみ",
  "祥": "しょう",
  "票": "ひょう",
  "祭": "まつ",
  "視": "し",
  "禁": "きん",
  "禍": "か",
  "福": "ふく",
  "私": "わたし",
  "秋": "あき",
  "科": "か",
  "秒": "びょう",
  "秘": "ひ",
  "称": "しょう",
  "程": "ほど",
  "税": "ぜい",
  "稟": "りん",
  "種": "しゅ",
  "稼": "か",
  "稿": "こう",
  "積": "つ",
  "穏": "おん",
  "穫": "かく",
  "穴": "あな",
  "究": "きゅう",
  "空": "あ",
  "穽": "せい",
  "突": "つ",
  "窃": "せつ",
  "窮": "きゅう",
  "立": "た",
  "端": "はじ",
  "競": "せ",
  "笑": "わら",
  "符": "ふ",
  "第": "だい",
  "筆": "ふで",
  "等": "など",
  "筋": "すじ",
  "筒": "つつ",
  "答": "こた",
  "策": "さく",
  "節": "ふし",
  "箇": "か",
  "算": "さん",
  "管": "かん",
  "箸": "はし",
  "範": "はん",
  "簡": "かん",
  "籍": "せき",
  "粋": "すい",
  "粒": "つぶ",
  "粘": "ねん",
  "精": "せい",
  "糖": "とう",
  "糸": "いと",
  "系": "けい",
  "糾": "きゅう",
  "紀": "き",
  "約": "やく",
  "紅": "くれない",
  "納": "のう",
  "紐": "ひも",
  "純": "じゅん",
  "紛": "ふん",
  "素": "す",
  "索": "さく",
  "細": "ほそ",
  "紹": "しょう",
  "終": "お",
  "経": "けい",
  "結": "むす",
  "絡": "らく",
  "給": "きゅう",
  "統": "とう",
  "続": "つづ",
  "綜": "そう",
  "維": "い",
  "網": "あみ",
  "綺": "き",
  "綿": "めん",
  "緊": "きん",
  "総": "そう",
  "緒": "お",
  "線": "せん",
  "編": "へん",
  "緯": "い",
  "練": "れん",
  "緻": "ち",
  "縁": "へり",
  "縛": "しば",
  "縮": "しゅく",
  "績": "せき",
  "繁": "はん",
  "繊": "せん",
  "織": "しょく",
  "繕": "ぜん",
  "繋": "つな",
  "繹": "えき",
  "罪": "つみ",
  "置": "お",
  "署": "しょ",
  "罰": "ばつ",
  "羅": "ら",
  "美": "おい",
  "群": "ぐん",
  "義": "ぎ",
  "翌": "よく",
  "習": "なら",
  "翼": "つばさ",
  "翻": "ほん",
  "老": "ろう",
  "考": "かんが",
  "聖": "ひじり",
  "聞": "き",
  "聴": "ちょう",
  "職": "しょく",
  "肉": "にく",
  "肝": "きも",
  "肢": "し",
  "肯": "こう",
  "育": "そだ",
  "背": "せ",
  "胞": "ほう",
  "胡": "こ",
  "能": "のう",
  "脅": "きょう",
  "脈": "みゃく",
  "脱": "ぬ",
  "腐": "くさ",
  "腸": "ちょう",
  "腹": "はら",
  "膠": "にかわ",
  "膨": "ぼう",
  "膳": "ぜん",
  "臓": "ぞう",
  "臨": "りん",
  "致": "ち",
  "興": "きょう",
  "舎": "しゃ",
  "舐": "な",
  "舗": "ほ",
  "舞": "まい",
  "航": "こう",
  "般": "はん",
  "良": "よ",
  "色": "いろ",
  "芸": "げい",
  "若": "わか",
  "苦": "にが",
  "英": "えい",
  "茄": "か",
  "茶": "ちゃ",
  "荒": "こう",
  "荷": "か",
  "莫": "ばく",
  "菌": "きん",
  "菓": "か",
  "菜": "さい",
  "華": "はな",
  "萄": "どう",
  "萎": "い",
  "落": "お",
  "葉": "は",
  "葡": "ぶ",
  "葱": "ねぎ",
  "蒔": "じ",
  "蓋": "ふた",
  "蔓": "つる",
  "蔵": "くら",
  "蔽": "へい",
  "薬": "くすり",
  "藤": "ふじ",
  "蜜": "みつ",
  "融": "ゆう",
  "衆": "しゅう",
  "行": "い",
  "衍": "えん",
  "街": "まち",
  "衛": "まもる",
  "衝": "しょう",
  "衡": "こう",
  "衣": "ころも",
  "裂": "れつ",
  "装": "そう",
  "裕": "ひろし",
  "製": "せい",
  "複": "ふく",
  "褒": "ほ",
  "襲": "しゅう",
  "要": "よう",
  "覆": "くつがえ",
  "覇": "は",
  "見": "み",
  "規": "き",
  "覚": "おぼ",
  "覧": "らん",
  "親": "おや",
  "観": "かん",
  "触": "さわ",
  "言": "い",
  "計": "けい",
  "討": "とう",
  "訓": "くん",
  "訴": "うった",
  "診": "しん",
  "証": "しょう",
  "評": "ひょう",
  "詞": "し",
  "試": "ため",
  "詫": "た",
  "詰": "つ",
  "話": "はな",
  "該": "がい",
  "詳": "くわ",
  "誇": "こ",
  "誉": "よ",
  "誠": "まこと",
  "誌": "し",
  "誕": "たん",
  "誘": "さそ",
  "誤": "あやま",
  "説": "せつ",
  "読": "よ",
  "課": "か",
  "調": "しら",
  "談": "だん",
  "論": "ろん",
  "諦": "あきら",
  "謙": "けん",
  "講": "こう",
  "謝": "あやま",
  "識": "しき",
  "警": "けい",
  "議": "ぎ",
  "護": "ご",
  "讃": "さん",
  "谷": "たに",
  "豆": "まめ",
  "豚": "ぶた",
  "豪": "ごう",
  "負": "ま",
  "貢": "みつぐ",
  "貧": "びん",
  "貨": "か",
  "販": "はん",
  "貫": "かん",
  "責": "せ",
  "貯": "た",
  "貰": "もら",
  "貴": "たかし",
  "買": "か",
  "貸": "か",
  "費": "ひ",
  "貼": "は",
  "賃": "ちん",
  "賑": "にぎ",
  "賛": "さん",
  "賜": "たまもの",
  "賞": "しょう",
  "購": "こう",
  "贈": "ぞう",
  "赤": "あか",
  "赦": "しゃ",
  "走": "はし",
  "赴": "おもむ",
  "起": "お",
  "越": "こ",
  "趣": "おもむき",
  "趨": "すう",
  "足": "た",
  "距": "きょ",
  "践": "せん",
  "路": "みち",
  "踊": "おど",
  "踏": "ふ",
  "身": "み",
  "車": "くるま",
  "軋": "あつ",
  "軟": "なん",
  "軸": "じく",
  "軽": "かる",
  "載": "さい",
  "輝": "かがや",
  "輩": "やから",
  "輪": "わ",
  "輸": "ゆ",
  "轢": "れき",
  "辛": "から",
  "辱": "じょく",
  "農": "のう",
  "巡": "じゅん",
  "迅": "じん",
  "迎": "むか",
  "近": "ちか",
  "返": "かえ",
  "迫": "せま",
  "述": "の",
  "迷": "めい",
  "追": "お",
  "退": "しりぞ",
  "送": "おく",
  "逃": "のが",
  "透": "す",
  "逐": "ちく",
  "途": "と",
  "速": "すみ",
  "連": "つ",
  "進": "すす",
  "逸": "いつ",
  "逼": "ひつ",
  "遂": "すい",
  "遅": "おそ",
  "遊": "あそ",
  "運": "はこ",
  "遍": "へん",
  "過": "す",
  "道": "みち",
  "違": "ちが",
  "遜": "そん",
  "遠": "とお",
  "遡": "そ",
  "適": "てき",
  "遵": "じゅん",
  "選": "えら",
  "遺": "い",
  "避": "さ",
  "還": "かん",
  "邪": "じゃ",
  "郊": "こう",
  "部": "ぶ",
  "郭": "かく",
  "郵": "ゆう",
  "都": "みやこ",
  "酌": "しゃく",
  "配": "ぱい",
  "酒": "さけ",
  "酔": "すい",
  "酬": "しゅう",
  "酵": "こう",
  "酷": "こく",
  "酸": "す",
  "醤": "しょう",
  "醸": "じょう",
  "采": "さい",
  "釈": "しゃく",
  "里": "さと",
  "重": "おも",
  "野": "や",
  "金": "きん",
  "釘": "くぎ",
  "針": "はり",
  "釣": "つり",
  "鈴": "すず",
  "鉄": "てつ",
  "鉛": "なまり",
  "銀": "ぎん",
  "銘": "めい",
  "錬": "れん",
  "錯": "さく",
  "録": "ろく",
  "鎌": "かま",
  "鎖": "くさり",
  "鑑": "かんが",
  "鑽": "さん",
  "長": "なが",
  "門": "もん",
  "閉": "し",
  "開": "あ",
  "閑": "ひま",
  "関": "かん",
  "閲": "えつ",
  "閾": "いき",
  "闘": "とう",
  "阪": "さか",
  "防": "ふせ",
  "降": "お",
  "限": "かぎ",
  "院": "いん",
  "陣": "じん",
  "陰": "いん",
  "陳": "ちん",
  "陸": "りく",
  "険": "けん",
  "陽": "よう",
  "隆": "たかし",
  "階": "かい",
  "随": "ずい",
  "障": "しょう",
  "隠": "かく",
  "集": "あつ",
  "雇": "こ",
  "雑": "ざつ",
  "離": "はな",
  "難": "むずか",
  "雨": "あめ",
  "雰": "ふん",
  "零": "れい",
  "雹": "ひょう",
  "電": "でん",
  "需": "じゅ",
  "震": "ふる",
  "露": "つゆ",
  "青": "あお",
  "静": "しず",
  "非": "ひ",
  "面": "めん",
  "革": "かわ",
  "靱": "じん",
  "鞭": "むち",
  "韓": "かん",
  "章": "しょう",
  "韻": "いん",
  "頁": "ぺーじ",
  "頂": "いただき",
  "項": "こう",
  "須": "す",
  "預": "あず",
  "頑": "がん",
  "頓": "とん",
  "領": "りょう",
  "頼": "たの",
  "題": "だい",
  "額": "ひたい",
  "顔": "かお",
  "顕": "けん",
  "願": "ねが",
  "類": "るい",
  "飛": "と",
  "食": "た",
  "飯": "はん",
  "飲": "の",
  "飼": "か",
  "飽": "ほう",
  "飾": "かざ",
  "養": "よう",
  "香": "かおり",
  "駄": "だ",
  "駅": "えき",
  "駆": "く",
  "駐": "ちゅう",
  "駕": "が",
  "験": "けん",
  "騰": "とう",
  "驚": "おどろ",
  "骨": "ほね",
  "骸": "むくろ",
  "高": "たか",
  "髪": "かみ",
  "魅": "み",
  "鮭": "さけ",
  "鮮": "せん",
  "鳥": "とり",
  "鳴": "な",
  "鶏": "にわとり",
  "鹸": "けん",
  "麗": "れい",
  "麦": "むぎ",
  "麺": "めん",
  "麻": "あさ",
  "黄": "き",
  "黒": "くろ",
  "墨": "すみ",
  "鼓": "つづみ",
  "鼻": "はな",
  "齟": "そ",
  "齢": "れい",
  "齬": "ご"
};

  var SINGLE = {
  "々": {
    "kana": "",
    "romaji": ""
  },
  "一": {
    "kana": "いち",
    "romaji": "ichi"
  },
  "丁": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "七": {
    "kana": "なな",
    "romaji": "nana"
  },
  "万": {
    "kana": "まん",
    "romaji": "man"
  },
  "丈": {
    "kana": "たけ",
    "romaji": "take"
  },
  "三": {
    "kana": "さん",
    "romaji": "san"
  },
  "上": {
    "kana": "うえ",
    "romaji": "ue"
  },
  "下": {
    "kana": "した",
    "romaji": "shita"
  },
  "不": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "与": {
    "kana": "よ",
    "romaji": "yo"
  },
  "世": {
    "kana": "よ",
    "romaji": "yo"
  },
  "㐀": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "両": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "並": {
    "kana": "なみ",
    "romaji": "nami"
  },
  "中": {
    "kana": "なか",
    "romaji": "naka"
  },
  "丸": {
    "kana": "まる",
    "romaji": "maru"
  },
  "主": {
    "kana": "しゅ",
    "romaji": "shu"
  },
  "久": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "乏": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "乖": {
    "kana": "かい",
    "romaji": "kai"
  },
  "乗": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "九": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "也": {
    "kana": "や",
    "romaji": "ya"
  },
  "乱": {
    "kana": "らん",
    "romaji": "ran"
  },
  "乳": {
    "kana": "ちち",
    "romaji": "chichi"
  },
  "乾": {
    "kana": "いぬい",
    "romaji": "inui"
  },
  "亀": {
    "kana": "かめ",
    "romaji": "kame"
  },
  "了": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "予": {
    "kana": "よ",
    "romaji": "yo"
  },
  "争": {
    "kana": "そう",
    "romaji": "sou"
  },
  "事": {
    "kana": "こと",
    "romaji": "koto"
  },
  "二": {
    "kana": "に",
    "romaji": "ni"
  },
  "互": {
    "kana": "ご",
    "romaji": "go"
  },
  "五": {
    "kana": "ご",
    "romaji": "go"
  },
  "井": {
    "kana": "い",
    "romaji": "i"
  },
  "亡": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "交": {
    "kana": "こう",
    "romaji": "kou"
  },
  "享": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "京": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "亭": {
    "kana": "てい",
    "romaji": "tei"
  },
  "人": {
    "kana": "ひと",
    "romaji": "hito"
  },
  "今": {
    "kana": "いま",
    "romaji": "ima"
  },
  "介": {
    "kana": "すけ",
    "romaji": "suke"
  },
  "仕": {
    "kana": "し",
    "romaji": "shi"
  },
  "他": {
    "kana": "ほか",
    "romaji": "hoka"
  },
  "付": {
    "kana": "つき",
    "romaji": "tsuki"
  },
  "代": {
    "kana": "だい",
    "romaji": "dai"
  },
  "令": {
    "kana": "れい",
    "romaji": "rei"
  },
  "以": {
    "kana": "い",
    "romaji": "i"
  },
  "仮": {
    "kana": "かり",
    "romaji": "kari"
  },
  "仰": {
    "kana": "ぎょう",
    "romaji": "gyou"
  },
  "仲": {
    "kana": "なか",
    "romaji": "naka"
  },
  "件": {
    "kana": "けん",
    "romaji": "ken"
  },
  "任": {
    "kana": "にん",
    "romaji": "nin"
  },
  "企": {
    "kana": "き",
    "romaji": "ki"
  },
  "伐": {
    "kana": "ばつ",
    "romaji": "batsu"
  },
  "休": {
    "kana": "やす",
    "romaji": "yasu"
  },
  "会": {
    "kana": "あ",
    "romaji": "a"
  },
  "伝": {
    "kana": "つた",
    "romaji": "tsuta"
  },
  "伴": {
    "kana": "はん",
    "romaji": "han"
  },
  "伸": {
    "kana": "しん",
    "romaji": "shin"
  },
  "伺": {
    "kana": "うかがい",
    "romaji": "ukagai"
  },
  "位": {
    "kana": "くらい",
    "romaji": "kurai"
  },
  "低": {
    "kana": "てい",
    "romaji": "tei"
  },
  "住": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "佐": {
    "kana": "さ",
    "romaji": "sa"
  },
  "体": {
    "kana": "たい",
    "romaji": "tai"
  },
  "何": {
    "kana": "なに",
    "romaji": "nani"
  },
  "余": {
    "kana": "よ",
    "romaji": "yo"
  },
  "作": {
    "kana": "つく",
    "romaji": "tsuku"
  },
  "併": {
    "kana": "へい",
    "romaji": "hei"
  },
  "使": {
    "kana": "つか",
    "romaji": "tsuka"
  },
  "例": {
    "kana": "れい",
    "romaji": "rei"
  },
  "供": {
    "kana": "とも",
    "romaji": "tomo"
  },
  "依": {
    "kana": "い",
    "romaji": "i"
  },
  "価": {
    "kana": "あたい",
    "romaji": "atai"
  },
  "侮": {
    "kana": "ぶ",
    "romaji": "bu"
  },
  "便": {
    "kana": "べん",
    "romaji": "ben"
  },
  "係": {
    "kana": "かかり",
    "romaji": "kakari"
  },
  "促": {
    "kana": "そく",
    "romaji": "soku"
  },
  "俗": {
    "kana": "ぞく",
    "romaji": "zoku"
  },
  "保": {
    "kana": "ほ",
    "romaji": "ho"
  },
  "俟": {
    "kana": "し",
    "romaji": "shi"
  },
  "信": {
    "kana": "しん",
    "romaji": "shin"
  },
  "修": {
    "kana": "おさむ",
    "romaji": "osamu"
  },
  "俯": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "俺": {
    "kana": "おれ",
    "romaji": "ore"
  },
  "倉": {
    "kana": "くら",
    "romaji": "kura"
  },
  "個": {
    "kana": "こ",
    "romaji": "ko"
  },
  "倍": {
    "kana": "ばい",
    "romaji": "bai"
  },
  "倒": {
    "kana": "とう",
    "romaji": "tou"
  },
  "候": {
    "kana": "そうろう",
    "romaji": "sourou"
  },
  "借": {
    "kana": "か",
    "romaji": "ka"
  },
  "倣": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "値": {
    "kana": "あたい",
    "romaji": "atai"
  },
  "倫": {
    "kana": "りん",
    "romaji": "rin"
  },
  "偏": {
    "kana": "へん",
    "romaji": "hen"
  },
  "停": {
    "kana": "てい",
    "romaji": "tei"
  },
  "健": {
    "kana": "たけし",
    "romaji": "takeshi"
  },
  "側": {
    "kana": "そば",
    "romaji": "soba"
  },
  "偶": {
    "kana": "ぐう",
    "romaji": "guu"
  },
  "偽": {
    "kana": "にせ",
    "romaji": "nise"
  },
  "傍": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "傘": {
    "kana": "かさ",
    "romaji": "kasa"
  },
  "備": {
    "kana": "び",
    "romaji": "bi"
  },
  "催": {
    "kana": "さい",
    "romaji": "sai"
  },
  "債": {
    "kana": "さい",
    "romaji": "sai"
  },
  "傷": {
    "kana": "きず",
    "romaji": "kizu"
  },
  "傾": {
    "kana": "けい",
    "romaji": "kei"
  },
  "働": {
    "kana": "どう",
    "romaji": "dou"
  },
  "像": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "僕": {
    "kana": "ぼく",
    "romaji": "boku"
  },
  "僚": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "儀": {
    "kana": "ぎ",
    "romaji": "gi"
  },
  "償": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "優": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "元": {
    "kana": "もと",
    "romaji": "moto"
  },
  "兄": {
    "kana": "あに",
    "romaji": "ani"
  },
  "充": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "兆": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "先": {
    "kana": "さき",
    "romaji": "saki"
  },
  "光": {
    "kana": "ひかり",
    "romaji": "hikari"
  },
  "克": {
    "kana": "かつ",
    "romaji": "katsu"
  },
  "免": {
    "kana": "めん",
    "romaji": "men"
  },
  "兎": {
    "kana": "うさぎ",
    "romaji": "usagi"
  },
  "児": {
    "kana": "じ",
    "romaji": "ji"
  },
  "兜": {
    "kana": "かぶと",
    "romaji": "kabuto"
  },
  "入": {
    "kana": "にゅう",
    "romaji": "nyuu"
  },
  "全": {
    "kana": "ぜん",
    "romaji": "zen"
  },
  "八": {
    "kana": "はち",
    "romaji": "hachi"
  },
  "公": {
    "kana": "こう",
    "romaji": "kou"
  },
  "六": {
    "kana": "ろく",
    "romaji": "roku"
  },
  "共": {
    "kana": "とも",
    "romaji": "tomo"
  },
  "具": {
    "kana": "ぐ",
    "romaji": "gu"
  },
  "典": {
    "kana": "てん",
    "romaji": "ten"
  },
  "内": {
    "kana": "うち",
    "romaji": "uchi"
  },
  "円": {
    "kana": "えん",
    "romaji": "en"
  },
  "冊": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "再": {
    "kana": "さい",
    "romaji": "sai"
  },
  "冒": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "最": {
    "kana": "さい",
    "romaji": "sai"
  },
  "冗": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "写": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "冠": {
    "kana": "かん",
    "romaji": "kan"
  },
  "冬": {
    "kana": "ふゆ",
    "romaji": "fuyu"
  },
  "冷": {
    "kana": "れい",
    "romaji": "rei"
  },
  "凄": {
    "kana": "せい",
    "romaji": "sei"
  },
  "凌": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "凍": {
    "kana": "とう",
    "romaji": "tou"
  },
  "凝": {
    "kana": "ぎょう",
    "romaji": "gyou"
  },
  "処": {
    "kana": "ところ",
    "romaji": "tokoro"
  },
  "出": {
    "kana": "で",
    "romaji": "de"
  },
  "分": {
    "kana": "わ",
    "romaji": "wa"
  },
  "切": {
    "kana": "せつ",
    "romaji": "setsu"
  },
  "刊": {
    "kana": "かん",
    "romaji": "kan"
  },
  "刑": {
    "kana": "けい",
    "romaji": "kei"
  },
  "列": {
    "kana": "れつ",
    "romaji": "retsu"
  },
  "初": {
    "kana": "しょ",
    "romaji": "sho"
  },
  "判": {
    "kana": "はん",
    "romaji": "han"
  },
  "別": {
    "kana": "べつ",
    "romaji": "betsu"
  },
  "利": {
    "kana": "り",
    "romaji": "ri"
  },
  "到": {
    "kana": "とう",
    "romaji": "tou"
  },
  "制": {
    "kana": "せい",
    "romaji": "sei"
  },
  "刷": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "券": {
    "kana": "けん",
    "romaji": "ken"
  },
  "刺": {
    "kana": "さし",
    "romaji": "sashi"
  },
  "刻": {
    "kana": "こく",
    "romaji": "koku"
  },
  "則": {
    "kana": "のり",
    "romaji": "nori"
  },
  "削": {
    "kana": "さく",
    "romaji": "saku"
  },
  "前": {
    "kana": "まえ",
    "romaji": "mae"
  },
  "剣": {
    "kana": "つるぎ",
    "romaji": "tsurugi"
  },
  "剤": {
    "kana": "ざい",
    "romaji": "zai"
  },
  "剰": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "割": {
    "kana": "わり",
    "romaji": "wari"
  },
  "創": {
    "kana": "そう",
    "romaji": "sou"
  },
  "劇": {
    "kana": "げき",
    "romaji": "geki"
  },
  "力": {
    "kana": "ちから",
    "romaji": "chikara"
  },
  "功": {
    "kana": "こう",
    "romaji": "kou"
  },
  "加": {
    "kana": "か",
    "romaji": "ka"
  },
  "劣": {
    "kana": "れつ",
    "romaji": "retsu"
  },
  "助": {
    "kana": "たす",
    "romaji": "tasu"
  },
  "努": {
    "kana": "つとむ",
    "romaji": "tsutomu"
  },
  "励": {
    "kana": "れい",
    "romaji": "rei"
  },
  "労": {
    "kana": "ろう",
    "romaji": "rou"
  },
  "効": {
    "kana": "き",
    "romaji": "ki"
  },
  "勉": {
    "kana": "つとむ",
    "romaji": "tsutomu"
  },
  "動": {
    "kana": "どう",
    "romaji": "dou"
  },
  "勘": {
    "kana": "かん",
    "romaji": "kan"
  },
  "務": {
    "kana": "つとむ",
    "romaji": "tsutomu"
  },
  "勝": {
    "kana": "かち",
    "romaji": "kachi"
  },
  "募": {
    "kana": "ぼ",
    "romaji": "bo"
  },
  "勢": {
    "kana": "せい",
    "romaji": "sei"
  },
  "勤": {
    "kana": "つとむ",
    "romaji": "tsutomu"
  },
  "勧": {
    "kana": "かん",
    "romaji": "kan"
  },
  "匂": {
    "kana": "にお",
    "romaji": "nio"
  },
  "包": {
    "kana": "つつみ",
    "romaji": "tsutsumi"
  },
  "化": {
    "kana": "か",
    "romaji": "ka"
  },
  "北": {
    "kana": "きた",
    "romaji": "kita"
  },
  "匠": {
    "kana": "たくみ",
    "romaji": "takumi"
  },
  "匹": {
    "kana": "ひき",
    "romaji": "hiki"
  },
  "区": {
    "kana": "く",
    "romaji": "ku"
  },
  "医": {
    "kana": "い",
    "romaji": "i"
  },
  "匿": {
    "kana": "とく",
    "romaji": "toku"
  },
  "十": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "千": {
    "kana": "せん",
    "romaji": "sen"
  },
  "午": {
    "kana": "うま",
    "romaji": "uma"
  },
  "半": {
    "kana": "はん",
    "romaji": "han"
  },
  "卒": {
    "kana": "そつ",
    "romaji": "sotsu"
  },
  "協": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "南": {
    "kana": "みなみ",
    "romaji": "minami"
  },
  "単": {
    "kana": "たん",
    "romaji": "tan"
  },
  "博": {
    "kana": "ひろし",
    "romaji": "hiroshi"
  },
  "占": {
    "kana": "せん",
    "romaji": "sen"
  },
  "印": {
    "kana": "いん",
    "romaji": "in"
  },
  "危": {
    "kana": "き",
    "romaji": "ki"
  },
  "即": {
    "kana": "そく",
    "romaji": "soku"
  },
  "却": {
    "kana": "きゃく",
    "romaji": "kyaku"
  },
  "卵": {
    "kana": "たまご",
    "romaji": "tamago"
  },
  "厚": {
    "kana": "あつし",
    "romaji": "atsushi"
  },
  "原": {
    "kana": "はら",
    "romaji": "hara"
  },
  "厳": {
    "kana": "げん",
    "romaji": "gen"
  },
  "去": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "参": {
    "kana": "さん",
    "romaji": "san"
  },
  "及": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "友": {
    "kana": "とも",
    "romaji": "tomo"
  },
  "双": {
    "kana": "そう",
    "romaji": "sou"
  },
  "反": {
    "kana": "はん",
    "romaji": "han"
  },
  "収": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "叔": {
    "kana": "しゅく",
    "romaji": "shuku"
  },
  "取": {
    "kana": "と",
    "romaji": "to"
  },
  "受": {
    "kana": "う",
    "romaji": "u"
  },
  "叙": {
    "kana": "じょ",
    "romaji": "jo"
  },
  "口": {
    "kana": "くち",
    "romaji": "kuchi"
  },
  "古": {
    "kana": "ふる",
    "romaji": "furu"
  },
  "句": {
    "kana": "く",
    "romaji": "ku"
  },
  "叩": {
    "kana": "こう",
    "romaji": "kou"
  },
  "叫": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "召": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "可": {
    "kana": "か",
    "romaji": "ka"
  },
  "台": {
    "kana": "だい",
    "romaji": "dai"
  },
  "史": {
    "kana": "し",
    "romaji": "shi"
  },
  "右": {
    "kana": "みぎ",
    "romaji": "migi"
  },
  "号": {
    "kana": "ごう",
    "romaji": "gou"
  },
  "司": {
    "kana": "つかさ",
    "romaji": "tsukasa"
  },
  "吃": {
    "kana": "きつ",
    "romaji": "kitsu"
  },
  "各": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "合": {
    "kana": "ごう",
    "romaji": "gou"
  },
  "吉": {
    "kana": "きち",
    "romaji": "kichi"
  },
  "同": {
    "kana": "おな",
    "romaji": "ona"
  },
  "名": {
    "kana": "めい",
    "romaji": "mei"
  },
  "向": {
    "kana": "こう",
    "romaji": "kou"
  },
  "君": {
    "kana": "きみ",
    "romaji": "kimi"
  },
  "否": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "含": {
    "kana": "がん",
    "romaji": "gan"
  },
  "吸": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "吹": {
    "kana": "すい",
    "romaji": "sui"
  },
  "呂": {
    "kana": "ろ",
    "romaji": "ro"
  },
  "呈": {
    "kana": "てい",
    "romaji": "tei"
  },
  "告": {
    "kana": "こく",
    "romaji": "koku"
  },
  "呑": {
    "kana": "どん",
    "romaji": "don"
  },
  "周": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "味": {
    "kana": "あじ",
    "romaji": "aji"
  },
  "呵": {
    "kana": "か",
    "romaji": "ka"
  },
  "呼": {
    "kana": "よ",
    "romaji": "yo"
  },
  "命": {
    "kana": "いのち",
    "romaji": "inochi"
  },
  "和": {
    "kana": "わ",
    "romaji": "wa"
  },
  "咲": {
    "kana": "さき",
    "romaji": "saki"
  },
  "品": {
    "kana": "ひん",
    "romaji": "hin"
  },
  "員": {
    "kana": "いん",
    "romaji": "in"
  },
  "唆": {
    "kana": "さ",
    "romaji": "sa"
  },
  "唯": {
    "kana": "ただ",
    "romaji": "tada"
  },
  "商": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "問": {
    "kana": "とん",
    "romaji": "ton"
  },
  "啓": {
    "kana": "けい",
    "romaji": "kei"
  },
  "善": {
    "kana": "ぜん",
    "romaji": "zen"
  },
  "喋": {
    "kana": "しゃべ",
    "romaji": "shabe"
  },
  "喚": {
    "kana": "かん",
    "romaji": "kan"
  },
  "喜": {
    "kana": "よろこ",
    "romaji": "yoroko"
  },
  "喝": {
    "kana": "かつ",
    "romaji": "katsu"
  },
  "喧": {
    "kana": "けん",
    "romaji": "ken"
  },
  "喪": {
    "kana": "も",
    "romaji": "mo"
  },
  "喫": {
    "kana": "きつ",
    "romaji": "kitsu"
  },
  "営": {
    "kana": "えい",
    "romaji": "ei"
  },
  "嘆": {
    "kana": "たん",
    "romaji": "tan"
  },
  "嘘": {
    "kana": "うそ",
    "romaji": "uso"
  },
  "嘩": {
    "kana": "か",
    "romaji": "ka"
  },
  "噂": {
    "kana": "うわさ",
    "romaji": "ue-no"
  },
  "噌": {
    "kana": "そ",
    "romaji": "so"
  },
  "噛": {
    "kana": "ごう",
    "romaji": "gou"
  },
  "噴": {
    "kana": "ふん",
    "romaji": "fun"
  },
  "器": {
    "kana": "うつわ",
    "romaji": "utsuwa"
  },
  "四": {
    "kana": "よん",
    "romaji": "yon"
  },
  "回": {
    "kana": "かい",
    "romaji": "kai"
  },
  "因": {
    "kana": "いん",
    "romaji": "in"
  },
  "団": {
    "kana": "だん",
    "romaji": "dan"
  },
  "困": {
    "kana": "こん",
    "romaji": "kon"
  },
  "囲": {
    "kana": "い",
    "romaji": "i"
  },
  "図": {
    "kana": "ず",
    "romaji": "zu"
  },
  "固": {
    "kana": "こ",
    "romaji": "ko"
  },
  "国": {
    "kana": "くに",
    "romaji": "kuni"
  },
  "圏": {
    "kana": "けん",
    "romaji": "ken"
  },
  "園": {
    "kana": "その",
    "romaji": "sono"
  },
  "土": {
    "kana": "つち",
    "romaji": "tsuchi"
  },
  "圧": {
    "kana": "あつ",
    "romaji": "atsu"
  },
  "在": {
    "kana": "ざい",
    "romaji": "zai"
  },
  "地": {
    "kana": "じ",
    "romaji": "ji"
  },
  "坂": {
    "kana": "さか",
    "romaji": "saka"
  },
  "均": {
    "kana": "ひとし",
    "romaji": "hitoshi"
  },
  "坊": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "型": {
    "kana": "かた",
    "romaji": "kata"
  },
  "埋": {
    "kana": "まい",
    "romaji": "mai"
  },
  "域": {
    "kana": "いき",
    "romaji": "iki"
  },
  "執": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "培": {
    "kana": "ばい",
    "romaji": "bai"
  },
  "基": {
    "kana": "もと",
    "romaji": "moto"
  },
  "堂": {
    "kana": "どう",
    "romaji": "dou"
  },
  "堆": {
    "kana": "つい",
    "romaji": "tsui"
  },
  "堤": {
    "kana": "つつみ",
    "romaji": "tsutsumi"
  },
  "堪": {
    "kana": "かん",
    "romaji": "kan"
  },
  "報": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "場": {
    "kana": "ば",
    "romaji": "ba"
  },
  "塀": {
    "kana": "へい",
    "romaji": "hei"
  },
  "塗": {
    "kana": "ぬり",
    "romaji": "nuri"
  },
  "塞": {
    "kana": "さい",
    "romaji": "sai"
  },
  "塩": {
    "kana": "しお",
    "romaji": "shio"
  },
  "塵": {
    "kana": "ごみ",
    "romaji": "gomi"
  },
  "境": {
    "kana": "さかい",
    "romaji": "sakai"
  },
  "増": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "墜": {
    "kana": "つい",
    "romaji": "tsui"
  },
  "壁": {
    "kana": "かべ",
    "romaji": "kabe"
  },
  "壇": {
    "kana": "だん",
    "romaji": "dan"
  },
  "壊": {
    "kana": "かい",
    "romaji": "kai"
  },
  "壌": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "士": {
    "kana": "さむらい",
    "romaji": "samurai"
  },
  "声": {
    "kana": "こえ",
    "romaji": "koe"
  },
  "売": {
    "kana": "ばい",
    "romaji": "bai"
  },
  "変": {
    "kana": "へん",
    "romaji": "hen"
  },
  "夏": {
    "kana": "なつ",
    "romaji": "natsu"
  },
  "夕": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "外": {
    "kana": "そと",
    "romaji": "soto"
  },
  "多": {
    "kana": "おお",
    "romaji": "oo"
  },
  "夜": {
    "kana": "よる",
    "romaji": "yoru"
  },
  "夢": {
    "kana": "ゆめ",
    "romaji": "yume"
  },
  "大": {
    "kana": "おお",
    "romaji": "oo"
  },
  "天": {
    "kana": "てん",
    "romaji": "ten"
  },
  "太": {
    "kana": "た",
    "romaji": "ta"
  },
  "夫": {
    "kana": "おっと",
    "romaji": "otto"
  },
  "央": {
    "kana": "おう",
    "romaji": "ou"
  },
  "失": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "奈": {
    "kana": "な",
    "romaji": "na"
  },
  "奏": {
    "kana": "そう",
    "romaji": "sou"
  },
  "契": {
    "kana": "けい",
    "romaji": "kei"
  },
  "奥": {
    "kana": "おく",
    "romaji": "oku"
  },
  "奨": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "奪": {
    "kana": "だつ",
    "romaji": "datsu"
  },
  "女": {
    "kana": "おんな",
    "romaji": "onna"
  },
  "好": {
    "kana": "す",
    "romaji": "su"
  },
  "妊": {
    "kana": "にん",
    "romaji": "nin"
  },
  "妓": {
    "kana": "ぎ",
    "romaji": "gi"
  },
  "妙": {
    "kana": "みょう",
    "romaji": "myou"
  },
  "妥": {
    "kana": "だ",
    "romaji": "da"
  },
  "妨": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "妹": {
    "kana": "いもうと",
    "romaji": "imouto"
  },
  "姉": {
    "kana": "あね",
    "romaji": "ane"
  },
  "始": {
    "kana": "はじ",
    "romaji": "haji"
  },
  "委": {
    "kana": "い",
    "romaji": "i"
  },
  "姜": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "姿": {
    "kana": "すがた",
    "romaji": "sugata"
  },
  "威": {
    "kana": "い",
    "romaji": "i"
  },
  "娠": {
    "kana": "しん",
    "romaji": "shin"
  },
  "婚": {
    "kana": "こん",
    "romaji": "kon"
  },
  "婦": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "嫁": {
    "kana": "よめ",
    "romaji": "yome"
  },
  "嫌": {
    "kana": "いや",
    "romaji": "iya"
  },
  "嬉": {
    "kana": "うれ",
    "romaji": "ure"
  },
  "子": {
    "kana": "こ",
    "romaji": "ko"
  },
  "孔": {
    "kana": "あな",
    "romaji": "ana"
  },
  "孕": {
    "kana": "よう",
    "romaji": "you"
  },
  "字": {
    "kana": "じ",
    "romaji": "ji"
  },
  "存": {
    "kana": "そん",
    "romaji": "son"
  },
  "季": {
    "kana": "き",
    "romaji": "ki"
  },
  "孤": {
    "kana": "こ",
    "romaji": "ko"
  },
  "学": {
    "kana": "がく",
    "romaji": "gaku"
  },
  "孫": {
    "kana": "まご",
    "romaji": "mago"
  },
  "宅": {
    "kana": "たく",
    "romaji": "taku"
  },
  "守": {
    "kana": "しゅ",
    "romaji": "shu"
  },
  "安": {
    "kana": "やす",
    "romaji": "yasu"
  },
  "完": {
    "kana": "かん",
    "romaji": "kan"
  },
  "宗": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "官": {
    "kana": "かん",
    "romaji": "kan"
  },
  "定": {
    "kana": "てい",
    "romaji": "tei"
  },
  "宛": {
    "kana": "あて",
    "romaji": "ate"
  },
  "宝": {
    "kana": "たから",
    "romaji": "takara"
  },
  "実": {
    "kana": "み",
    "romaji": "mi"
  },
  "客": {
    "kana": "きゃく",
    "romaji": "kyaku"
  },
  "宣": {
    "kana": "せん",
    "romaji": "sen"
  },
  "室": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "宮": {
    "kana": "みや",
    "romaji": "miya"
  },
  "害": {
    "kana": "がい",
    "romaji": "gai"
  },
  "家": {
    "kana": "いえ",
    "romaji": "ie"
  },
  "容": {
    "kana": "よう",
    "romaji": "you"
  },
  "宿": {
    "kana": "やど",
    "romaji": "yado"
  },
  "寂": {
    "kana": "じゃく",
    "romaji": "jaku"
  },
  "寄": {
    "kana": "より",
    "romaji": "yori"
  },
  "密": {
    "kana": "みつ",
    "romaji": "mitsu"
  },
  "富": {
    "kana": "とみ",
    "romaji": "tomi"
  },
  "寒": {
    "kana": "さむ",
    "romaji": "samu"
  },
  "寝": {
    "kana": "ね",
    "romaji": "ne"
  },
  "察": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "寡": {
    "kana": "か",
    "romaji": "ka"
  },
  "寧": {
    "kana": "ねい",
    "romaji": "nei"
  },
  "審": {
    "kana": "しん",
    "romaji": "shin"
  },
  "寮": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "寺": {
    "kana": "てら",
    "romaji": "tera"
  },
  "対": {
    "kana": "つい",
    "romaji": "tsui"
  },
  "寿": {
    "kana": "ひさし",
    "romaji": "hisashi"
  },
  "封": {
    "kana": "ふう",
    "romaji": "fuu"
  },
  "専": {
    "kana": "せん",
    "romaji": "sen"
  },
  "将": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "射": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "尊": {
    "kana": "みこと",
    "romaji": "mikoto"
  },
  "尋": {
    "kana": "じん",
    "romaji": "jin"
  },
  "導": {
    "kana": "どう",
    "romaji": "dou"
  },
  "小": {
    "kana": "ちい",
    "romaji": "chii"
  },
  "少": {
    "kana": "すく",
    "romaji": "suku"
  },
  "就": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "尺": {
    "kana": "しゃく",
    "romaji": "shaku"
  },
  "尻": {
    "kana": "しり",
    "romaji": "shiri"
  },
  "尽": {
    "kana": "じん",
    "romaji": "jin"
  },
  "尾": {
    "kana": "お",
    "romaji": "o"
  },
  "局": {
    "kana": "きょく",
    "romaji": "kyoku"
  },
  "居": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "屈": {
    "kana": "くつ",
    "romaji": "kutsu"
  },
  "届": {
    "kana": "とどけ",
    "romaji": "todoke"
  },
  "屋": {
    "kana": "や",
    "romaji": "ya"
  },
  "屏": {
    "kana": "びょう",
    "romaji": "byou"
  },
  "展": {
    "kana": "てん",
    "romaji": "ten"
  },
  "属": {
    "kana": "ぞく",
    "romaji": "zoku"
  },
  "層": {
    "kana": "そう",
    "romaji": "sou"
  },
  "履": {
    "kana": "り",
    "romaji": "ri"
  },
  "山": {
    "kana": "やま",
    "romaji": "yama"
  },
  "岡": {
    "kana": "おか",
    "romaji": "oka"
  },
  "岸": {
    "kana": "きし",
    "romaji": "kishi"
  },
  "島": {
    "kana": "しま",
    "romaji": "shima"
  },
  "崇": {
    "kana": "すう",
    "romaji": "suu"
  },
  "崩": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "川": {
    "kana": "かわ",
    "romaji": "kawa"
  },
  "工": {
    "kana": "こう",
    "romaji": "kou"
  },
  "左": {
    "kana": "ひだり",
    "romaji": "hidari"
  },
  "巧": {
    "kana": "こう",
    "romaji": "kou"
  },
  "巨": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "差": {
    "kana": "さ",
    "romaji": "sa"
  },
  "己": {
    "kana": "おのれ",
    "romaji": "onore"
  },
  "巻": {
    "kana": "かん",
    "romaji": "kan"
  },
  "市": {
    "kana": "し",
    "romaji": "shi"
  },
  "布": {
    "kana": "ぬの",
    "romaji": "nuno"
  },
  "希": {
    "kana": "まれ",
    "romaji": "mare"
  },
  "師": {
    "kana": "し",
    "romaji": "shi"
  },
  "席": {
    "kana": "せき",
    "romaji": "seki"
  },
  "帯": {
    "kana": "おび",
    "romaji": "obi"
  },
  "帰": {
    "kana": "き",
    "romaji": "ki"
  },
  "常": {
    "kana": "つね",
    "romaji": "tsune"
  },
  "帽": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "幅": {
    "kana": "はば",
    "romaji": "haba"
  },
  "干": {
    "kana": "かん",
    "romaji": "kan"
  },
  "平": {
    "kana": "たいら",
    "romaji": "taira"
  },
  "年": {
    "kana": "ねん",
    "romaji": "nen"
  },
  "幸": {
    "kana": "さち",
    "romaji": "sachi"
  },
  "幹": {
    "kana": "かん",
    "romaji": "kan"
  },
  "幻": {
    "kana": "まぼろし",
    "romaji": "maboroshi"
  },
  "幾": {
    "kana": "き",
    "romaji": "ki"
  },
  "広": {
    "kana": "こう",
    "romaji": "kou"
  },
  "床": {
    "kana": "ゆか",
    "romaji": "yuka"
  },
  "序": {
    "kana": "じょ",
    "romaji": "jo"
  },
  "底": {
    "kana": "そこ",
    "romaji": "soko"
  },
  "店": {
    "kana": "みせ",
    "romaji": "mise"
  },
  "府": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "度": {
    "kana": "ど",
    "romaji": "do"
  },
  "座": {
    "kana": "すわ",
    "romaji": "suwa"
  },
  "庫": {
    "kana": "こ",
    "romaji": "ko"
  },
  "庭": {
    "kana": "にわ",
    "romaji": "niwa"
  },
  "康": {
    "kana": "やすし",
    "romaji": "yasushi"
  },
  "廃": {
    "kana": "はい",
    "romaji": "hai"
  },
  "廊": {
    "kana": "ろう",
    "romaji": "rou"
  },
  "廉": {
    "kana": "れん",
    "romaji": "ren"
  },
  "延": {
    "kana": "えん",
    "romaji": "en"
  },
  "建": {
    "kana": "けん",
    "romaji": "ken"
  },
  "弁": {
    "kana": "べん",
    "romaji": "ben"
  },
  "弊": {
    "kana": "へい",
    "romaji": "hei"
  },
  "式": {
    "kana": "しき",
    "romaji": "shiki"
  },
  "引": {
    "kana": "ひき",
    "romaji": "hiki"
  },
  "弟": {
    "kana": "おとうと",
    "romaji": "otouto"
  },
  "弱": {
    "kana": "じゃく",
    "romaji": "jaku"
  },
  "張": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "強": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "弾": {
    "kana": "だん",
    "romaji": "dan"
  },
  "当": {
    "kana": "とう",
    "romaji": "tou"
  },
  "彙": {
    "kana": "い",
    "romaji": "i"
  },
  "形": {
    "kana": "かたち",
    "romaji": "katachi"
  },
  "彩": {
    "kana": "さい",
    "romaji": "sai"
  },
  "影": {
    "kana": "かげ",
    "romaji": "kage"
  },
  "役": {
    "kana": "やく",
    "romaji": "yaku"
  },
  "彼": {
    "kana": "かれ",
    "romaji": "kare"
  },
  "往": {
    "kana": "おう",
    "romaji": "ou"
  },
  "待": {
    "kana": "ま",
    "romaji": "ma"
  },
  "律": {
    "kana": "りつ",
    "romaji": "ritsu"
  },
  "後": {
    "kana": "あと",
    "romaji": "ato"
  },
  "徒": {
    "kana": "と",
    "romaji": "to"
  },
  "従": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "得": {
    "kana": "え",
    "romaji": "e"
  },
  "御": {
    "kana": "お",
    "romaji": "o"
  },
  "復": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "循": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "微": {
    "kana": "び",
    "romaji": "bi"
  },
  "徳": {
    "kana": "とく",
    "romaji": "toku"
  },
  "徴": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "心": {
    "kana": "しん",
    "romaji": "shin"
  },
  "必": {
    "kana": "ひつ",
    "romaji": "hitsu"
  },
  "忍": {
    "kana": "にん",
    "romaji": "nin"
  },
  "忖": {
    "kana": "そん",
    "romaji": "son"
  },
  "志": {
    "kana": "こころざし",
    "romaji": "kokorozashi"
  },
  "忘": {
    "kana": "わす",
    "romaji": "wasu"
  },
  "忙": {
    "kana": "いそが",
    "romaji": "isoga"
  },
  "応": {
    "kana": "おう",
    "romaji": "ou"
  },
  "快": {
    "kana": "かい",
    "romaji": "kai"
  },
  "念": {
    "kana": "ねん",
    "romaji": "nen"
  },
  "怒": {
    "kana": "おこ",
    "romaji": "oko"
  },
  "怖": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "思": {
    "kana": "おも",
    "romaji": "omo"
  },
  "怠": {
    "kana": "たい",
    "romaji": "tai"
  },
  "急": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "性": {
    "kana": "せい",
    "romaji": "sei"
  },
  "怪": {
    "kana": "かい",
    "romaji": "kai"
  },
  "恋": {
    "kana": "こい",
    "romaji": "koi"
  },
  "恐": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "恣": {
    "kana": "し",
    "romaji": "shi"
  },
  "恥": {
    "kana": "はじ",
    "romaji": "haji"
  },
  "恨": {
    "kana": "こん",
    "romaji": "kon"
  },
  "恩": {
    "kana": "おん",
    "romaji": "on"
  },
  "息": {
    "kana": "いき",
    "romaji": "iki"
  },
  "恵": {
    "kana": "めぐみ",
    "romaji": "megumi"
  },
  "悔": {
    "kana": "かい",
    "romaji": "kai"
  },
  "悟": {
    "kana": "さとし",
    "romaji": "satoshi"
  },
  "患": {
    "kana": "かん",
    "romaji": "kan"
  },
  "悩": {
    "kana": "のう",
    "romaji": "nou"
  },
  "悪": {
    "kana": "わる",
    "romaji": "waru"
  },
  "悲": {
    "kana": "かな",
    "romaji": "kana"
  },
  "情": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "惑": {
    "kana": "わく",
    "romaji": "waku"
  },
  "惜": {
    "kana": "せき",
    "romaji": "seki"
  },
  "惣": {
    "kana": "そう",
    "romaji": "sou"
  },
  "惧": {
    "kana": "く",
    "romaji": "ku"
  },
  "想": {
    "kana": "そう",
    "romaji": "sou"
  },
  "意": {
    "kana": "い",
    "romaji": "i"
  },
  "愚": {
    "kana": "ぐ",
    "romaji": "gu"
  },
  "愛": {
    "kana": "あい",
    "romaji": "ai"
  },
  "感": {
    "kana": "かん",
    "romaji": "kan"
  },
  "愧": {
    "kana": "き",
    "romaji": "ki"
  },
  "態": {
    "kana": "たい",
    "romaji": "tai"
  },
  "慌": {
    "kana": "こう",
    "romaji": "kou"
  },
  "慎": {
    "kana": "しん",
    "romaji": "shin"
  },
  "慙": {
    "kana": "ざん",
    "romaji": "zan"
  },
  "慢": {
    "kana": "まん",
    "romaji": "man"
  },
  "慣": {
    "kana": "かん",
    "romaji": "kan"
  },
  "慮": {
    "kana": "りょ",
    "romaji": "ryo"
  },
  "慶": {
    "kana": "よし",
    "romaji": "yoshi"
  },
  "憂": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "憩": {
    "kana": "けい",
    "romaji": "kei"
  },
  "憶": {
    "kana": "おく",
    "romaji": "oku"
  },
  "憾": {
    "kana": "かん",
    "romaji": "kan"
  },
  "懇": {
    "kana": "こん",
    "romaji": "kon"
  },
  "懐": {
    "kana": "ふところ",
    "romaji": "futokoro"
  },
  "懸": {
    "kana": "けん",
    "romaji": "ken"
  },
  "成": {
    "kana": "せい",
    "romaji": "sei"
  },
  "我": {
    "kana": "われ",
    "romaji": "ware"
  },
  "戒": {
    "kana": "かい",
    "romaji": "kai"
  },
  "戚": {
    "kana": "せき",
    "romaji": "seki"
  },
  "戦": {
    "kana": "せん",
    "romaji": "sen"
  },
  "戸": {
    "kana": "こ",
    "romaji": "ko"
  },
  "戻": {
    "kana": "れい",
    "romaji": "rei"
  },
  "房": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "所": {
    "kana": "ところ",
    "romaji": "tokoro"
  },
  "扉": {
    "kana": "とびら",
    "romaji": "tobira"
  },
  "手": {
    "kana": "て",
    "romaji": "te"
  },
  "才": {
    "kana": "さい",
    "romaji": "sai"
  },
  "打": {
    "kana": "だ",
    "romaji": "da"
  },
  "払": {
    "kana": "はら",
    "romaji": "hara"
  },
  "扱": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "批": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "承": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "技": {
    "kana": "わざ",
    "romaji": "waza"
  },
  "把": {
    "kana": "は",
    "romaji": "ha"
  },
  "抑": {
    "kana": "よく",
    "romaji": "yoku"
  },
  "投": {
    "kana": "とう",
    "romaji": "tou"
  },
  "抗": {
    "kana": "こう",
    "romaji": "kou"
  },
  "折": {
    "kana": "おり",
    "romaji": "ori"
  },
  "抜": {
    "kana": "ばつ",
    "romaji": "batsu"
  },
  "択": {
    "kana": "たく",
    "romaji": "taku"
  },
  "抱": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "抵": {
    "kana": "てい",
    "romaji": "tei"
  },
  "押": {
    "kana": "おう",
    "romaji": "ou"
  },
  "抽": {
    "kana": "ちゅう",
    "romaji": "chuu"
  },
  "担": {
    "kana": "たん",
    "romaji": "tan"
  },
  "拍": {
    "kana": "はく",
    "romaji": "haku"
  },
  "拐": {
    "kana": "かい",
    "romaji": "kai"
  },
  "拓": {
    "kana": "たく",
    "romaji": "taku"
  },
  "拗": {
    "kana": "よう",
    "romaji": "you"
  },
  "拘": {
    "kana": "こう",
    "romaji": "kou"
  },
  "招": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "拝": {
    "kana": "はい",
    "romaji": "hai"
  },
  "拠": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "拡": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "括": {
    "kana": "かつ",
    "romaji": "katsu"
  },
  "拭": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "拮": {
    "kana": "きつ",
    "romaji": "kitsu"
  },
  "拶": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "拾": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "持": {
    "kana": "も",
    "romaji": "mo"
  },
  "指": {
    "kana": "ゆび",
    "romaji": "yubi"
  },
  "挑": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "挙": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "挟": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "挨": {
    "kana": "あい",
    "romaji": "ai"
  },
  "挫": {
    "kana": "ざ",
    "romaji": "za"
  },
  "振": {
    "kana": "しん",
    "romaji": "shin"
  },
  "捉": {
    "kana": "そく",
    "romaji": "soku"
  },
  "捏": {
    "kana": "ねつ",
    "romaji": "netsu"
  },
  "捗": {
    "kana": "ちょく",
    "romaji": "choku"
  },
  "捨": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "据": {
    "kana": "すえ",
    "romaji": "sue"
  },
  "掃": {
    "kana": "そう",
    "romaji": "sou"
  },
  "授": {
    "kana": "じゅ",
    "romaji": "ju"
  },
  "排": {
    "kana": "はい",
    "romaji": "hai"
  },
  "掘": {
    "kana": "くつ",
    "romaji": "kutsu"
  },
  "掛": {
    "kana": "かかり",
    "romaji": "kakari"
  },
  "採": {
    "kana": "さい",
    "romaji": "sai"
  },
  "探": {
    "kana": "さが",
    "romaji": "saga"
  },
  "接": {
    "kana": "せっ",
    "romaji": "setsu"
  },
  "控": {
    "kana": "ひかえ",
    "romaji": "hikae"
  },
  "推": {
    "kana": "すい",
    "romaji": "sui"
  },
  "措": {
    "kana": "そ",
    "romaji": "so"
  },
  "掲": {
    "kana": "けい",
    "romaji": "kei"
  },
  "描": {
    "kana": "びょう",
    "romaji": "byou"
  },
  "提": {
    "kana": "てい",
    "romaji": "tei"
  },
  "揚": {
    "kana": "よう",
    "romaji": "you"
  },
  "換": {
    "kana": "かん",
    "romaji": "kan"
  },
  "握": {
    "kana": "あく",
    "romaji": "aku"
  },
  "揮": {
    "kana": "き",
    "romaji": "ki"
  },
  "援": {
    "kana": "えん",
    "romaji": "en"
  },
  "揺": {
    "kana": "よう",
    "romaji": "you"
  },
  "損": {
    "kana": "そん",
    "romaji": "son"
  },
  "搬": {
    "kana": "はん",
    "romaji": "han"
  },
  "携": {
    "kana": "けい",
    "romaji": "kei"
  },
  "摂": {
    "kana": "せつ",
    "romaji": "setsu"
  },
  "摘": {
    "kana": "てき",
    "romaji": "teki"
  },
  "撃": {
    "kana": "げき",
    "romaji": "geki"
  },
  "撤": {
    "kana": "てつ",
    "romaji": "tetsu"
  },
  "撮": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "撻": {
    "kana": "たつ",
    "romaji": "tatsu"
  },
  "擁": {
    "kana": "よう",
    "romaji": "you"
  },
  "操": {
    "kana": "みさお",
    "romaji": "misao"
  },
  "擢": {
    "kana": "てき",
    "romaji": "teki"
  },
  "擦": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "支": {
    "kana": "し",
    "romaji": "shi"
  },
  "改": {
    "kana": "かい",
    "romaji": "kai"
  },
  "攻": {
    "kana": "こう",
    "romaji": "kou"
  },
  "放": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "政": {
    "kana": "まつりごと",
    "romaji": "matsurigoto"
  },
  "故": {
    "kana": "ゆえ",
    "romaji": "yue"
  },
  "救": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "敗": {
    "kana": "はい",
    "romaji": "hai"
  },
  "教": {
    "kana": "おし",
    "romaji": "oshi"
  },
  "散": {
    "kana": "さん",
    "romaji": "san"
  },
  "敬": {
    "kana": "たかし",
    "romaji": "takashi"
  },
  "数": {
    "kana": "かず",
    "romaji": "kazu"
  },
  "整": {
    "kana": "せい",
    "romaji": "sei"
  },
  "敵": {
    "kana": "てき",
    "romaji": "teki"
  },
  "敷": {
    "kana": "しき",
    "romaji": "shiki"
  },
  "斂": {
    "kana": "れん",
    "romaji": "ren"
  },
  "斃": {
    "kana": "へい",
    "romaji": "hei"
  },
  "文": {
    "kana": "ぶん",
    "romaji": "bun"
  },
  "斉": {
    "kana": "せい",
    "romaji": "sei"
  },
  "斐": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "料": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "斜": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "斟": {
    "kana": "しん",
    "romaji": "shin"
  },
  "斬": {
    "kana": "ざん",
    "romaji": "zan"
  },
  "断": {
    "kana": "だん",
    "romaji": "dan"
  },
  "新": {
    "kana": "あたら",
    "romaji": "atara"
  },
  "方": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "施": {
    "kana": "し",
    "romaji": "shi"
  },
  "旅": {
    "kana": "たび",
    "romaji": "tabi"
  },
  "旋": {
    "kana": "せん",
    "romaji": "sen"
  },
  "族": {
    "kana": "ぞく",
    "romaji": "zoku"
  },
  "既": {
    "kana": "がい",
    "romaji": "gai"
  },
  "日": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "旧": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "旨": {
    "kana": "むね",
    "romaji": "mune"
  },
  "早": {
    "kana": "はや",
    "romaji": "haya"
  },
  "旬": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "昆": {
    "kana": "こん",
    "romaji": "kon"
  },
  "昇": {
    "kana": "のぼる",
    "romaji": "noboru"
  },
  "明": {
    "kana": "めい",
    "romaji": "mei"
  },
  "易": {
    "kana": "えき",
    "romaji": "eki"
  },
  "昔": {
    "kana": "むかし",
    "romaji": "mukashi"
  },
  "星": {
    "kana": "ほし",
    "romaji": "hoshi"
  },
  "映": {
    "kana": "えい",
    "romaji": "ei"
  },
  "春": {
    "kana": "はる",
    "romaji": "haru"
  },
  "昧": {
    "kana": "まい",
    "romaji": "mai"
  },
  "昨": {
    "kana": "さく",
    "romaji": "saku"
  },
  "是": {
    "kana": "これ",
    "romaji": "kore"
  },
  "昼": {
    "kana": "ひる",
    "romaji": "hiru"
  },
  "時": {
    "kana": "とき",
    "romaji": "toki"
  },
  "晩": {
    "kana": "ばん",
    "romaji": "ban"
  },
  "普": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "景": {
    "kana": "けい",
    "romaji": "kei"
  },
  "晴": {
    "kana": "ば",
    "romaji": "ba"
  },
  "暑": {
    "kana": "あつ",
    "romaji": "atsu"
  },
  "暇": {
    "kana": "ひま",
    "romaji": "hima"
  },
  "暖": {
    "kana": "あたた",
    "romaji": "atata"
  },
  "暗": {
    "kana": "あん",
    "romaji": "an"
  },
  "暦": {
    "kana": "こよみ",
    "romaji": "koyomi"
  },
  "暫": {
    "kana": "ざん",
    "romaji": "zan"
  },
  "暮": {
    "kana": "くれ",
    "romaji": "kure"
  },
  "暴": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "曇": {
    "kana": "どん",
    "romaji": "don"
  },
  "曖": {
    "kana": "あい",
    "romaji": "ai"
  },
  "曜": {
    "kana": "よう",
    "romaji": "you"
  },
  "曲": {
    "kana": "きょく",
    "romaji": "kyoku"
  },
  "更": {
    "kana": "こう",
    "romaji": "kou"
  },
  "書": {
    "kana": "かき",
    "romaji": "kaki"
  },
  "替": {
    "kana": "かえ",
    "romaji": "kae"
  },
  "月": {
    "kana": "つき",
    "romaji": "tsuki"
  },
  "有": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "服": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "望": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "朝": {
    "kana": "あさ",
    "romaji": "asa"
  },
  "期": {
    "kana": "き",
    "romaji": "ki"
  },
  "木": {
    "kana": "き",
    "romaji": "ki"
  },
  "未": {
    "kana": "ひつじ",
    "romaji": "hitsuji"
  },
  "末": {
    "kana": "まつ",
    "romaji": "matsu"
  },
  "本": {
    "kana": "ほん",
    "romaji": "hon"
  },
  "札": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "机": {
    "kana": "つくえ",
    "romaji": "tsukue"
  },
  "朽": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "材": {
    "kana": "ざい",
    "romaji": "zai"
  },
  "村": {
    "kana": "むら",
    "romaji": "mura"
  },
  "束": {
    "kana": "そく",
    "romaji": "soku"
  },
  "条": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "来": {
    "kana": "き",
    "romaji": "ki"
  },
  "杯": {
    "kana": "はい",
    "romaji": "hai"
  },
  "東": {
    "kana": "ひがし",
    "romaji": "higashi"
  },
  "板": {
    "kana": "いた",
    "romaji": "ita"
  },
  "析": {
    "kana": "せき",
    "romaji": "seki"
  },
  "枕": {
    "kana": "まくら",
    "romaji": "makura"
  },
  "林": {
    "kana": "はやし",
    "romaji": "hayashi"
  },
  "枚": {
    "kana": "まい",
    "romaji": "mai"
  },
  "果": {
    "kana": "くだ",
    "romaji": "kuda"
  },
  "枝": {
    "kana": "えだ",
    "romaji": "eda"
  },
  "枠": {
    "kana": "わく",
    "romaji": "waku"
  },
  "枯": {
    "kana": "こ",
    "romaji": "ko"
  },
  "架": {
    "kana": "か",
    "romaji": "ka"
  },
  "柄": {
    "kana": "がら",
    "romaji": "gara"
  },
  "柑": {
    "kana": "かん",
    "romaji": "kan"
  },
  "染": {
    "kana": "そめ",
    "romaji": "some"
  },
  "柔": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "柱": {
    "kana": "はしら",
    "romaji": "hashira"
  },
  "査": {
    "kana": "さ",
    "romaji": "sa"
  },
  "栄": {
    "kana": "さかえ",
    "romaji": "sakae"
  },
  "校": {
    "kana": "こう",
    "romaji": "kou"
  },
  "株": {
    "kana": "かぶ",
    "romaji": "kabu"
  },
  "核": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "根": {
    "kana": "ね",
    "romaji": "ne"
  },
  "格": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "栽": {
    "kana": "さい",
    "romaji": "sai"
  },
  "桃": {
    "kana": "もも",
    "romaji": "momo"
  },
  "案": {
    "kana": "あん",
    "romaji": "an"
  },
  "桜": {
    "kana": "さくら",
    "romaji": "sakura"
  },
  "梁": {
    "kana": "はり",
    "romaji": "hari"
  },
  "梅": {
    "kana": "うめ",
    "romaji": "ume"
  },
  "梨": {
    "kana": "なし",
    "romaji": "nashi"
  },
  "械": {
    "kana": "かい",
    "romaji": "kai"
  },
  "棄": {
    "kana": "き",
    "romaji": "ki"
  },
  "棒": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "棚": {
    "kana": "たな",
    "romaji": "tana"
  },
  "森": {
    "kana": "もり",
    "romaji": "mori"
  },
  "椅": {
    "kana": "い",
    "romaji": "i"
  },
  "植": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "検": {
    "kana": "けん",
    "romaji": "ken"
  },
  "業": {
    "kana": "ぎょう",
    "romaji": "gyou"
  },
  "極": {
    "kana": "きょく",
    "romaji": "kyoku"
  },
  "楽": {
    "kana": "たの",
    "romaji": "tano"
  },
  "概": {
    "kana": "おおむね",
    "romaji": "oomune"
  },
  "構": {
    "kana": "こう",
    "romaji": "kou"
  },
  "様": {
    "kana": "さま",
    "romaji": "sama"
  },
  "標": {
    "kana": "しるべ",
    "romaji": "shirube"
  },
  "模": {
    "kana": "も",
    "romaji": "mo"
  },
  "権": {
    "kana": "けん",
    "romaji": "ken"
  },
  "横": {
    "kana": "よこ",
    "romaji": "yoko"
  },
  "樹": {
    "kana": "き",
    "romaji": "ki"
  },
  "橋": {
    "kana": "はし",
    "romaji": "hashi"
  },
  "機": {
    "kana": "き",
    "romaji": "ki"
  },
  "檎": {
    "kana": "ご",
    "romaji": "go"
  },
  "櫛": {
    "kana": "くし",
    "romaji": "kushi"
  },
  "欄": {
    "kana": "らん",
    "romaji": "ran"
  },
  "欠": {
    "kana": "けつ",
    "romaji": "ketsu"
  },
  "次": {
    "kana": "つぎ",
    "romaji": "tsugi"
  },
  "欧": {
    "kana": "おう",
    "romaji": "ou"
  },
  "欲": {
    "kana": "よく",
    "romaji": "yoku"
  },
  "歌": {
    "kana": "うた",
    "romaji": "uta"
  },
  "歓": {
    "kana": "かん",
    "romaji": "kan"
  },
  "止": {
    "kana": "と",
    "romaji": "to"
  },
  "正": {
    "kana": "せい",
    "romaji": "sei"
  },
  "歩": {
    "kana": "ある",
    "romaji": "aru"
  },
  "歪": {
    "kana": "ひずみ",
    "romaji": "hizumi"
  },
  "歯": {
    "kana": "は",
    "romaji": "ha"
  },
  "歳": {
    "kana": "とし",
    "romaji": "toshi"
  },
  "歴": {
    "kana": "れき",
    "romaji": "reki"
  },
  "死": {
    "kana": "し",
    "romaji": "shi"
  },
  "殆": {
    "kana": "たい",
    "romaji": "tai"
  },
  "残": {
    "kana": "ざん",
    "romaji": "zan"
  },
  "殖": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "段": {
    "kana": "だん",
    "romaji": "dan"
  },
  "殺": {
    "kana": "さつ",
    "romaji": "satsu"
  },
  "母": {
    "kana": "はは",
    "romaji": "haha"
  },
  "毎": {
    "kana": "まい",
    "romaji": "mai"
  },
  "比": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "毛": {
    "kana": "け",
    "romaji": "ke"
  },
  "氏": {
    "kana": "し",
    "romaji": "shi"
  },
  "民": {
    "kana": "たみ",
    "romaji": "tami"
  },
  "気": {
    "kana": "き",
    "romaji": "ki"
  },
  "水": {
    "kana": "みず",
    "romaji": "mizu"
  },
  "氷": {
    "kana": "こおり",
    "romaji": "koori"
  },
  "永": {
    "kana": "えい",
    "romaji": "ei"
  },
  "汁": {
    "kana": "しる",
    "romaji": "shiru"
  },
  "求": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "汗": {
    "kana": "あせ",
    "romaji": "ase"
  },
  "汚": {
    "kana": "お",
    "romaji": "o"
  },
  "江": {
    "kana": "こう",
    "romaji": "kou"
  },
  "池": {
    "kana": "いけ",
    "romaji": "ike"
  },
  "汰": {
    "kana": "た",
    "romaji": "ta"
  },
  "決": {
    "kana": "けつ",
    "romaji": "ketsu"
  },
  "沈": {
    "kana": "ちん",
    "romaji": "chin"
  },
  "没": {
    "kana": "ぼつ",
    "romaji": "botsu"
  },
  "沢": {
    "kana": "さわ",
    "romaji": "sawa"
  },
  "河": {
    "kana": "かわ",
    "romaji": "kawa"
  },
  "沸": {
    "kana": "ふつ",
    "romaji": "futsu"
  },
  "油": {
    "kana": "あぶら",
    "romaji": "abura"
  },
  "治": {
    "kana": "おさむ",
    "romaji": "osamu"
  },
  "沿": {
    "kana": "えん",
    "romaji": "en"
  },
  "況": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "泉": {
    "kana": "いずみ",
    "romaji": "izumi"
  },
  "泊": {
    "kana": "はく",
    "romaji": "haku"
  },
  "法": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "波": {
    "kana": "なみ",
    "romaji": "nami"
  },
  "泣": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "泥": {
    "kana": "どろ",
    "romaji": "doro"
  },
  "注": {
    "kana": "ちゅう",
    "romaji": "chuu"
  },
  "泳": {
    "kana": "えい",
    "romaji": "ei"
  },
  "洋": {
    "kana": "ひろし",
    "romaji": "hiroshi"
  },
  "洗": {
    "kana": "あら",
    "romaji": "ara"
  },
  "洞": {
    "kana": "ほら",
    "romaji": "hora"
  },
  "津": {
    "kana": "つ",
    "romaji": "tsu"
  },
  "洪": {
    "kana": "こう",
    "romaji": "kou"
  },
  "活": {
    "kana": "かつ",
    "romaji": "katsu"
  },
  "派": {
    "kana": "は",
    "romaji": "ha"
  },
  "流": {
    "kana": "りゅう",
    "romaji": "ryuu"
  },
  "浅": {
    "kana": "せん",
    "romaji": "sen"
  },
  "浜": {
    "kana": "はま",
    "romaji": "hama"
  },
  "浪": {
    "kana": "なみ",
    "romaji": "nami"
  },
  "浮": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "浴": {
    "kana": "よく",
    "romaji": "yoku"
  },
  "海": {
    "kana": "うみ",
    "romaji": "umi"
  },
  "浸": {
    "kana": "しん",
    "romaji": "shin"
  },
  "消": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "涙": {
    "kana": "なみだ",
    "romaji": "namida"
  },
  "涯": {
    "kana": "がい",
    "romaji": "gai"
  },
  "涼": {
    "kana": "すず",
    "romaji": "suzu"
  },
  "淘": {
    "kana": "とう",
    "romaji": "tou"
  },
  "深": {
    "kana": "しん",
    "romaji": "shin"
  },
  "混": {
    "kana": "こん",
    "romaji": "kon"
  },
  "添": {
    "kana": "そえ",
    "romaji": "soe"
  },
  "清": {
    "kana": "きよし",
    "romaji": "kiyoshi"
  },
  "渇": {
    "kana": "かつ",
    "romaji": "katsu"
  },
  "済": {
    "kana": "すみ",
    "romaji": "sumi"
  },
  "渉": {
    "kana": "わたる",
    "romaji": "wataru"
  },
  "渋": {
    "kana": "しぶ",
    "romaji": "shibu"
  },
  "減": {
    "kana": "げん",
    "romaji": "gen"
  },
  "渡": {
    "kana": "わたり",
    "romaji": "watari"
  },
  "温": {
    "kana": "おん",
    "romaji": "on"
  },
  "測": {
    "kana": "そく",
    "romaji": "soku"
  },
  "港": {
    "kana": "こう",
    "romaji": "kou"
  },
  "湖": {
    "kana": "みずうみ",
    "romaji": "mizuumi"
  },
  "湯": {
    "kana": "ゆ",
    "romaji": "yu"
  },
  "湿": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "満": {
    "kana": "まん",
    "romaji": "man"
  },
  "滞": {
    "kana": "たい",
    "romaji": "tai"
  },
  "源": {
    "kana": "げん",
    "romaji": "gen"
  },
  "準": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "溢": {
    "kana": "いつ",
    "romaji": "itsu"
  },
  "溶": {
    "kana": "よう",
    "romaji": "you"
  },
  "滑": {
    "kana": "かつ",
    "romaji": "katsu"
  },
  "滴": {
    "kana": "しずく",
    "romaji": "shizuku"
  },
  "漁": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "漂": {
    "kana": "ひょう",
    "romaji": "hyou"
  },
  "漏": {
    "kana": "ろう",
    "romaji": "rou"
  },
  "演": {
    "kana": "えん",
    "romaji": "en"
  },
  "漢": {
    "kana": "かん",
    "romaji": "kan"
  },
  "漫": {
    "kana": "まん",
    "romaji": "man"
  },
  "漬": {
    "kana": "し",
    "romaji": "shi"
  },
  "漸": {
    "kana": "ぜん",
    "romaji": "zen"
  },
  "潜": {
    "kana": "せん",
    "romaji": "sen"
  },
  "潮": {
    "kana": "しお",
    "romaji": "shio"
  },
  "澄": {
    "kana": "すみ",
    "romaji": "sumi"
  },
  "激": {
    "kana": "げき",
    "romaji": "geki"
  },
  "濁": {
    "kana": "だく",
    "romaji": "daku"
  },
  "濃": {
    "kana": "のう",
    "romaji": "nou"
  },
  "濡": {
    "kana": "じゅ",
    "romaji": "ju"
  },
  "濫": {
    "kana": "らん",
    "romaji": "ran"
  },
  "濯": {
    "kana": "たく",
    "romaji": "taku"
  },
  "火": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "灯": {
    "kana": "ともしび",
    "romaji": "tomoshibi"
  },
  "灰": {
    "kana": "はい",
    "romaji": "hai"
  },
  "災": {
    "kana": "さい",
    "romaji": "sai"
  },
  "炉": {
    "kana": "ろ",
    "romaji": "ro"
  },
  "炊": {
    "kana": "すい",
    "romaji": "sui"
  },
  "炒": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "炭": {
    "kana": "すみ",
    "romaji": "sumi"
  },
  "点": {
    "kana": "てん",
    "romaji": "ten"
  },
  "為": {
    "kana": "ため",
    "romaji": "tame"
  },
  "無": {
    "kana": "む",
    "romaji": "mu"
  },
  "焦": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "然": {
    "kana": "ぜん",
    "romaji": "zen"
  },
  "焼": {
    "kana": "や",
    "romaji": "ya"
  },
  "煮": {
    "kana": "に",
    "romaji": "ni"
  },
  "煙": {
    "kana": "けむり",
    "romaji": "kemuri"
  },
  "照": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "煩": {
    "kana": "はん",
    "romaji": "han"
  },
  "熊": {
    "kana": "くま",
    "romaji": "kuma"
  },
  "蒸": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "熟": {
    "kana": "じゅく",
    "romaji": "juku"
  },
  "熱": {
    "kana": "ねつ",
    "romaji": "netsu"
  },
  "黙": {
    "kana": "もく",
    "romaji": "moku"
  },
  "燃": {
    "kana": "ねん",
    "romaji": "nen"
  },
  "父": {
    "kana": "ちち",
    "romaji": "chichi"
  },
  "爽": {
    "kana": "そう",
    "romaji": "sou"
  },
  "片": {
    "kana": "へん",
    "romaji": "hen"
  },
  "版": {
    "kana": "はん",
    "romaji": "han"
  },
  "牛": {
    "kana": "ぎゅう",
    "romaji": "gyuu"
  },
  "物": {
    "kana": "もの",
    "romaji": "mono"
  },
  "特": {
    "kana": "とく",
    "romaji": "toku"
  },
  "牽": {
    "kana": "けん",
    "romaji": "ken"
  },
  "犬": {
    "kana": "いぬ",
    "romaji": "inu"
  },
  "犯": {
    "kana": "はん",
    "romaji": "han"
  },
  "状": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "狙": {
    "kana": "そ",
    "romaji": "so"
  },
  "独": {
    "kana": "どく",
    "romaji": "doku"
  },
  "狭": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "猛": {
    "kana": "たけし",
    "romaji": "takeshi"
  },
  "猫": {
    "kana": "ねこ",
    "romaji": "neko"
  },
  "献": {
    "kana": "けん",
    "romaji": "ken"
  },
  "猿": {
    "kana": "さる",
    "romaji": "saru"
  },
  "玄": {
    "kana": "げん",
    "romaji": "gen"
  },
  "率": {
    "kana": "りつ",
    "romaji": "ritsu"
  },
  "玉": {
    "kana": "たま",
    "romaji": "tama"
  },
  "玩": {
    "kana": "がん",
    "romaji": "gan"
  },
  "珍": {
    "kana": "ちん",
    "romaji": "chin"
  },
  "班": {
    "kana": "はん",
    "romaji": "han"
  },
  "現": {
    "kana": "げん",
    "romaji": "gen"
  },
  "球": {
    "kana": "たま",
    "romaji": "tama"
  },
  "理": {
    "kana": "り",
    "romaji": "ri"
  },
  "瑕": {
    "kana": "きず",
    "romaji": "kizu"
  },
  "環": {
    "kana": "かん",
    "romaji": "kan"
  },
  "瓜": {
    "kana": "うり",
    "romaji": "uri"
  },
  "瓦": {
    "kana": "かわら",
    "romaji": "kawara"
  },
  "瓶": {
    "kana": "かめ",
    "romaji": "kame"
  },
  "甘": {
    "kana": "あま",
    "romaji": "ama"
  },
  "甚": {
    "kana": "じん",
    "romaji": "jin"
  },
  "生": {
    "kana": "せい",
    "romaji": "sei"
  },
  "産": {
    "kana": "さん",
    "romaji": "san"
  },
  "用": {
    "kana": "よう",
    "romaji": "you"
  },
  "田": {
    "kana": "た",
    "romaji": "ta"
  },
  "由": {
    "kana": "ゆ",
    "romaji": "yu"
  },
  "甲": {
    "kana": "かぶと",
    "romaji": "kabuto"
  },
  "申": {
    "kana": "さる",
    "romaji": "saru"
  },
  "男": {
    "kana": "おとこ",
    "romaji": "otoko"
  },
  "町": {
    "kana": "まち",
    "romaji": "machi"
  },
  "画": {
    "kana": "が",
    "romaji": "ga"
  },
  "界": {
    "kana": "かい",
    "romaji": "kai"
  },
  "畑": {
    "kana": "はたけ",
    "romaji": "hatake"
  },
  "留": {
    "kana": "りゅう",
    "romaji": "ryuu"
  },
  "略": {
    "kana": "りゃく",
    "romaji": "ryaku"
  },
  "異": {
    "kana": "い",
    "romaji": "i"
  },
  "番": {
    "kana": "ばん",
    "romaji": "ban"
  },
  "畳": {
    "kana": "たたみ",
    "romaji": "tatami"
  },
  "疑": {
    "kana": "ぎ",
    "romaji": "gi"
  },
  "疫": {
    "kana": "えき",
    "romaji": "eki"
  },
  "疲": {
    "kana": "つか",
    "romaji": "tsuka"
  },
  "疵": {
    "kana": "きず",
    "romaji": "kizu"
  },
  "疾": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "病": {
    "kana": "びょう",
    "romaji": "byou"
  },
  "症": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "痛": {
    "kana": "つう",
    "romaji": "tsuu"
  },
  "痩": {
    "kana": "そう",
    "romaji": "sou"
  },
  "痴": {
    "kana": "ち",
    "romaji": "chi"
  },
  "痺": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "療": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "癖": {
    "kana": "くせ",
    "romaji": "kuse"
  },
  "発": {
    "kana": "はつ",
    "romaji": "hatsu"
  },
  "登": {
    "kana": "とう",
    "romaji": "tou"
  },
  "白": {
    "kana": "しろ",
    "romaji": "shiro"
  },
  "百": {
    "kana": "ひゃく",
    "romaji": "hyaku"
  },
  "的": {
    "kana": "てき",
    "romaji": "teki"
  },
  "皆": {
    "kana": "みんな",
    "romaji": "minna"
  },
  "皮": {
    "kana": "かわ",
    "romaji": "kawa"
  },
  "皿": {
    "kana": "さら",
    "romaji": "sara"
  },
  "益": {
    "kana": "ます",
    "romaji": "masu"
  },
  "盗": {
    "kana": "とう",
    "romaji": "tou"
  },
  "盛": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "盟": {
    "kana": "めい",
    "romaji": "mei"
  },
  "監": {
    "kana": "かん",
    "romaji": "kan"
  },
  "盤": {
    "kana": "ばん",
    "romaji": "ban"
  },
  "目": {
    "kana": "め",
    "romaji": "me"
  },
  "盲": {
    "kana": "もう",
    "romaji": "mou"
  },
  "直": {
    "kana": "ちょく",
    "romaji": "choku"
  },
  "相": {
    "kana": "そう",
    "romaji": "sou"
  },
  "盾": {
    "kana": "たて",
    "romaji": "tate"
  },
  "省": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "眉": {
    "kana": "まゆ",
    "romaji": "mayu"
  },
  "看": {
    "kana": "かん",
    "romaji": "kan"
  },
  "真": {
    "kana": "まこと",
    "romaji": "makoto"
  },
  "眠": {
    "kana": "みん",
    "romaji": "min"
  },
  "眺": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "眼": {
    "kana": "め",
    "romaji": "me"
  },
  "着": {
    "kana": "ちゃく",
    "romaji": "chaku"
  },
  "督": {
    "kana": "とく",
    "romaji": "toku"
  },
  "睡": {
    "kana": "すい",
    "romaji": "sui"
  },
  "瞬": {
    "kana": "しゅん",
    "romaji": "shun"
  },
  "瞰": {
    "kana": "かん",
    "romaji": "kan"
  },
  "矛": {
    "kana": "ほこ",
    "romaji": "hoko"
  },
  "知": {
    "kana": "し",
    "romaji": "shi"
  },
  "短": {
    "kana": "たん",
    "romaji": "tan"
  },
  "石": {
    "kana": "いし",
    "romaji": "ishi"
  },
  "砂": {
    "kana": "すな",
    "romaji": "suna"
  },
  "研": {
    "kana": "けん",
    "romaji": "ken"
  },
  "砕": {
    "kana": "さい",
    "romaji": "sai"
  },
  "破": {
    "kana": "は",
    "romaji": "ha"
  },
  "硫": {
    "kana": "りゅう",
    "romaji": "ryuu"
  },
  "硬": {
    "kana": "こう",
    "romaji": "kou"
  },
  "碗": {
    "kana": "わん",
    "romaji": "wan"
  },
  "確": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "磨": {
    "kana": "ま",
    "romaji": "ma"
  },
  "礎": {
    "kana": "いしずえ",
    "romaji": "ishizue"
  },
  "示": {
    "kana": "じ",
    "romaji": "ji"
  },
  "礼": {
    "kana": "れい",
    "romaji": "rei"
  },
  "社": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "祈": {
    "kana": "れい",
    "romaji": "rei"
  },
  "祉": {
    "kana": "し",
    "romaji": "shi"
  },
  "祖": {
    "kana": "そ",
    "romaji": "so"
  },
  "祝": {
    "kana": "しゅく",
    "romaji": "shuku"
  },
  "神": {
    "kana": "かみ",
    "romaji": "kami"
  },
  "祥": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "票": {
    "kana": "ひょう",
    "romaji": "hyou"
  },
  "祭": {
    "kana": "まつり",
    "romaji": "matsuri"
  },
  "視": {
    "kana": "し",
    "romaji": "shi"
  },
  "禁": {
    "kana": "きん",
    "romaji": "kin"
  },
  "禍": {
    "kana": "か",
    "romaji": "ka"
  },
  "福": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "私": {
    "kana": "わたし",
    "romaji": "watashi"
  },
  "秋": {
    "kana": "あき",
    "romaji": "aki"
  },
  "科": {
    "kana": "か",
    "romaji": "ka"
  },
  "秒": {
    "kana": "びょう",
    "romaji": "byou"
  },
  "秘": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "称": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "移": {
    "kana": "い",
    "romaji": "i"
  },
  "程": {
    "kana": "ほど",
    "romaji": "hodo"
  },
  "税": {
    "kana": "ぜい",
    "romaji": "zei"
  },
  "稟": {
    "kana": "りん",
    "romaji": "rin"
  },
  "種": {
    "kana": "しゅ",
    "romaji": "shu"
  },
  "稼": {
    "kana": "か",
    "romaji": "ka"
  },
  "稿": {
    "kana": "こう",
    "romaji": "kou"
  },
  "積": {
    "kana": "せき",
    "romaji": "seki"
  },
  "穏": {
    "kana": "おん",
    "romaji": "on"
  },
  "穫": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "穴": {
    "kana": "あな",
    "romaji": "ana"
  },
  "究": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "空": {
    "kana": "そら",
    "romaji": "sora"
  },
  "穽": {
    "kana": "せい",
    "romaji": "sei"
  },
  "突": {
    "kana": "とつ",
    "romaji": "totsu"
  },
  "窃": {
    "kana": "せつ",
    "romaji": "setsu"
  },
  "窓": {
    "kana": "まど",
    "romaji": "mado"
  },
  "窮": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "立": {
    "kana": "た",
    "romaji": "ta"
  },
  "端": {
    "kana": "はじ",
    "romaji": "haji"
  },
  "競": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "竹": {
    "kana": "たけ",
    "romaji": "take"
  },
  "笑": {
    "kana": "わら",
    "romaji": "wara"
  },
  "符": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "第": {
    "kana": "だい",
    "romaji": "dai"
  },
  "筆": {
    "kana": "ふで",
    "romaji": "fude"
  },
  "等": {
    "kana": "など",
    "romaji": "nado"
  },
  "筋": {
    "kana": "すじ",
    "romaji": "suji"
  },
  "筒": {
    "kana": "つつ",
    "romaji": "tsutsu"
  },
  "答": {
    "kana": "こたえ",
    "romaji": "kotae"
  },
  "策": {
    "kana": "さく",
    "romaji": "saku"
  },
  "節": {
    "kana": "ふし",
    "romaji": "fushi"
  },
  "箇": {
    "kana": "か",
    "romaji": "ka"
  },
  "算": {
    "kana": "さん",
    "romaji": "san"
  },
  "管": {
    "kana": "かん",
    "romaji": "kan"
  },
  "箱": {
    "kana": "はこ",
    "romaji": "hako"
  },
  "箸": {
    "kana": "はし",
    "romaji": "hashi"
  },
  "範": {
    "kana": "はん",
    "romaji": "han"
  },
  "築": {
    "kana": "ちく",
    "romaji": "chiku"
  },
  "簡": {
    "kana": "かん",
    "romaji": "kan"
  },
  "籍": {
    "kana": "せき",
    "romaji": "seki"
  },
  "米": {
    "kana": "こめ",
    "romaji": "kome"
  },
  "粋": {
    "kana": "すい",
    "romaji": "sui"
  },
  "粒": {
    "kana": "つぶ",
    "romaji": "tsubu"
  },
  "粘": {
    "kana": "ねん",
    "romaji": "nen"
  },
  "精": {
    "kana": "せい",
    "romaji": "sei"
  },
  "糊": {
    "kana": "のり",
    "romaji": "nori"
  },
  "糖": {
    "kana": "とう",
    "romaji": "tou"
  },
  "糸": {
    "kana": "いと",
    "romaji": "ito"
  },
  "系": {
    "kana": "けい",
    "romaji": "kei"
  },
  "糾": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "紀": {
    "kana": "き",
    "romaji": "ki"
  },
  "約": {
    "kana": "やく",
    "romaji": "yaku"
  },
  "紅": {
    "kana": "くれない",
    "romaji": "kurenai"
  },
  "納": {
    "kana": "のう",
    "romaji": "nou"
  },
  "紐": {
    "kana": "ひも",
    "romaji": "himo"
  },
  "純": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "紙": {
    "kana": "かみ",
    "romaji": "kami"
  },
  "紛": {
    "kana": "ふん",
    "romaji": "fun"
  },
  "素": {
    "kana": "す",
    "romaji": "su"
  },
  "索": {
    "kana": "さく",
    "romaji": "saku"
  },
  "紫": {
    "kana": "むらさき",
    "romaji": "murasaki"
  },
  "細": {
    "kana": "さい",
    "romaji": "sai"
  },
  "紹": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "終": {
    "kana": "お",
    "romaji": "o"
  },
  "組": {
    "kana": "くみ",
    "romaji": "kumi"
  },
  "経": {
    "kana": "けい",
    "romaji": "kei"
  },
  "結": {
    "kana": "けつ",
    "romaji": "ketsu"
  },
  "絞": {
    "kana": "こう",
    "romaji": "kou"
  },
  "絡": {
    "kana": "らく",
    "romaji": "raku"
  },
  "給": {
    "kana": "きゅう",
    "romaji": "kyuu"
  },
  "統": {
    "kana": "とう",
    "romaji": "tou"
  },
  "絵": {
    "kana": "え",
    "romaji": "e"
  },
  "絶": {
    "kana": "ぜつ",
    "romaji": "zetsu"
  },
  "継": {
    "kana": "けい",
    "romaji": "kei"
  },
  "続": {
    "kana": "ぞく",
    "romaji": "zoku"
  },
  "綜": {
    "kana": "そう",
    "romaji": "sou"
  },
  "維": {
    "kana": "い",
    "romaji": "i"
  },
  "網": {
    "kana": "あみ",
    "romaji": "ami"
  },
  "綺": {
    "kana": "き",
    "romaji": "ki"
  },
  "綿": {
    "kana": "めん",
    "romaji": "men"
  },
  "緊": {
    "kana": "きん",
    "romaji": "kin"
  },
  "総": {
    "kana": "そう",
    "romaji": "sou"
  },
  "緑": {
    "kana": "みどり",
    "romaji": "midori"
  },
  "緒": {
    "kana": "お",
    "romaji": "o"
  },
  "線": {
    "kana": "せん",
    "romaji": "sen"
  },
  "締": {
    "kana": "てい",
    "romaji": "tei"
  },
  "編": {
    "kana": "へん",
    "romaji": "hen"
  },
  "緩": {
    "kana": "かん",
    "romaji": "kan"
  },
  "緯": {
    "kana": "い",
    "romaji": "i"
  },
  "練": {
    "kana": "れん",
    "romaji": "ren"
  },
  "緻": {
    "kana": "ち",
    "romaji": "chi"
  },
  "縁": {
    "kana": "へり",
    "romaji": "heri"
  },
  "縛": {
    "kana": "ばく",
    "romaji": "baku"
  },
  "縦": {
    "kana": "たて",
    "romaji": "tate"
  },
  "縮": {
    "kana": "しゅく",
    "romaji": "shuku"
  },
  "績": {
    "kana": "せき",
    "romaji": "seki"
  },
  "繁": {
    "kana": "はん",
    "romaji": "han"
  },
  "繊": {
    "kana": "せん",
    "romaji": "sen"
  },
  "織": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "繕": {
    "kana": "ぜん",
    "romaji": "zen"
  },
  "繋": {
    "kana": "けい",
    "romaji": "kei"
  },
  "繰": {
    "kana": "そう",
    "romaji": "sou"
  },
  "繹": {
    "kana": "えき",
    "romaji": "eki"
  },
  "缶": {
    "kana": "かん",
    "romaji": "kan"
  },
  "罪": {
    "kana": "つみ",
    "romaji": "tsumi"
  },
  "置": {
    "kana": "お",
    "romaji": "o"
  },
  "署": {
    "kana": "しょ",
    "romaji": "sho"
  },
  "罰": {
    "kana": "ばつ",
    "romaji": "batsu"
  },
  "羅": {
    "kana": "ら",
    "romaji": "ra"
  },
  "羊": {
    "kana": "ひつじ",
    "romaji": "hitsuji"
  },
  "美": {
    "kana": "おい",
    "romaji": "oi"
  },
  "群": {
    "kana": "ぐん",
    "romaji": "gun"
  },
  "義": {
    "kana": "ぎ",
    "romaji": "gi"
  },
  "翌": {
    "kana": "よく",
    "romaji": "yoku"
  },
  "習": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "翼": {
    "kana": "つばさ",
    "romaji": "tsubasa"
  },
  "翻": {
    "kana": "ほん",
    "romaji": "hon"
  },
  "老": {
    "kana": "ろう",
    "romaji": "rou"
  },
  "考": {
    "kana": "かんが",
    "romaji": "kanga"
  },
  "者": {
    "kana": "もの",
    "romaji": "mono"
  },
  "耐": {
    "kana": "たい",
    "romaji": "tai"
  },
  "耳": {
    "kana": "みみ",
    "romaji": "mimi"
  },
  "聖": {
    "kana": "ひじり",
    "romaji": "hijiri"
  },
  "聞": {
    "kana": "き",
    "romaji": "ki"
  },
  "聴": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "職": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "肉": {
    "kana": "にく",
    "romaji": "niku"
  },
  "肝": {
    "kana": "きも",
    "romaji": "kimo"
  },
  "肢": {
    "kana": "し",
    "romaji": "shi"
  },
  "肩": {
    "kana": "かた",
    "romaji": "kata"
  },
  "肯": {
    "kana": "こう",
    "romaji": "kou"
  },
  "育": {
    "kana": "いく",
    "romaji": "iku"
  },
  "背": {
    "kana": "せ",
    "romaji": "se"
  },
  "胞": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "胡": {
    "kana": "こ",
    "romaji": "ko"
  },
  "胸": {
    "kana": "むね",
    "romaji": "mune"
  },
  "能": {
    "kana": "のう",
    "romaji": "nou"
  },
  "脅": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "脆": {
    "kana": "ぜい",
    "romaji": "zei"
  },
  "脈": {
    "kana": "みゃく",
    "romaji": "myaku"
  },
  "脱": {
    "kana": "だつ",
    "romaji": "datsu"
  },
  "腐": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "腕": {
    "kana": "うで",
    "romaji": "ude"
  },
  "腰": {
    "kana": "こし",
    "romaji": "koshi"
  },
  "腸": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "腹": {
    "kana": "はら",
    "romaji": "hara"
  },
  "膠": {
    "kana": "にかわ",
    "romaji": "nikawa"
  },
  "膨": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "膳": {
    "kana": "ぜん",
    "romaji": "zen"
  },
  "臓": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "臨": {
    "kana": "りん",
    "romaji": "rin"
  },
  "自": {
    "kana": "じ",
    "romaji": "ji"
  },
  "至": {
    "kana": "いた",
    "romaji": "ita"
  },
  "致": {
    "kana": "ち",
    "romaji": "chi"
  },
  "興": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "舎": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "舐": {
    "kana": "し",
    "romaji": "shi"
  },
  "舗": {
    "kana": "ほ",
    "romaji": "ho"
  },
  "舞": {
    "kana": "まい",
    "romaji": "mai"
  },
  "航": {
    "kana": "こう",
    "romaji": "kou"
  },
  "般": {
    "kana": "はん",
    "romaji": "han"
  },
  "船": {
    "kana": "ふね",
    "romaji": "fune"
  },
  "良": {
    "kana": "よ",
    "romaji": "yo"
  },
  "色": {
    "kana": "いろ",
    "romaji": "iro"
  },
  "芋": {
    "kana": "いも",
    "romaji": "imo"
  },
  "花": {
    "kana": "はな",
    "romaji": "hana"
  },
  "芸": {
    "kana": "げい",
    "romaji": "gei"
  },
  "若": {
    "kana": "じゃく",
    "romaji": "jaku"
  },
  "苦": {
    "kana": "にが",
    "romaji": "niga"
  },
  "英": {
    "kana": "えい",
    "romaji": "ei"
  },
  "苺": {
    "kana": "いちご",
    "romaji": "ichigo"
  },
  "茄": {
    "kana": "か",
    "romaji": "ka"
  },
  "茶": {
    "kana": "ちゃ",
    "romaji": "cha"
  },
  "草": {
    "kana": "くさ",
    "romaji": "kusa"
  },
  "荒": {
    "kana": "こう",
    "romaji": "kou"
  },
  "荷": {
    "kana": "か",
    "romaji": "ka"
  },
  "莫": {
    "kana": "ばく",
    "romaji": "baku"
  },
  "菌": {
    "kana": "きん",
    "romaji": "kin"
  },
  "菓": {
    "kana": "か",
    "romaji": "ka"
  },
  "菜": {
    "kana": "さい",
    "romaji": "sai"
  },
  "華": {
    "kana": "はな",
    "romaji": "hana"
  },
  "萄": {
    "kana": "どう",
    "romaji": "dou"
  },
  "萎": {
    "kana": "い",
    "romaji": "i"
  },
  "著": {
    "kana": "ちょ",
    "romaji": "cho"
  },
  "落": {
    "kana": "お",
    "romaji": "o"
  },
  "葉": {
    "kana": "は",
    "romaji": "ha"
  },
  "葡": {
    "kana": "ぶ",
    "romaji": "bu"
  },
  "葱": {
    "kana": "ねぎ",
    "romaji": "negi"
  },
  "蒔": {
    "kana": "じ",
    "romaji": "ji"
  },
  "蓄": {
    "kana": "ちく",
    "romaji": "chiku"
  },
  "蓋": {
    "kana": "ふた",
    "romaji": "futa"
  },
  "蔓": {
    "kana": "つる",
    "romaji": "tsuru"
  },
  "蔵": {
    "kana": "くら",
    "romaji": "kura"
  },
  "蔽": {
    "kana": "へい",
    "romaji": "hei"
  },
  "薄": {
    "kana": "はく",
    "romaji": "haku"
  },
  "薦": {
    "kana": "せん",
    "romaji": "sen"
  },
  "薬": {
    "kana": "くすり",
    "romaji": "kusuri"
  },
  "藤": {
    "kana": "ふじ",
    "romaji": "fuji"
  },
  "虎": {
    "kana": "とら",
    "romaji": "tora"
  },
  "虫": {
    "kana": "むし",
    "romaji": "mushi"
  },
  "蛇": {
    "kana": "へび",
    "romaji": "hebi"
  },
  "蜜": {
    "kana": "みつ",
    "romaji": "mitsu"
  },
  "蝶": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "融": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "蟻": {
    "kana": "あり",
    "romaji": "ari"
  },
  "血": {
    "kana": "ち",
    "romaji": "chi"
  },
  "衆": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "行": {
    "kana": "い",
    "romaji": "i"
  },
  "衍": {
    "kana": "えん",
    "romaji": "en"
  },
  "術": {
    "kana": "じゅつ",
    "romaji": "jutsu"
  },
  "街": {
    "kana": "まち",
    "romaji": "machi"
  },
  "衛": {
    "kana": "まもる",
    "romaji": "mamoru"
  },
  "衝": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "衡": {
    "kana": "こう",
    "romaji": "kou"
  },
  "衣": {
    "kana": "ころも",
    "romaji": "koromo"
  },
  "表": {
    "kana": "ひょう",
    "romaji": "hyou"
  },
  "袋": {
    "kana": "ふくろ",
    "romaji": "fukuro"
  },
  "被": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "裁": {
    "kana": "さい",
    "romaji": "sai"
  },
  "裂": {
    "kana": "れつ",
    "romaji": "retsu"
  },
  "装": {
    "kana": "そう",
    "romaji": "sou"
  },
  "裏": {
    "kana": "うら",
    "romaji": "ura"
  },
  "裕": {
    "kana": "ひろし",
    "romaji": "hiroshi"
  },
  "補": {
    "kana": "ほ",
    "romaji": "ho"
  },
  "製": {
    "kana": "せい",
    "romaji": "sei"
  },
  "複": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "褒": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "襲": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "西": {
    "kana": "にし",
    "romaji": "nishi"
  },
  "要": {
    "kana": "よう",
    "romaji": "you"
  },
  "覆": {
    "kana": "ふく",
    "romaji": "fuku"
  },
  "覇": {
    "kana": "は",
    "romaji": "ha"
  },
  "見": {
    "kana": "み",
    "romaji": "mi"
  },
  "規": {
    "kana": "き",
    "romaji": "ki"
  },
  "覚": {
    "kana": "おぼ",
    "romaji": "obo"
  },
  "覧": {
    "kana": "らん",
    "romaji": "ran"
  },
  "親": {
    "kana": "おや",
    "romaji": "oya"
  },
  "観": {
    "kana": "かん",
    "romaji": "kan"
  },
  "角": {
    "kana": "かど",
    "romaji": "kado"
  },
  "解": {
    "kana": "かい",
    "romaji": "kai"
  },
  "触": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "言": {
    "kana": "い",
    "romaji": "i"
  },
  "計": {
    "kana": "けい",
    "romaji": "kei"
  },
  "討": {
    "kana": "とう",
    "romaji": "tou"
  },
  "訓": {
    "kana": "くん",
    "romaji": "kun"
  },
  "記": {
    "kana": "き",
    "romaji": "ki"
  },
  "訪": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "設": {
    "kana": "せつ",
    "romaji": "setsu"
  },
  "許": {
    "kana": "もと",
    "romaji": "moto"
  },
  "訳": {
    "kana": "わけ",
    "romaji": "wake"
  },
  "訴": {
    "kana": "そ",
    "romaji": "so"
  },
  "診": {
    "kana": "しん",
    "romaji": "shin"
  },
  "証": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "評": {
    "kana": "ひょう",
    "romaji": "hyou"
  },
  "詞": {
    "kana": "し",
    "romaji": "shi"
  },
  "試": {
    "kana": "ため",
    "romaji": "tame"
  },
  "詫": {
    "kana": "た",
    "romaji": "ta"
  },
  "詰": {
    "kana": "つめ",
    "romaji": "tsume"
  },
  "話": {
    "kana": "はなし",
    "romaji": "hanashi"
  },
  "該": {
    "kana": "がい",
    "romaji": "gai"
  },
  "詳": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "誇": {
    "kana": "こ",
    "romaji": "ko"
  },
  "誉": {
    "kana": "よ",
    "romaji": "yo"
  },
  "誠": {
    "kana": "まこと",
    "romaji": "makoto"
  },
  "誌": {
    "kana": "し",
    "romaji": "shi"
  },
  "認": {
    "kana": "にん",
    "romaji": "nin"
  },
  "誕": {
    "kana": "たん",
    "romaji": "tan"
  },
  "誘": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "語": {
    "kana": "ご",
    "romaji": "go"
  },
  "誤": {
    "kana": "ご",
    "romaji": "go"
  },
  "説": {
    "kana": "せつ",
    "romaji": "setsu"
  },
  "読": {
    "kana": "よ",
    "romaji": "yo"
  },
  "誰": {
    "kana": "だれ",
    "romaji": "dare"
  },
  "課": {
    "kana": "か",
    "romaji": "ka"
  },
  "調": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "談": {
    "kana": "だん",
    "romaji": "dan"
  },
  "請": {
    "kana": "せい",
    "romaji": "sei"
  },
  "論": {
    "kana": "ろん",
    "romaji": "ron"
  },
  "諦": {
    "kana": "てい",
    "romaji": "tei"
  },
  "諭": {
    "kana": "さとし",
    "romaji": "satoshi"
  },
  "謙": {
    "kana": "けん",
    "romaji": "ken"
  },
  "講": {
    "kana": "こう",
    "romaji": "kou"
  },
  "謝": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "識": {
    "kana": "しき",
    "romaji": "shiki"
  },
  "警": {
    "kana": "けい",
    "romaji": "kei"
  },
  "議": {
    "kana": "ぎ",
    "romaji": "gi"
  },
  "譲": {
    "kana": "ゆずる",
    "romaji": "yuzuru"
  },
  "護": {
    "kana": "ご",
    "romaji": "go"
  },
  "讃": {
    "kana": "さん",
    "romaji": "san"
  },
  "谷": {
    "kana": "たに",
    "romaji": "tani"
  },
  "豆": {
    "kana": "まめ",
    "romaji": "mame"
  },
  "豊": {
    "kana": "ゆたか",
    "romaji": "yutaka"
  },
  "豚": {
    "kana": "ぶた",
    "romaji": "buta"
  },
  "象": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "豪": {
    "kana": "ごう",
    "romaji": "gou"
  },
  "負": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "財": {
    "kana": "ざい",
    "romaji": "zai"
  },
  "貢": {
    "kana": "みつぐ",
    "romaji": "mitsugu"
  },
  "貧": {
    "kana": "びん",
    "romaji": "bin"
  },
  "貨": {
    "kana": "か",
    "romaji": "ka"
  },
  "販": {
    "kana": "はん",
    "romaji": "han"
  },
  "貫": {
    "kana": "かん",
    "romaji": "kan"
  },
  "責": {
    "kana": "せき",
    "romaji": "seki"
  },
  "貯": {
    "kana": "ちょ",
    "romaji": "cho"
  },
  "貰": {
    "kana": "せい",
    "romaji": "sei"
  },
  "貴": {
    "kana": "たかし",
    "romaji": "takashi"
  },
  "買": {
    "kana": "か",
    "romaji": "ka"
  },
  "貸": {
    "kana": "か",
    "romaji": "ka"
  },
  "費": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "貼": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "賃": {
    "kana": "ちん",
    "romaji": "chin"
  },
  "賄": {
    "kana": "わい",
    "romaji": "wai"
  },
  "資": {
    "kana": "し",
    "romaji": "shi"
  },
  "賑": {
    "kana": "にぎ",
    "romaji": "nigi"
  },
  "賛": {
    "kana": "さん",
    "romaji": "san"
  },
  "賜": {
    "kana": "たまもの",
    "romaji": "tamamono"
  },
  "賞": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "質": {
    "kana": "しつ",
    "romaji": "shitsu"
  },
  "購": {
    "kana": "こう",
    "romaji": "kou"
  },
  "贈": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "赤": {
    "kana": "あか",
    "romaji": "aka"
  },
  "赦": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "走": {
    "kana": "はし",
    "romaji": "hashi"
  },
  "赴": {
    "kana": "ふ",
    "romaji": "fu"
  },
  "起": {
    "kana": "お",
    "romaji": "o"
  },
  "超": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "越": {
    "kana": "えつ",
    "romaji": "etsu"
  },
  "趣": {
    "kana": "おもむき",
    "romaji": "omomuki"
  },
  "趨": {
    "kana": "すう",
    "romaji": "suu"
  },
  "足": {
    "kana": "あし",
    "romaji": "ashi"
  },
  "距": {
    "kana": "きょ",
    "romaji": "kyo"
  },
  "践": {
    "kana": "せん",
    "romaji": "sen"
  },
  "路": {
    "kana": "みち",
    "romaji": "michi"
  },
  "踊": {
    "kana": "よう",
    "romaji": "you"
  },
  "踏": {
    "kana": "とう",
    "romaji": "tou"
  },
  "身": {
    "kana": "み",
    "romaji": "mi"
  },
  "車": {
    "kana": "くるま",
    "romaji": "kuruma"
  },
  "軋": {
    "kana": "あつ",
    "romaji": "atsu"
  },
  "軟": {
    "kana": "なん",
    "romaji": "nan"
  },
  "転": {
    "kana": "てん",
    "romaji": "ten"
  },
  "軸": {
    "kana": "じく",
    "romaji": "jiku"
  },
  "軽": {
    "kana": "かる",
    "romaji": "karu"
  },
  "載": {
    "kana": "さい",
    "romaji": "sai"
  },
  "輝": {
    "kana": "てる",
    "romaji": "teru"
  },
  "輩": {
    "kana": "やから",
    "romaji": "yakara"
  },
  "輪": {
    "kana": "わ",
    "romaji": "wa"
  },
  "輸": {
    "kana": "ゆ",
    "romaji": "yu"
  },
  "轢": {
    "kana": "れき",
    "romaji": "reki"
  },
  "辛": {
    "kana": "から",
    "romaji": "kara"
  },
  "辞": {
    "kana": "じ",
    "romaji": "ji"
  },
  "辱": {
    "kana": "じょく",
    "romaji": "joku"
  },
  "農": {
    "kana": "のう",
    "romaji": "nou"
  },
  "辺": {
    "kana": "へん",
    "romaji": "hen"
  },
  "込": {
    "kana": "こみ",
    "romaji": "komi"
  },
  "巡": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "迅": {
    "kana": "じん",
    "romaji": "jin"
  },
  "迎": {
    "kana": "げい",
    "romaji": "gei"
  },
  "近": {
    "kana": "きん",
    "romaji": "kin"
  },
  "返": {
    "kana": "へん",
    "romaji": "hen"
  },
  "迫": {
    "kana": "さこ",
    "romaji": "sako"
  },
  "述": {
    "kana": "じゅつ",
    "romaji": "jutsu"
  },
  "迷": {
    "kana": "めい",
    "romaji": "mei"
  },
  "追": {
    "kana": "つい",
    "romaji": "tsui"
  },
  "退": {
    "kana": "たい",
    "romaji": "tai"
  },
  "送": {
    "kana": "おく",
    "romaji": "oku"
  },
  "逃": {
    "kana": "とう",
    "romaji": "tou"
  },
  "逆": {
    "kana": "ぎゃく",
    "romaji": "gyaku"
  },
  "透": {
    "kana": "とうる",
    "romaji": "touru"
  },
  "逐": {
    "kana": "ちく",
    "romaji": "chiku"
  },
  "途": {
    "kana": "と",
    "romaji": "to"
  },
  "通": {
    "kana": "とおり",
    "romaji": "toori"
  },
  "速": {
    "kana": "そく",
    "romaji": "soku"
  },
  "造": {
    "kana": "ぞう",
    "romaji": "zou"
  },
  "連": {
    "kana": "れん",
    "romaji": "ren"
  },
  "週": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "進": {
    "kana": "すす",
    "romaji": "susu"
  },
  "逸": {
    "kana": "いつ",
    "romaji": "itsu"
  },
  "逼": {
    "kana": "ひつ",
    "romaji": "hitsu"
  },
  "遂": {
    "kana": "すい",
    "romaji": "sui"
  },
  "遅": {
    "kana": "ち",
    "romaji": "chi"
  },
  "遊": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "運": {
    "kana": "うん",
    "romaji": "un"
  },
  "遍": {
    "kana": "へん",
    "romaji": "hen"
  },
  "過": {
    "kana": "か",
    "romaji": "ka"
  },
  "道": {
    "kana": "みち",
    "romaji": "michi"
  },
  "達": {
    "kana": "とおる",
    "romaji": "tooru"
  },
  "違": {
    "kana": "ちが",
    "romaji": "chiga"
  },
  "遜": {
    "kana": "そん",
    "romaji": "son"
  },
  "遠": {
    "kana": "えん",
    "romaji": "en"
  },
  "遡": {
    "kana": "そ",
    "romaji": "so"
  },
  "適": {
    "kana": "てき",
    "romaji": "teki"
  },
  "遮": {
    "kana": "しゃ",
    "romaji": "sha"
  },
  "遵": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "選": {
    "kana": "せん",
    "romaji": "sen"
  },
  "遺": {
    "kana": "い",
    "romaji": "i"
  },
  "避": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "還": {
    "kana": "かん",
    "romaji": "kan"
  },
  "邪": {
    "kana": "じゃ",
    "romaji": "ja"
  },
  "郊": {
    "kana": "こう",
    "romaji": "kou"
  },
  "部": {
    "kana": "ぶ",
    "romaji": "bu"
  },
  "郭": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "郵": {
    "kana": "ゆう",
    "romaji": "yuu"
  },
  "都": {
    "kana": "みやこ",
    "romaji": "miyako"
  },
  "酌": {
    "kana": "しゃく",
    "romaji": "shaku"
  },
  "配": {
    "kana": "ぱい",
    "romaji": "pai"
  },
  "酒": {
    "kana": "さけ",
    "romaji": "sake"
  },
  "酔": {
    "kana": "すい",
    "romaji": "sui"
  },
  "酬": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "酵": {
    "kana": "こう",
    "romaji": "kou"
  },
  "酷": {
    "kana": "こく",
    "romaji": "koku"
  },
  "酸": {
    "kana": "す",
    "romaji": "su"
  },
  "醤": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "醸": {
    "kana": "じょう",
    "romaji": "jou"
  },
  "采": {
    "kana": "さい",
    "romaji": "sai"
  },
  "釈": {
    "kana": "しゃく",
    "romaji": "shaku"
  },
  "里": {
    "kana": "さと",
    "romaji": "sato"
  },
  "重": {
    "kana": "じゅう",
    "romaji": "juu"
  },
  "野": {
    "kana": "や",
    "romaji": "ya"
  },
  "量": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "金": {
    "kana": "きん",
    "romaji": "kin"
  },
  "釘": {
    "kana": "くぎ",
    "romaji": "kugi"
  },
  "針": {
    "kana": "はり",
    "romaji": "hari"
  },
  "釣": {
    "kana": "つり",
    "romaji": "tsuri"
  },
  "鈴": {
    "kana": "すず",
    "romaji": "suzu"
  },
  "鉄": {
    "kana": "てつ",
    "romaji": "tetsu"
  },
  "鉛": {
    "kana": "なまり",
    "romaji": "namari"
  },
  "龯": {
    "kana": "えつ",
    "romaji": "etsu"
  },
  "銀": {
    "kana": "ぎん",
    "romaji": "gin"
  },
  "銘": {
    "kana": "めい",
    "romaji": "mei"
  },
  "鋏": {
    "kana": "はさみ",
    "romaji": "hasami"
  },
  "鋭": {
    "kana": "えい",
    "romaji": "ei"
  },
  "錬": {
    "kana": "れん",
    "romaji": "ren"
  },
  "錯": {
    "kana": "さく",
    "romaji": "saku"
  },
  "録": {
    "kana": "ろく",
    "romaji": "roku"
  },
  "鍋": {
    "kana": "なべ",
    "romaji": "nabe"
  },
  "鍛": {
    "kana": "たん",
    "romaji": "tan"
  },
  "鍵": {
    "kana": "かぎ",
    "romaji": "kagi"
  },
  "鎌": {
    "kana": "かま",
    "romaji": "kama"
  },
  "鎖": {
    "kana": "くさり",
    "romaji": "kusari"
  },
  "鏡": {
    "kana": "かがみ",
    "romaji": "kagami"
  },
  "鑑": {
    "kana": "かん",
    "romaji": "kan"
  },
  "鑽": {
    "kana": "さん",
    "romaji": "san"
  },
  "長": {
    "kana": "ちょう",
    "romaji": "chou"
  },
  "門": {
    "kana": "もん",
    "romaji": "mon"
  },
  "閉": {
    "kana": "へい",
    "romaji": "hei"
  },
  "開": {
    "kana": "かい",
    "romaji": "kai"
  },
  "閑": {
    "kana": "ひま",
    "romaji": "hima"
  },
  "間": {
    "kana": "あいだ",
    "romaji": "aida"
  },
  "関": {
    "kana": "かん",
    "romaji": "kan"
  },
  "閲": {
    "kana": "えつ",
    "romaji": "etsu"
  },
  "閾": {
    "kana": "いき",
    "romaji": "iki"
  },
  "闘": {
    "kana": "とう",
    "romaji": "tou"
  },
  "阪": {
    "kana": "さか",
    "romaji": "saka"
  },
  "防": {
    "kana": "ぼう",
    "romaji": "bou"
  },
  "阻": {
    "kana": "そ",
    "romaji": "so"
  },
  "降": {
    "kana": "こう",
    "romaji": "kou"
  },
  "限": {
    "kana": "げん",
    "romaji": "gen"
  },
  "院": {
    "kana": "いん",
    "romaji": "in"
  },
  "陣": {
    "kana": "じん",
    "romaji": "jin"
  },
  "除": {
    "kana": "じょ",
    "romaji": "jo"
  },
  "陥": {
    "kana": "かん",
    "romaji": "kan"
  },
  "陰": {
    "kana": "いん",
    "romaji": "in"
  },
  "陳": {
    "kana": "ちん",
    "romaji": "chin"
  },
  "陸": {
    "kana": "りく",
    "romaji": "riku"
  },
  "険": {
    "kana": "けん",
    "romaji": "ken"
  },
  "陽": {
    "kana": "よう",
    "romaji": "you"
  },
  "隅": {
    "kana": "すみ",
    "romaji": "sumi"
  },
  "隆": {
    "kana": "たかし",
    "romaji": "takashi"
  },
  "階": {
    "kana": "かい",
    "romaji": "kai"
  },
  "随": {
    "kana": "ずい",
    "romaji": "zui"
  },
  "隔": {
    "kana": "かく",
    "romaji": "kaku"
  },
  "際": {
    "kana": "きわ",
    "romaji": "kiwa"
  },
  "障": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "隠": {
    "kana": "いん",
    "romaji": "in"
  },
  "隣": {
    "kana": "となり",
    "romaji": "tonari"
  },
  "集": {
    "kana": "しゅう",
    "romaji": "shuu"
  },
  "雇": {
    "kana": "こ",
    "romaji": "ko"
  },
  "雑": {
    "kana": "ざつ",
    "romaji": "zatsu"
  },
  "離": {
    "kana": "り",
    "romaji": "ri"
  },
  "難": {
    "kana": "なん",
    "romaji": "nan"
  },
  "雨": {
    "kana": "あめ",
    "romaji": "ame"
  },
  "雪": {
    "kana": "ゆき",
    "romaji": "yuki"
  },
  "雰": {
    "kana": "ふん",
    "romaji": "fun"
  },
  "雲": {
    "kana": "くも",
    "romaji": "kumo"
  },
  "零": {
    "kana": "れい",
    "romaji": "rei"
  },
  "雷": {
    "kana": "かみなり",
    "romaji": "kaminari"
  },
  "雹": {
    "kana": "ひょう",
    "romaji": "hyou"
  },
  "電": {
    "kana": "でん",
    "romaji": "den"
  },
  "需": {
    "kana": "じゅ",
    "romaji": "ju"
  },
  "震": {
    "kana": "しん",
    "romaji": "shin"
  },
  "霧": {
    "kana": "きり",
    "romaji": "kiri"
  },
  "露": {
    "kana": "つゆ",
    "romaji": "tsuyu"
  },
  "青": {
    "kana": "あお",
    "romaji": "ao"
  },
  "静": {
    "kana": "しず",
    "romaji": "shizu"
  },
  "非": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "面": {
    "kana": "めん",
    "romaji": "men"
  },
  "革": {
    "kana": "かわ",
    "romaji": "kawa"
  },
  "靱": {
    "kana": "じん",
    "romaji": "jin"
  },
  "靴": {
    "kana": "くつ",
    "romaji": "kutsu"
  },
  "鞄": {
    "kana": "かばん",
    "romaji": "kaban"
  },
  "鞭": {
    "kana": "むち",
    "romaji": "muchi"
  },
  "韓": {
    "kana": "かん",
    "romaji": "kan"
  },
  "音": {
    "kana": "おと",
    "romaji": "oto"
  },
  "章": {
    "kana": "しょう",
    "romaji": "shou"
  },
  "韻": {
    "kana": "いん",
    "romaji": "in"
  },
  "響": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "頁": {
    "kana": "ぺーじ",
    "romaji": "peeji"
  },
  "頂": {
    "kana": "いただき",
    "romaji": "itadaki"
  },
  "頃": {
    "kana": "ころ",
    "romaji": "koro"
  },
  "項": {
    "kana": "こう",
    "romaji": "kou"
  },
  "順": {
    "kana": "じゅん",
    "romaji": "jun"
  },
  "須": {
    "kana": "す",
    "romaji": "su"
  },
  "預": {
    "kana": "よ",
    "romaji": "yo"
  },
  "頑": {
    "kana": "がん",
    "romaji": "gan"
  },
  "頓": {
    "kana": "とん",
    "romaji": "ton"
  },
  "領": {
    "kana": "りょう",
    "romaji": "ryou"
  },
  "頭": {
    "kana": "あたま",
    "romaji": "atama"
  },
  "頼": {
    "kana": "たの",
    "romaji": "tano"
  },
  "題": {
    "kana": "だい",
    "romaji": "dai"
  },
  "額": {
    "kana": "ひたい",
    "romaji": "hitai"
  },
  "顔": {
    "kana": "かお",
    "romaji": "kao"
  },
  "顕": {
    "kana": "けん",
    "romaji": "ken"
  },
  "願": {
    "kana": "がん",
    "romaji": "gan"
  },
  "類": {
    "kana": "るい",
    "romaji": "rui"
  },
  "顧": {
    "kana": "こ",
    "romaji": "ko"
  },
  "風": {
    "kana": "かぜ",
    "romaji": "kaze"
  },
  "飛": {
    "kana": "ひ",
    "romaji": "hi"
  },
  "食": {
    "kana": "た",
    "romaji": "ta"
  },
  "䶿": {
    "kana": "し",
    "romaji": "shi"
  },
  "飯": {
    "kana": "はん",
    "romaji": "han"
  },
  "飲": {
    "kana": "の",
    "romaji": "no"
  },
  "飼": {
    "kana": "し",
    "romaji": "shi"
  },
  "飽": {
    "kana": "ほう",
    "romaji": "hou"
  },
  "飾": {
    "kana": "しょく",
    "romaji": "shoku"
  },
  "餅": {
    "kana": "もち",
    "romaji": "mochi"
  },
  "養": {
    "kana": "よう",
    "romaji": "you"
  },
  "館": {
    "kana": "かん",
    "romaji": "kan"
  },
  "首": {
    "kana": "くび",
    "romaji": "kubi"
  },
  "香": {
    "kana": "かおり",
    "romaji": "kaori"
  },
  "馬": {
    "kana": "うま",
    "romaji": "uma"
  },
  "駄": {
    "kana": "だ",
    "romaji": "da"
  },
  "駅": {
    "kana": "えき",
    "romaji": "eki"
  },
  "駆": {
    "kana": "く",
    "romaji": "ku"
  },
  "駐": {
    "kana": "ちゅう",
    "romaji": "chuu"
  },
  "駕": {
    "kana": "が",
    "romaji": "ga"
  },
  "験": {
    "kana": "けん",
    "romaji": "ken"
  },
  "騰": {
    "kana": "とう",
    "romaji": "tou"
  },
  "驚": {
    "kana": "きょう",
    "romaji": "kyou"
  },
  "骨": {
    "kana": "ほね",
    "romaji": "hone"
  },
  "骸": {
    "kana": "むくろ",
    "romaji": "mukuro"
  },
  "高": {
    "kana": "たか",
    "romaji": "taka"
  },
  "髪": {
    "kana": "かみ",
    "romaji": "kami"
  },
  "髭": {
    "kana": "ひげ",
    "romaji": "hige"
  },
  "魅": {
    "kana": "み",
    "romaji": "mi"
  },
  "魔": {
    "kana": "ま",
    "romaji": "ma"
  },
  "魚": {
    "kana": "さかな",
    "romaji": "sakana"
  },
  "鮭": {
    "kana": "さけ",
    "romaji": "sake"
  },
  "鮮": {
    "kana": "せん",
    "romaji": "sen"
  },
  "鳥": {
    "kana": "とり",
    "romaji": "tori"
  },
  "鳴": {
    "kana": "めい",
    "romaji": "mei"
  },
  "鶏": {
    "kana": "にわとり",
    "romaji": "niwatori"
  },
  "鹸": {
    "kana": "けん",
    "romaji": "ken"
  },
  "麗": {
    "kana": "れい",
    "romaji": "rei"
  },
  "麦": {
    "kana": "むぎ",
    "romaji": "mugi"
  },
  "麹": {
    "kana": "こうじ",
    "romaji": "kouji"
  },
  "麺": {
    "kana": "めん",
    "romaji": "men"
  },
  "麻": {
    "kana": "あさ",
    "romaji": "asa"
  },
  "黄": {
    "kana": "き",
    "romaji": "ki"
  },
  "黒": {
    "kana": "くろ",
    "romaji": "kuro"
  },
  "墨": {
    "kana": "すみ",
    "romaji": "sumi"
  },
  "鼓": {
    "kana": "つづみ",
    "romaji": "tsuzumi"
  },
  "鼠": {
    "kana": "ねずみ",
    "romaji": "nezumi"
  },
  "鼻": {
    "kana": "はな",
    "romaji": "hana"
  },
  "齟": {
    "kana": "そ",
    "romaji": "so"
  },
  "齢": {
    "kana": "れい",
    "romaji": "rei"
  },
  "齬": {
    "kana": "ご",
    "romaji": "go"
  },
  "鿿": {
    "kana": "",
    "romaji": ""
  }
};

  var COUNTERS = {
  "時": {
    "specials": {
      "1": "いちじ",
      "2": "にじ",
      "3": "さんじ",
      "4": "よじ",
      "5": "ごじ",
      "6": "ろくじ",
      "7": "しちじ",
      "8": "はちじ",
      "9": "くじ",
      "10": "じゅうじ",
      "11": "じゅういちじ",
      "12": "じゅうにじ"
    },
    "default": "じ"
  },
  "分": {
    "specials": {
      "1": "いっぷん",
      "2": "にふん",
      "3": "さんぷん",
      "4": "よんぷん",
      "5": "ごふん",
      "6": "ろっぷん",
      "7": "ななふん",
      "8": "はっぷん",
      "9": "きゅうふん",
      "10": "じゅっぷん",
      "15": "じゅうごふん",
      "20": "にじゅっぷん",
      "30": "さんじゅっぷん",
      "45": "よんじゅうごふん"
    },
    "default": "ふん"
  },
  "日": {
    "specials": {
      "1": "ついたち",
      "2": "ふつか",
      "3": "みっか",
      "4": "よっか",
      "5": "いつか",
      "6": "むいか",
      "7": "なのか",
      "8": "ようか",
      "9": "ここのか",
      "10": "とおか",
      "14": "じゅうよっか",
      "20": "はつか",
      "24": "にじゅうよっか"
    },
    "default": "にち"
  },
  "月": {
    "specials": {
      "1": "いちがつ",
      "2": "にがつ",
      "3": "さんがつ",
      "4": "しがつ",
      "5": "ごがつ",
      "6": "ろくがつ",
      "7": "しちがつ",
      "8": "はちがつ",
      "9": "くがつ",
      "10": "じゅうがつ",
      "11": "じゅういちがつ",
      "12": "じゅうにがつ"
    },
    "default": "がつ"
  },
  "年": {
    "specials": {
      "1": "いちねん",
      "2": "にねん",
      "3": "さんねん",
      "4": "よねん",
      "5": "ごねん",
      "6": "ろくねん",
      "7": "ななねん",
      "8": "はちねん",
      "9": "きゅうねん",
      "10": "じゅうねん"
    },
    "default": "ねん"
  },
  "回": {
    "specials": {
      "1": "いっかい",
      "2": "にかい",
      "3": "さんかい",
      "4": "よんかい",
      "5": "ごかい",
      "6": "ろっかい",
      "7": "ななかい",
      "8": "はっかい",
      "9": "きゅうかい",
      "10": "じゅっかい"
    },
    "default": "かい"
  },
  "人": {
    "specials": {
      "1": "ひとり",
      "2": "ふたり",
      "3": "さんにん",
      "4": "よにん",
      "5": "ごにん",
      "6": "ろくにん",
      "7": "ななにん",
      "8": "はちにん",
      "9": "きゅうにん",
      "10": "じゅうにん"
    },
    "default": "にん"
  },
  "歳": {
    "specials": {
      "1": "いっさい",
      "2": "にさい",
      "3": "さんさい",
      "4": "よんさい",
      "5": "ごさい",
      "6": "ろくさい",
      "7": "ななさい",
      "8": "はっさい",
      "9": "きゅうさい",
      "10": "じゅっさい",
      "20": "はたち"
    },
    "default": "さい"
  },
  "才": {
    "specials": {
      "1": "いっさい",
      "2": "にさい",
      "3": "さんさい",
      "4": "よんさい",
      "5": "ごさい",
      "6": "ろくさい",
      "7": "ななさい",
      "8": "はっさい",
      "9": "きゅうさい",
      "10": "じゅっさい",
      "20": "はたち"
    },
    "default": "さい"
  },
  "階": {
    "specials": {
      "1": "いっかい",
      "2": "にかい",
      "3": "さんがい",
      "4": "よんかい",
      "5": "ごかい",
      "6": "ろっかい",
      "7": "ななかい",
      "8": "はっかい",
      "9": "きゅうかい",
      "10": "じゅっかい"
    },
    "default": "かい"
  },
  "円": {
    "specials": {
      "100": "ひゃくえん",
      "500": "ごひゃくえん",
      "1000": "せんえん",
      "5000": "ごせんえん",
      "10000": "いちまんえん"
    },
    "default": "えん"
  },
  "本": {
    "specials": {
      "1": "いっぽん",
      "2": "にほん",
      "3": "さんぼん",
      "4": "よんほん",
      "5": "ごほん",
      "6": "ろっぽん",
      "7": "ななほん",
      "8": "はっぽん",
      "9": "きゅうほん",
      "10": "じゅっぽん"
    },
    "default": "ほん"
  },
  "枚": {
    "specials": {
      "1": "いちまい",
      "2": "にまい",
      "3": "さんまい",
      "4": "よんまい",
      "5": "ごまい"
    },
    "default": "まい"
  },
  "匹": {
    "specials": {
      "1": "いっぴき",
      "2": "にひき",
      "3": "さんびき",
      "4": "よんひき",
      "5": "ごひき",
      "6": "ろっぴき",
      "7": "ななひき",
      "8": "はっぴき",
      "9": "きゅうひき",
      "10": "じゅっぴき"
    },
    "default": "ひき"
  },
  "個": {
    "specials": {
      "1": "いっこ",
      "2": "にこ",
      "3": "さんこ",
      "4": "よんこ",
      "5": "ごこ",
      "6": "ろっこ",
      "7": "ななこ",
      "8": "はっこ",
      "9": "きゅうこ",
      "10": "じゅっこ"
    },
    "default": "こ"
  },
  "冊": {
    "specials": {
      "1": "いっさつ",
      "2": "にさつ",
      "3": "さんさつ",
      "4": "よんさつ",
      "5": "ごさつ",
      "6": "ろくさつ",
      "7": "ななさつ",
      "8": "はっさつ",
      "9": "きゅうさつ",
      "10": "じゅっさつ"
    },
    "default": "さつ"
  },
  "週間": {
    "specials": {
      "1": "いっしゅうかん",
      "2": "にしゅうかん",
      "3": "さんしゅうかん",
      "4": "よんしゅうかん",
      "5": "ごしゅうかん",
      "6": "ろくしゅうかん",
      "7": "ななしゅうかん",
      "8": "はっしゅうかん",
      "9": "きゅうしゅうかん",
      "10": "じゅっしゅうかん"
    },
    "default": "しゅうかん"
  },
  "ヶ月": {
    "specials": {
      "1": "いっかげつ",
      "2": "にかげつ",
      "3": "さんかげつ",
      "4": "よんかげつ",
      "5": "ごかげつ",
      "6": "ろっかげつ",
      "7": "ななかげつ",
      "8": "はっかげつ",
      "9": "きゅうかげつ",
      "10": "じゅっかげつ"
    },
    "default": "かげつ"
  },
  "か月": {
    "specials": {
      "1": "いっかげつ",
      "2": "にかげつ",
      "3": "さんかげつ",
      "4": "よんかげつ",
      "5": "ごかげつ",
      "6": "ろっかげつ",
      "7": "ななかげつ",
      "8": "はっかげつ",
      "9": "きゅうかげつ",
      "10": "じゅっかげつ"
    },
    "default": "かげつ"
  },
  "時間": {
    "specials": {
      "1": "いちじかん",
      "2": "にじかん",
      "3": "さんじかん",
      "4": "よじかん",
      "5": "ごじかん",
      "6": "ろくじかん",
      "7": "しちじかん",
      "8": "はちじかん",
      "9": "くじかん",
      "10": "じゅうじかん"
    },
    "default": "じかん"
  }
};

  var WORDS_KEYS = Object.keys(WORDS);

  var KANA_ROMAJI = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
    'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
    'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','や':'ya','ゆ':'yu','よ':'yo',
    'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'o','ん':'n',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
    'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
    'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','ゔ':'vu'
  };

  var YOON = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' };

  var PUNCT = {
    '。': '.', '、': ',', '！': '!', '？': '?',
    '「': '"', '」': '"', '『': '"', '』': '"',
    '・': ' ', '　': ' ', '～': '~', '（': '(', '）': ')',
    '(': '(', ')': ')'
  };

  function toHiragana(text) {
    return String(text || '').replace(/[ァ-ヶ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }

  function kanaToRomaji(kana) {
    if (!kana) return '';
    var s = toHiragana(kana), out = '', i = 0;
    while (i < s.length) {
      var c = s[i], next = s[i + 1];
      if (c === 'っ') {
        var after = kanaToRomaji(s.slice(i + 1, i + 3 + (YOON[s[i + 2]] ? 1 : 0)));
        out += after ? after[0] : '';
        i += 1;
        continue;
      }
      if (c === 'ー') {
        out += out.slice(-1) === '' ? '' : out.slice(-1);
        i += 1;
        continue;
      }
      if (PUNCT[c] !== undefined) {
        out += PUNCT[c];
        i += 1;
        continue;
      }
      var roma = KANA_ROMAJI[c];
      if (roma === undefined) return null;
      if (next && YOON[next]) {
        var stem = roma.slice(0, -1);
        if (stem === 'sh' || stem === 'ch' || stem === 'j') {
          roma = (stem === 'j' ? 'jy' : stem) + YOON[next];
        } else {
          roma = stem + 'y' + YOON[next];
        }
        i += 2;
      } else {
        i += 1;
      }
      if (roma === 'n' && s[i] && /[あいうえおやゆよ]/.test(s[i])) {
        roma = "n'";
      }
      out += roma;
    }
    return out;
  }

  function lookupWord(word) {
    if (!word) return null;
    return WORDS[word] || null;
  }

  function lookupStem(stem) {
    if (!stem) return null;
    return STEMS[stem] || null;
  }

  function lookupSingle(kanji) {
    if (!kanji) return null;
    return SINGLE[kanji] || null;
  }

  function lookupCounter(num, unit) {
    if (!num || !unit) return null;
    // Check if combined word exists directly
    var direct = WORDS[String(num) + String(unit)];
    if (direct) return direct;

    var uData = COUNTERS[unit];
    if (!uData) return null;

    var n = parseInt(num, 10);
    if (!isNaN(n) && uData.specials && uData.specials[n]) {
      var k = uData.specials[n];
      return { kana: k, romaji: kanaToRomaji(k) };
    }

    return null;
  }

  var FiezelJaDictionary = {
    WORDS: WORDS,
    STEMS: STEMS,
    SINGLE: SINGLE,
    COUNTERS: COUNTERS,
    WORDS_KEYS: WORDS_KEYS,
    lookupWord: lookupWord,
    lookupStem: lookupStem,
    lookupSingle: lookupSingle,
    lookupCounter: lookupCounter,
    kanaToRomaji: kanaToRomaji,
    toHiragana: toHiragana
  };

  root.FiezelJaDictionary = FiezelJaDictionary;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelJaDictionary;
  }
})(typeof self !== 'undefined' ? self : globalThis);
