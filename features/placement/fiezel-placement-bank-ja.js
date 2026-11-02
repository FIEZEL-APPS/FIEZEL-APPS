/**
 * FIEZEL Computerized Adaptive Placement (CAT) — Japanese Question Bank
 * Native Proprietary FIEZEL Asset.
 * 36 items calibrated across 4 CEFR/JLPT Tiers (A1/N5, A2/N4, B1/N3, B2/N2).
 */
(function (root) {
  'use strict';

  var JAPANESE_CAT_ITEMS = [
  {
    "id": "cat-ja-a1-01",
    "tier": "A1",
    "tierIndex": 0,
    "text": "これは　りんご＿。",
    "choices": [
      {
        "label": "です",
        "isCorrect": true
      },
      {
        "label": "ます",
        "isCorrect": false
      },
      {
        "label": "だった",
        "isCorrect": false
      },
      {
        "label": "ある",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "です"
  },
  {
    "id": "cat-ja-a1-02",
    "tier": "A1",
    "tierIndex": 0,
    "text": "わたしの　なまえ＿　たなかです。",
    "choices": [
      {
        "label": "は",
        "isCorrect": true
      },
      {
        "label": "を",
        "isCorrect": false
      },
      {
        "label": "が",
        "isCorrect": false
      },
      {
        "label": "の",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "は"
  },
  {
    "id": "cat-ja-a1-03",
    "tier": "A1",
    "tierIndex": 0,
    "text": "まいにち　みず＿　のみます。",
    "choices": [
      {
        "label": "は",
        "isCorrect": false
      },
      {
        "label": "に",
        "isCorrect": false
      },
      {
        "label": "を",
        "isCorrect": true
      },
      {
        "label": "で",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "を"
  },
  {
    "id": "cat-ja-a1-04",
    "tier": "A1",
    "tierIndex": 0,
    "text": "６じ＿　おきます。",
    "choices": [
      {
        "label": "で",
        "isCorrect": false
      },
      {
        "label": "に",
        "isCorrect": true
      },
      {
        "label": "を",
        "isCorrect": false
      },
      {
        "label": "は",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "に"
  },
  {
    "id": "cat-ja-a1-05",
    "tier": "A1",
    "tierIndex": 0,
    "text": "としょかん＿　べんきょうします。",
    "choices": [
      {
        "label": "に",
        "isCorrect": false
      },
      {
        "label": "で",
        "isCorrect": true
      },
      {
        "label": "を",
        "isCorrect": false
      },
      {
        "label": "へ",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "で"
  },
  {
    "id": "cat-ja-a1-06",
    "tier": "A1",
    "tierIndex": 0,
    "text": "さかなは　すきですが、にくは　たべ＿。",
    "choices": [
      {
        "label": "たい",
        "isCorrect": false
      },
      {
        "label": "ました",
        "isCorrect": false
      },
      {
        "label": "ます",
        "isCorrect": false
      },
      {
        "label": "ません",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ません"
  },
  {
    "id": "cat-ja-a1-07",
    "tier": "A1",
    "tierIndex": 0,
    "text": "きのう　えいがを　み＿。",
    "choices": [
      {
        "label": "ます",
        "isCorrect": false
      },
      {
        "label": "ません",
        "isCorrect": false
      },
      {
        "label": "て",
        "isCorrect": false
      },
      {
        "label": "ました",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ました"
  },
  {
    "id": "cat-ja-a1-08",
    "tier": "A1",
    "tierIndex": 0,
    "text": "これは　わたし＿　ほんです。",
    "choices": [
      {
        "label": "は",
        "isCorrect": false
      },
      {
        "label": "の",
        "isCorrect": true
      },
      {
        "label": "を",
        "isCorrect": false
      },
      {
        "label": "が",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "の"
  },
  {
    "id": "cat-ja-a1-09",
    "tier": "A1",
    "tierIndex": 0,
    "text": "コーヒーを　ください。」「わたし＿　コーヒーを　ください。」",
    "choices": [
      {
        "label": "は",
        "isCorrect": false
      },
      {
        "label": "も",
        "isCorrect": true
      },
      {
        "label": "と",
        "isCorrect": false
      },
      {
        "label": "が",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "も"
  },
  {
    "id": "cat-ja-a1-10",
    "tier": "A1",
    "tierIndex": 0,
    "text": "すみません、まどを　あけ＿　ください。",
    "choices": [
      {
        "label": "た",
        "isCorrect": false
      },
      {
        "label": "て",
        "isCorrect": true
      },
      {
        "label": "ます",
        "isCorrect": false
      },
      {
        "label": "ない",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "て"
  },
  {
    "id": "cat-ja-a1-11",
    "tier": "A1",
    "tierIndex": 0,
    "text": "いま　あめが　ふっ＿。",
    "choices": [
      {
        "label": "ています",
        "isCorrect": true
      },
      {
        "label": "ました",
        "isCorrect": false
      },
      {
        "label": "ます",
        "isCorrect": false
      },
      {
        "label": "てから",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ています"
  },
  {
    "id": "cat-ja-a1-12",
    "tier": "A1",
    "tierIndex": 0,
    "text": "なつやすみに　うみへ　いき＿です。",
    "choices": [
      {
        "label": "ます",
        "isCorrect": false
      },
      {
        "label": "ました",
        "isCorrect": false
      },
      {
        "label": "たくない",
        "isCorrect": false
      },
      {
        "label": "たい",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "たい"
  },
  {
    "id": "cat-ja-a2-01",
    "tier": "A2",
    "tierIndex": 1,
    "text": "でんしゃの　なかで　あしを　ふま＿。",
    "choices": [
      {
        "label": "した",
        "isCorrect": false
      },
      {
        "label": "せた",
        "isCorrect": false
      },
      {
        "label": "れた",
        "isCorrect": true
      },
      {
        "label": "んでいた",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "れた"
  },
  {
    "id": "cat-ja-a2-02",
    "tier": "A2",
    "tierIndex": 1,
    "text": "ははは　こどもに　やさいを　たべ＿。",
    "choices": [
      {
        "label": "られた",
        "isCorrect": false
      },
      {
        "label": "させた",
        "isCorrect": true
      },
      {
        "label": "たがった",
        "isCorrect": false
      },
      {
        "label": "ていた",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "させた"
  },
  {
    "id": "cat-ja-a2-03",
    "tier": "A2",
    "tierIndex": 1,
    "text": "けんこうの　ために、まいにち　はしる＿しています。",
    "choices": [
      {
        "label": "ことに",
        "isCorrect": false
      },
      {
        "label": "ように — ようにする",
        "isCorrect": true
      },
      {
        "label": "ために",
        "isCorrect": false
      },
      {
        "label": "つもりで",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ように — ようにする"
  },
  {
    "id": "cat-ja-a2-04",
    "tier": "A2",
    "tierIndex": 1,
    "text": "にほんごの　ほんを　よむ＿、じしょを　かいました。",
    "choices": [
      {
        "label": "ので",
        "isCorrect": false
      },
      {
        "label": "ために",
        "isCorrect": true
      },
      {
        "label": "のに",
        "isCorrect": false
      },
      {
        "label": "ながら",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ために"
  },
  {
    "id": "cat-ja-a2-05",
    "tier": "A2",
    "tierIndex": 1,
    "text": "たくさん　れんしゅうした＿、しあいに　まけました。",
    "choices": [
      {
        "label": "ので",
        "isCorrect": false
      },
      {
        "label": "から",
        "isCorrect": false
      },
      {
        "label": "ために",
        "isCorrect": false
      },
      {
        "label": "のに",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "のに"
  },
  {
    "id": "cat-ja-a2-06",
    "tier": "A2",
    "tierIndex": 1,
    "text": "ともだちが「あのみせは　おいしい」と　いっていました。あのみせは　おいしい＿です。",
    "choices": [
      {
        "label": "らしい",
        "isCorrect": false
      },
      {
        "label": "そう",
        "isCorrect": true
      },
      {
        "label": "よう",
        "isCorrect": false
      },
      {
        "label": "みたい",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "そう"
  },
  {
    "id": "cat-ja-a2-07",
    "tier": "A2",
    "tierIndex": 1,
    "text": "いま　ちょうど　でかける＿です。",
    "choices": [
      {
        "label": "つもり",
        "isCorrect": false
      },
      {
        "label": "まえ",
        "isCorrect": false
      },
      {
        "label": "ところ",
        "isCorrect": true
      },
      {
        "label": "ため",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ところ"
  },
  {
    "id": "cat-ja-a2-08",
    "tier": "A2",
    "tierIndex": 1,
    "text": "うっかり　ともだちの　コップを　わっ＿。",
    "choices": [
      {
        "label": "た",
        "isCorrect": false
      },
      {
        "label": "てしまった — てしまう",
        "isCorrect": true
      },
      {
        "label": "ている",
        "isCorrect": false
      },
      {
        "label": "たかった",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "てしまった — てしまう"
  },
  {
    "id": "cat-ja-b1-01",
    "tier": "B1",
    "tierIndex": 2,
    "text": "しゃちょうに　まいにち　ざんぎょう＿。",
    "choices": [
      {
        "label": "された",
        "isCorrect": false
      },
      {
        "label": "させた",
        "isCorrect": false
      },
      {
        "label": "させられた",
        "isCorrect": true
      },
      {
        "label": "していた",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "させられた"
  },
  {
    "id": "cat-ja-b1-02",
    "tier": "B1",
    "tierIndex": 2,
    "text": "じゅうぶんな　じゅんびを　した＿、けっかは　よくなかった。",
    "choices": [
      {
        "label": "ので",
        "isCorrect": false
      },
      {
        "label": "ために",
        "isCorrect": false
      },
      {
        "label": "にもかかわらず",
        "isCorrect": true
      },
      {
        "label": "うえで",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "にもかかわらず"
  },
  {
    "id": "cat-ja-b1-03",
    "tier": "B1",
    "tierIndex": 2,
    "text": "あしたは　しけんなので、あそぶ＿。",
    "choices": [
      {
        "label": "わけにはいきません",
        "isCorrect": true
      },
      {
        "label": "ことがない",
        "isCorrect": false
      },
      {
        "label": "はずがない",
        "isCorrect": false
      },
      {
        "label": "ようがない",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "わけにはいきません"
  },
  {
    "id": "cat-ja-b1-04",
    "tier": "B1",
    "tierIndex": 2,
    "text": "らいねん　かいしゃが　とうきょうに　うつる＿。",
    "choices": [
      {
        "label": "ことにしました",
        "isCorrect": false
      },
      {
        "label": "ことになりました",
        "isCorrect": true
      },
      {
        "label": "ようになりました",
        "isCorrect": false
      },
      {
        "label": "ことがありました",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ことになりました"
  },
  {
    "id": "cat-ja-b1-05",
    "tier": "B1",
    "tierIndex": 2,
    "text": "せつめいを　きいた＿、まだ　よく　わかりません。",
    "choices": [
      {
        "label": "ものの",
        "isCorrect": true
      },
      {
        "label": "けど",
        "isCorrect": false
      },
      {
        "label": "ばかりに",
        "isCorrect": false
      },
      {
        "label": "わりに",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ものの"
  },
  {
    "id": "cat-ja-b1-06",
    "tier": "B1",
    "tierIndex": 2,
    "text": "あたたかい＿、たべてください。",
    "choices": [
      {
        "label": "ときに",
        "isCorrect": false
      },
      {
        "label": "うちに",
        "isCorrect": true
      },
      {
        "label": "まえに",
        "isCorrect": false
      },
      {
        "label": "あいだに",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "うちに"
  },
  {
    "id": "cat-ja-b1-07",
    "tier": "B1",
    "tierIndex": 2,
    "text": "この　くすりは　ふくさようが　でる＿。",
    "choices": [
      {
        "label": "おそれがあります",
        "isCorrect": true
      },
      {
        "label": "かもしれません",
        "isCorrect": false
      },
      {
        "label": "はずです",
        "isCorrect": false
      },
      {
        "label": "にちがいありません",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "おそれがあります"
  },
  {
    "id": "cat-ja-b1-08",
    "tier": "B1",
    "tierIndex": 2,
    "text": "せんせいは　もう　この　ほんを　お＿になりましたか。",
    "choices": [
      {
        "label": "よんで",
        "isCorrect": false
      },
      {
        "label": "よみ",
        "isCorrect": true
      },
      {
        "label": "よまれ",
        "isCorrect": false
      },
      {
        "label": "よむ",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "よみ"
  },
  {
    "id": "cat-ja-b2-01",
    "tier": "B2",
    "tierIndex": 3,
    "text": "ほんじつ＿、このみせは　へいてんいたします。",
    "choices": [
      {
        "label": "をもって",
        "isCorrect": true
      },
      {
        "label": "によって",
        "isCorrect": false
      },
      {
        "label": "にとって",
        "isCorrect": false
      },
      {
        "label": "として",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "をもって"
  },
  {
    "id": "cat-ja-b2-02",
    "tier": "B2",
    "tierIndex": 3,
    "text": "これは　にほん＿の　ぶんかです。",
    "choices": [
      {
        "label": "ならでは",
        "isCorrect": true
      },
      {
        "label": "だけ",
        "isCorrect": false
      },
      {
        "label": "しか",
        "isCorrect": false
      },
      {
        "label": "ばかり",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ならでは"
  },
  {
    "id": "cat-ja-b2-03",
    "tier": "B2",
    "tierIndex": 3,
    "text": "かれの　せいこうは　どりょくの　けっか＿。",
    "choices": [
      {
        "label": "にちがいない",
        "isCorrect": false
      },
      {
        "label": "にきまっている",
        "isCorrect": false
      },
      {
        "label": "にすぎない",
        "isCorrect": false
      },
      {
        "label": "にほかならない",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "にほかならない"
  },
  {
    "id": "cat-ja-b2-04",
    "tier": "B2",
    "tierIndex": 3,
    "text": "かんけいしゃ　いがい、たちいる＿。",
    "choices": [
      {
        "label": "わけがない",
        "isCorrect": false
      },
      {
        "label": "ことはない",
        "isCorrect": false
      },
      {
        "label": "な",
        "isCorrect": false
      },
      {
        "label": "べからず",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "べからず"
  },
  {
    "id": "cat-ja-b2-05",
    "tier": "B2",
    "tierIndex": 3,
    "text": "この　えいがを　みると、なか＿。",
    "choices": [
      {
        "label": "ないことはない",
        "isCorrect": false
      },
      {
        "label": "ないわけにはいかない",
        "isCorrect": false
      },
      {
        "label": "なくてはならない",
        "isCorrect": false
      },
      {
        "label": "ずにはいられない",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "ずにはいられない"
  },
  {
    "id": "cat-ja-b2-06",
    "tier": "B2",
    "tierIndex": 3,
    "text": "いちにち＿むだにしたくない。",
    "choices": [
      {
        "label": "たりとも",
        "isCorrect": true
      },
      {
        "label": "でも",
        "isCorrect": false
      },
      {
        "label": "だけは",
        "isCorrect": false
      },
      {
        "label": "ほども",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "たりとも"
  },
  {
    "id": "cat-ja-b2-07",
    "tier": "B2",
    "tierIndex": 3,
    "text": "それは　いしゃに＿こういだ。",
    "choices": [
      {
        "label": "ありえない",
        "isCorrect": false
      },
      {
        "label": "あるはずのない",
        "isCorrect": false
      },
      {
        "label": "あるまじき",
        "isCorrect": true
      },
      {
        "label": "あってはならない",
        "isCorrect": false
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "あるまじき"
  },
  {
    "id": "cat-ja-b2-08",
    "tier": "B2",
    "tierIndex": 3,
    "text": "ゆめを　かなえ＿、かれは　くにを　でた。",
    "choices": [
      {
        "label": "たくて",
        "isCorrect": false
      },
      {
        "label": "ようと",
        "isCorrect": false
      },
      {
        "label": "るために",
        "isCorrect": false
      },
      {
        "label": "んがために",
        "isCorrect": true
      },
      {
        "label": "🤷🏽 (わからない)",
        "isCorrect": false
      }
    ],
    "correctAnswer": "んがために"
  }
];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JAPANESE_CAT_ITEMS: JAPANESE_CAT_ITEMS };
  }
  if (typeof root !== 'undefined') {
    root.FiezelPlacementBankJa = {
      getItems: function () { return JAPANESE_CAT_ITEMS; },
      getItemsByTier: function (tier) {
        return JAPANESE_CAT_ITEMS.filter(function (it) { return it.tier === tier; });
      }
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
