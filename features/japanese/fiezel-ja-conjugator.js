/**
 * FIEZEL · features/japanese/fiezel-ja-conjugator.js
 *
 * Pure-JS Japanese Morphological Conjugator, Reverse-Deconjugator, Misconception
 * Distractor Factory, & Bunsetsu Sentence-Order Validator.
 *
 * Open-source algorithmic foundations (MIT / ISC, zero external bloat):
 *  - Forward verb/adjective inflection & auxiliary chaining adapted from `kamiya-codec`
 *    (Taeko Kamiya's Handbook of Japanese Verbs).
 *  - Recursive reverse-deconjugation & derivation path constraints adapted from
 *    `mistval/jp-verb-deconjugator`, ranked against `FiezelJaDictionary.WORDS` instead
 *    of bundling a 979 KB static frequency JSON.
 *  - Bunsetsu postpositional phrase Equivalence Validator for Japanese SOV free-adjunct
 *    word order (`validateJapaneseSentenceOrder`).
 *
 * All emitted `misconception` IDs strictly satisfy `FiezelMisconceptionLedger.ID_RE`
 * (`/^[A-Za-z0-9._:@#-]{1,80}$/`) so Braincore BKT + Misconception Ledger receive
 * real diagnostic signals without silent drops.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FiezelJaConjugator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (root) {
  'use strict';

  var HAS_JA_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

  var Conjugation = Object.freeze({
    Negative: 'Negative',
    Conjunctive: 'Conjunctive',
    Dictionary: 'Dictionary',
    Conditional: 'Conditional',
    Imperative: 'Imperative',
    Volitional: 'Volitional',
    Te: 'Te',
    Ta: 'Ta',
    Tara: 'Tara',
    Tari: 'Tari',
    Zu: 'Zu'
  });

  var Auxiliary = Object.freeze({
    Potential: 'Potential',
    Masu: 'Masu',
    Nai: 'Nai',
    Tai: 'Tai',
    Tagaru: 'Tagaru',
    Hoshii: 'Hoshii',
    Rashii: 'Rashii',
    SoudaHearsay: 'SoudaHearsay',
    SoudaConjecture: 'SoudaConjecture',
    SeruSaseru: 'SeruSaseru',
    ShortenedCausative: 'ShortenedCausative',
    ReruRareru: 'ReruRareru',
    CausativePassive: 'CausativePassive',
    ShortenedCausativePassive: 'ShortenedCausativePassive',
    Ageru: 'Ageru',
    Sashiageru: 'Sashiageru',
    Yaru: 'Yaru',
    Morau: 'Morau',
    Itadaku: 'Itadaku',
    Kureru: 'Kureru',
    Kudasaru: 'Kudasaru',
    TeIru: 'TeIru',
    TeAru: 'TeAru',
    TeMiru: 'TeMiru',
    TeIku: 'TeIku',
    TeKuru: 'TeKuru',
    TeOku: 'TeOku',
    TeShimau: 'TeShimau',
    Chau: 'Chau',
    TeSumimasen: 'TeSumimasen'
  });

  var VerbType = Object.freeze({
    Godan: 'Godan',
    Ichidan: 'Ichidan',
    Irregular: 'Irregular'
  });

  var GODAN_ROWS = {
    'う': { Negative: 'わ', Conjunctive: 'い', Dictionary: 'う', Conditional: 'え', Imperative: 'え', Volitional: 'おう', Te: 'って', Ta: 'った', Tara: 'ったら', Tari: 'ったり', Zu: 'わず' },
    'く': { Negative: 'か', Conjunctive: 'き', Dictionary: 'く', Conditional: 'け', Imperative: 'け', Volitional: 'こう', Te: 'いて', Ta: 'いた', Tara: 'いたら', Tari: 'いたり', Zu: 'かず' },
    'ぐ': { Negative: 'が', Conjunctive: 'ぎ', Dictionary: 'ぐ', Conditional: 'げ', Imperative: 'げ', Volitional: 'ごう', Te: 'いで', Ta: 'いだ', Tara: 'いだら', Tari: 'いだり', Zu: 'がず' },
    'す': { Negative: 'さ', Conjunctive: 'し', Dictionary: 'す', Conditional: 'せ', Imperative: 'せ', Volitional: 'そう', Te: 'して', Ta: 'した', Tara: 'したら', Tari: 'したり', Zu: 'さず' },
    'つ': { Negative: 'た', Conjunctive: 'ち', Dictionary: 'つ', Conditional: 'て', Imperative: 'て', Volitional: 'とう', Te: 'って', Ta: 'った', Tara: 'ったら', Tari: 'ったり', Zu: 'たず' },
    'ぬ': { Negative: 'な', Conjunctive: 'に', Dictionary: 'ぬ', Conditional: 'ね', Imperative: 'ね', Volitional: 'のう', Te: 'んで', Ta: 'んだ', Tara: 'んだら', Tari: 'んだり', Zu: 'なず' },
    'ぶ': { Negative: 'ば', Conjunctive: 'び', Dictionary: 'ぶ', Conditional: 'べ', Imperative: 'べ', Volitional: 'ぼう', Te: 'んで', Ta: 'んだ', Tara: 'んだら', Tari: 'んだり', Zu: 'ばず' },
    'む': { Negative: 'ま', Conjunctive: 'み', Dictionary: 'む', Conditional: 'め', Imperative: 'め', Volitional: 'もう', Te: 'んで', Ta: 'んだ', Tara: 'んだら', Tari: 'んだり', Zu: 'まず' },
    'る': { Negative: 'ら', Conjunctive: 'り', Dictionary: 'る', Conditional: 'れ', Imperative: 'れ', Volitional: 'ろう', Te: 'って', Ta: 'った', Tara: 'ったら', Tari: 'ったり', Zu: 'らず' }
  };

  // Common Godan -ru verbs (exception to -eru/-iru looking like Ichidan)
  var GODAN_RU_EXCEPTIONS = {
    '帰る': true, 'かえる': true, '走る': true, 'はしる': true, '入る': true, 'はいる': true,
    '切る': true, 'きる': true, '知る': true, 'しる': true, '要る': true, 'いる': false,
    'しゃべる': true, '喋る': true, '減る': true, 'へる': true, '滑る': true, 'すべる': true,
    '蹴る': true, 'ける': true, '焦る': true, 'あせる': true, '限る': true, 'かぎる': true,
    '握る': true, 'にぎる': true, '参る': true, 'まいる': true, '交じる': true, '混じる': true
  };

  // Core N5-N3 lemma baseline so reverse-deconjugation remains deterministic even when FiezelJaDictionary is unloaded
  var CORE_LEMMAS = {
    '食べる': 'ichidan', 'たべる': 'ichidan', '見る': 'ichidan', 'みる': 'ichidan',
    '寝る': 'ichidan', 'ねる': 'ichidan', '起きる': 'ichidan', 'おきる': 'ichidan',
    '教える': 'ichidan', 'おしえる': 'ichidan', '覚える': 'ichidan', 'おぼえる': 'ichidan',
    '忘れる': 'ichidan', 'わすれる': 'ichidan', '開ける': 'ichidan', 'あける': 'ichidan',
    '閉める': 'ichidan', 'しめる': 'ichidan', '出る': 'ichidan', 'でる': 'ichidan',
    '借りる': 'ichidan', 'かりる': 'ichidan', '浴びる': 'ichidan', 'あびる': 'ichidan',
    '着る': 'ichidan', 'できる': 'ichidan', '出来る': 'ichidan', 'いる': 'ichidan',
    '考える': 'ichidan', 'かんがえる': 'ichidan', '答える': 'ichidan', 'こたえる': 'ichidan',
    '調べる': 'ichidan', 'しらべる': 'ichidan', '続ける': 'ichidan', 'つづける': 'ichidan',
    '集める': 'ichidan', 'あつめる': 'ichidan', '始める': 'ichidan', 'はじめる': 'ichidan',
    '行く': 'godan', 'いく': 'godan', '書く': 'godan', 'かく': 'godan',
    '聞く': 'godan', 'きく': 'godan', '歩く': 'godan', 'あるく': 'godan',
    '働く': 'godan', 'はたらく': 'godan', '開く': 'godan', 'あく': 'godan',
    '泳ぐ': 'godan', 'およぐ': 'godan', '急ぐ': 'godan', 'いそぐ': 'godan',
    '話す': 'godan', 'はなす': 'godan', '出す': 'godan', 'だす': 'godan',
    '貸す': 'godan', 'かす': 'godan', '待つ': 'godan', 'まつ': 'godan',
    '持つ': 'godan', 'もつ': 'godan', '立つ': 'godan', 'たつ': 'godan',
    '死ぬ': 'godan', 'しぬ': 'godan', '遊ぶ': 'godan', 'あそぶ': 'godan',
    '呼ぶ': 'godan', 'よぶ': 'godan', '飛ぶ': 'godan', 'とぶ': 'godan',
    '読む': 'godan', 'よむ': 'godan', '飲む': 'godan', 'のむ': 'godan',
    '休む': 'godan', 'やすむ': 'godan', '住む': 'godan', 'すむ': 'godan',
    '買う': 'godan', 'かう': 'godan', '会う': 'godan', 'あう': 'godan',
    '言う': 'godan', 'いう': 'godan', '使う': 'godan', 'つかう': 'godan',
    '洗う': 'godan', 'あらう': 'godan', '歌う': 'godan', 'うたう': 'godan',
    '思う': 'godan', 'おもう': 'godan', '習う': 'godan', 'ならう': 'godan',
    '帰る': 'godan', 'かえる': 'godan', '走る': 'godan', 'はしる': 'godan',
    '入る': 'godan', 'はいる': 'godan', '切る': 'godan', 'きる': 'godan',
    '知る': 'godan', 'しる': 'godan', '作る': 'godan', 'つくる': 'godan',
    '乗る': 'godan', 'のる': 'godan', '撮る': 'godan', 'とる': 'godan',
    '取る': 'godan', '売る': 'godan', 'うる': 'godan', '終わる': 'godan', 'おわる': 'godan',
    '始まる': 'godan', 'はじまる': 'godan', 'わかる': 'godan', '分かる': 'godan',
    'ある': 'godan', 'なる': 'godan', 'やる': 'godan', 'しゃべる': 'godan',
    'する': 'irregular', '来る': 'irregular', 'くる': 'irregular',
    '勉強する': 'irregular', '練習する': 'irregular', '散歩する': 'irregular', '料理する': 'irregular',
    '高い': 'iadj', 'たかい': 'iadj', '安い': 'iadj', 'やすい': 'iadj',
    '大きい': 'iadj', 'おおきい': 'iadj', '小さい': 'iadj', 'ちいさい': 'iadj',
    '新しい': 'iadj', 'あたらしい': 'iadj', '古い': 'iadj', 'ふるい': 'iadj',
    '良い': 'iadj', 'いい': 'iadj', 'よい': 'iadj', '悪い': 'iadj', 'わるい': 'iadj',
    '暑い': 'iadj', 'あつい': 'iadj', '寒い': 'iadj', 'さむい': 'iadj',
    '難しい': 'iadj', 'むずかしい': 'iadj', '易しい': 'iadj', 'やさしい': 'iadj',
    'おいしい': 'iadj', '美味しい': 'iadj', '楽しい': 'iadj', 'たのしい': 'iadj',
    '忙しい': 'iadj', 'いそがしい': 'iadj', '美しい': 'iadj', 'うつくしい': 'iadj'
  };

  function isIkuException(verb) {
    return verb === '行く' || verb === 'いく' || verb === 'ゆく' ||
      (verb.length > 2 && (verb.slice(-2) === '行く' || verb.slice(-3) === 'ていく' || verb.slice(-3) === 'でいく'));
  }

  function isSuruVerb(verb) {
    return verb === 'する' || (verb.length > 2 && verb.slice(-2) === 'する');
  }

  function isKuruVerb(verb) {
    return verb === '来る' || verb === 'くる' || (verb.length > 2 && (verb.slice(-2) === '来る' || verb.slice(-2) === 'くる'));
  }

  function inferTypeII(verb, explicitTypeII) {
    if (typeof explicitTypeII === 'boolean') return explicitTypeII;
    if (explicitTypeII === VerbType.Ichidan) return true;
    if (explicitTypeII === VerbType.Godan || explicitTypeII === VerbType.Irregular) return false;
    if (CORE_LEMMAS[verb] === 'ichidan') return true;
    if (CORE_LEMMAS[verb] === 'godan' || GODAN_RU_EXCEPTIONS[verb]) return false;
    if (verb.slice(-1) !== 'る') return false;
    var prev = verb.charAt(verb.length - 2);
    // Approximate e/i-dan kana check when caller omits typeII
    return /[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]/.test(prev);
  }

  /**
   * Conjugate a Japanese verb into a primary base form (`Conjugation`).
   * Returns an array of valid surface forms (first element is canonical).
   */
  function conjugate(verb, conj, typeII) {
    verb = String(verb || '').trim();
    if (!verb) return [];
    conj = conj || Conjugation.Dictionary;
    if (conj === Conjugation.Dictionary) return [verb];

    // 1. Irregular: する / Noun+する
    if (isSuruVerb(verb)) {
      var sPre = verb.slice(0, -2);
      switch (conj) {
        case Conjugation.Negative: return [sPre + 'し', sPre + 'せ'];
        case Conjugation.Conjunctive: return [sPre + 'し'];
        case Conjugation.Conditional: return [sPre + 'すれ'];
        case Conjugation.Imperative: return [sPre + 'しろ', sPre + 'せよ'];
        case Conjugation.Volitional: return [sPre + 'しよう'];
        case Conjugation.Te: return [sPre + 'して'];
        case Conjugation.Ta: return [sPre + 'した'];
        case Conjugation.Tara: return [sPre + 'したら'];
        case Conjugation.Tari: return [sPre + 'したり'];
        case Conjugation.Zu: return [sPre + 'せず'];
        default: return [verb];
      }
    }

    // 2. Irregular: 来る / くる
    if (isKuruVerb(verb)) {
      var isKanjiKuru = verb.slice(-2) === '来る';
      var kPre = verb.slice(0, -2);
      if (isKanjiKuru) {
        switch (conj) {
          case Conjugation.Negative: return [kPre + '来'];
          case Conjugation.Conjunctive: return [kPre + '来'];
          case Conjugation.Conditional: return [kPre + '来れ'];
          case Conjugation.Imperative: return [kPre + '来い'];
          case Conjugation.Volitional: return [kPre + '来よう'];
          case Conjugation.Te: return [kPre + '来て'];
          case Conjugation.Ta: return [kPre + '来た'];
          case Conjugation.Tara: return [kPre + '来たら'];
          case Conjugation.Tari: return [kPre + '来たり'];
          case Conjugation.Zu: return [kPre + '来ず'];
          default: return [verb];
        }
      } else {
        switch (conj) {
          case Conjugation.Negative: return [kPre + 'こ'];
          case Conjugation.Conjunctive: return [kPre + 'き'];
          case Conjugation.Conditional: return [kPre + 'くれ'];
          case Conjugation.Imperative: return [kPre + 'こい'];
          case Conjugation.Volitional: return [kPre + 'こよう'];
          case Conjugation.Te: return [kPre + 'きて'];
          case Conjugation.Ta: return [kPre + 'きた'];
          case Conjugation.Tara: return [kPre + 'きたら'];
          case Conjugation.Tari: return [kPre + 'きたり'];
          case Conjugation.Zu: return [kPre + 'こず'];
          default: return [verb];
        }
      }
    }

    // 3. Special Godan: ある negative -> ない (handled in Nai auxiliary, stem here is あら)
    // 4. Ichidan (Type II)
    var isIchidan = inferTypeII(verb, typeII);
    if (isIchidan && verb.slice(-1) === 'る') {
      var stem = verb.slice(0, -1);
      switch (conj) {
        case Conjugation.Negative: return [stem];
        case Conjugation.Conjunctive: return [stem];
        case Conjugation.Conditional: return [stem + 'れ'];
        case Conjugation.Imperative: return [stem + 'ろ', stem + 'よ'];
        case Conjugation.Volitional: return [stem + 'よう'];
        case Conjugation.Te: return [stem + 'て'];
        case Conjugation.Ta: return [stem + 'た'];
        case Conjugation.Tara: return [stem + 'たら'];
        case Conjugation.Tari: return [stem + 'たり'];
        case Conjugation.Zu: return [stem + 'ず'];
        default: return [verb];
      }
    }

    // 5. Godan (Type I)
    var last = verb.slice(-1);
    var row = GODAN_ROWS[last];
    if (!row) return [verb];
    var gStem = verb.slice(0, -1);

    // 行く / いく irregular te/ta/tara/tari
    if (isIkuException(verb)) {
      if (conj === Conjugation.Te) return [gStem + 'って'];
      if (conj === Conjugation.Ta) return [gStem + 'った'];
      if (conj === Conjugation.Tara) return [gStem + 'ったら'];
      if (conj === Conjugation.Tari) return [gStem + 'ったり'];
    }
    // 問う / 乞う or くださる/いらっしゃる
    if ((verb === 'くださる' || verb === 'いらっしゃる' || verb === 'おっしゃる' || verb === 'ござる') && conj === Conjugation.Conjunctive) {
      return [gStem + 'い'];
    }

    var ending = row[conj];
    return ending !== undefined ? [gStem + ending] : [verb];
  }

  /**
   * Conjugate an i-adjective or na-adjective.
   */
  function adjConjugate(adjective, iAdj, conj) {
    var adj = String(adjective || '').trim();
    if (!adj) return [];
    if (iAdj !== false) {
      var isIi = adj === 'いい' || adj === 'よい' || adj === '良い';
      var base = isIi ? (adj === '良い' ? '良' : 'よ') : adj.slice(0, -1);
      switch (conj) {
        case Conjugation.Dictionary: return [adj];
        case Conjugation.Negative: return [base + 'くない'];
        case Conjugation.Conjunctive: return [base + 'く'];
        case Conjugation.Te: return [base + 'くて'];
        case Conjugation.Ta: return [base + 'かった'];
        case Conjugation.Tara: return [base + 'かったら'];
        case Conjugation.Conditional: return [base + 'ければ'];
        default: return [adj];
      }
    }
    var cleanNa = adj.slice(-1) === 'な' ? adj.slice(0, -1) : adj;
    switch (conj) {
      case Conjugation.Dictionary: return [cleanNa + 'だ'];
      case Conjugation.Negative: return [cleanNa + 'ではない', cleanNa + 'じゃない'];
      case Conjugation.Conjunctive: return [cleanNa + 'に'];
      case Conjugation.Te: return [cleanNa + 'で'];
      case Conjugation.Ta: return [cleanNa + 'だった'];
      case Conjugation.Tara: return [cleanNa + 'だったら'];
      case Conjugation.Conditional: return [cleanNa + 'なら'];
      default: return [cleanNa];
    }
  }

  function conjugateMasu(stem, finalConj) {
    switch (finalConj) {
      case Conjugation.Dictionary: return [stem + 'ます'];
      case Conjugation.Negative: return [stem + 'ません'];
      case Conjugation.Ta: return [stem + 'ました'];
      case Conjugation.Te: return [stem + 'まして'];
      case Conjugation.Volitional: return [stem + 'ましょう'];
      case Conjugation.Imperative: return [stem + 'ませ'];
      default: return [stem + 'ます'];
    }
  }

  /**
   * Chain one or more Japanese auxiliaries (`Masu`, `Nai`, `Tai`, `Potential`,
   * `TeIru`, `SeruSaseru`, `ReruRareru`, `CausativePassive`, etc.) and apply `finalConj`.
   */
  function conjugateAuxiliaries(verb, auxs, finalConj, typeII) {
    var list = Array.isArray(auxs) ? auxs.slice() : [];
    finalConj = finalConj || Conjugation.Dictionary;
    if (list.length === 0) return conjugate(verb, finalConj, typeII);

    var currentForms = [{ word: verb, kind: 'verb', isIchidan: inferTypeII(verb, typeII) }];

    for (var idx = 0; idx < list.length; idx++) {
      var aux = list[idx];
      var isLast = idx === list.length - 1;
      var nextForms = [];

      for (var f = 0; f < currentForms.length; f++) {
        var cur = currentForms[f];
        if (aux === Auxiliary.Masu) {
          var mStems = conjugate(cur.word, Conjugation.Conjunctive, cur.isIchidan);
          if (isLast) {
            for (var ms = 0; ms < mStems.length; ms++) {
              var outM = conjugateMasu(mStems[ms], finalConj);
              for (var k = 0; k < outM.length; k++) nextForms.push({ word: outM[k], kind: 'terminal', isIchidan: false });
            }
          } else {
            nextForms.push({ word: mStems[0] + 'ます', kind: 'terminal', isIchidan: false });
          }
        } else if (aux === Auxiliary.Nai) {
          var naiWord;
          if (cur.word === 'ある') {
            naiWord = 'ない';
          } else {
            var nStems = conjugate(cur.word, Conjugation.Negative, cur.isIchidan);
            naiWord = nStems[0] + 'ない';
          }
          nextForms.push({ word: naiWord, kind: 'iadj', isIchidan: false });
        } else if (aux === Auxiliary.Tai) {
          var tStems = conjugate(cur.word, Conjugation.Conjunctive, cur.isIchidan);
          nextForms.push({ word: tStems[0] + 'たい', kind: 'iadj', isIchidan: false });
        } else if (aux === Auxiliary.Tagaru) {
          var tgStems = conjugate(cur.word, Conjugation.Conjunctive, cur.isIchidan);
          nextForms.push({ word: tgStems[0] + 'たがる', kind: 'verb', isIchidan: false });
        } else if (aux === Auxiliary.Potential) {
          if (isSuruVerb(cur.word)) {
            nextForms.push({ word: cur.word.slice(0, -2) + 'できる', kind: 'verb', isIchidan: true });
          } else if (isKuruVerb(cur.word)) {
            var kp = cur.word.slice(0, -2);
            nextForms.push({ word: kp + (cur.word.slice(-2) === '来る' ? '来られる' : 'こられる'), kind: 'verb', isIchidan: true });
          } else if (cur.isIchidan) {
            nextForms.push({ word: cur.word.slice(0, -1) + 'られる', kind: 'verb', isIchidan: true });
          } else {
            var cond = conjugate(cur.word, Conjugation.Conditional, false)[0];
            nextForms.push({ word: cond + 'る', kind: 'verb', isIchidan: true });
          }
        } else if (aux === Auxiliary.ReruRareru) {
          if (isSuruVerb(cur.word)) {
            nextForms.push({ word: cur.word.slice(0, -2) + 'される', kind: 'verb', isIchidan: true });
          } else if (isKuruVerb(cur.word)) {
            var rp = cur.word.slice(0, -2);
            nextForms.push({ word: rp + (cur.word.slice(-2) === '来る' ? '来られる' : 'こられる'), kind: 'verb', isIchidan: true });
          } else if (cur.isIchidan) {
            nextForms.push({ word: cur.word.slice(0, -1) + 'られる', kind: 'verb', isIchidan: true });
          } else {
            var negP = conjugate(cur.word, Conjugation.Negative, false)[0];
            nextForms.push({ word: negP + 'れる', kind: 'verb', isIchidan: true });
          }
        } else if (aux === Auxiliary.SeruSaseru) {
          if (isSuruVerb(cur.word)) {
            nextForms.push({ word: cur.word.slice(0, -2) + 'させる', kind: 'verb', isIchidan: true });
          } else if (isKuruVerb(cur.word)) {
            var cp = cur.word.slice(0, -2);
            nextForms.push({ word: cp + (cur.word.slice(-2) === '来る' ? '来させる' : 'こさせる'), kind: 'verb', isIchidan: true });
          } else if (cur.isIchidan) {
            nextForms.push({ word: cur.word.slice(0, -1) + 'させる', kind: 'verb', isIchidan: true });
          } else {
            var negC = conjugate(cur.word, Conjugation.Negative, false)[0];
            nextForms.push({ word: negC + 'せる', kind: 'verb', isIchidan: true });
          }
        } else if (aux === Auxiliary.CausativePassive) {
          if (isSuruVerb(cur.word)) {
            nextForms.push({ word: cur.word.slice(0, -2) + 'させられる', kind: 'verb', isIchidan: true });
          } else if (isKuruVerb(cur.word)) {
            var cpp = cur.word.slice(0, -2);
            nextForms.push({ word: cpp + (cur.word.slice(-2) === '来る' ? '来させられる' : 'こさせられる'), kind: 'verb', isIchidan: true });
          } else if (cur.isIchidan) {
            nextForms.push({ word: cur.word.slice(0, -1) + 'させられる', kind: 'verb', isIchidan: true });
          } else if (cur.word.slice(-1) === 'す') {
            nextForms.push({ word: cur.word.slice(0, -1) + 'させられる', kind: 'verb', isIchidan: true });
          } else {
            var negCP = conjugate(cur.word, Conjugation.Negative, false)[0];
            nextForms.push({ word: negCP + 'せられる', kind: 'verb', isIchidan: true });
            nextForms.push({ word: negCP + 'される', kind: 'verb', isIchidan: true });
          }
        } else if (
          aux === Auxiliary.TeIru || aux === Auxiliary.TeAru || aux === Auxiliary.TeMiru ||
          aux === Auxiliary.TeIku || aux === Auxiliary.TeKuru || aux === Auxiliary.TeOku ||
          aux === Auxiliary.TeShimau || aux === Auxiliary.Ageru || aux === Auxiliary.Morau ||
          aux === Auxiliary.Kureru || aux === Auxiliary.Itadaku || aux === Auxiliary.Kudasaru
        ) {
          var teBase = conjugate(cur.word, Conjugation.Te, cur.isIchidan)[0];
          var tailMap = {
            TeIru: { s: 'いる', ichi: true },
            TeAru: { s: 'ある', ichi: false },
            TeMiru: { s: 'みる', ichi: true },
            TeIku: { s: 'いく', ichi: false },
            TeKuru: { s: 'くる', ichi: false },
            TeOku: { s: 'おく', ichi: false },
            TeShimau: { s: 'しまう', ichi: false },
            Ageru: { s: 'あげる', ichi: true },
            Morau: { s: 'もらう', ichi: false },
            Kureru: { s: 'くれる', ichi: true },
            Itadaku: { s: 'いただく', ichi: false },
            Kudasaru: { s: 'くださる', ichi: false }
          };
          var spec = tailMap[aux];
          nextForms.push({ word: teBase + spec.s, kind: 'verb', isIchidan: spec.ichi });
        } else if (aux === Auxiliary.Chau) {
          var teC = conjugate(cur.word, Conjugation.Te, cur.isIchidan)[0];
          var isDe = teC.slice(-1) === 'で';
          nextForms.push({ word: teC.slice(0, -1) + (isDe ? 'じゃう' : 'ちゃう'), kind: 'verb', isIchidan: false });
        } else {
          nextForms.push(cur);
        }
      }
      currentForms = nextForms;
    }

    var results = [];
    for (var r = 0; r < currentForms.length; r++) {
      var item = currentForms[r];
      var outs;
      if (item.kind === 'terminal') {
        outs = [item.word];
      } else if (item.kind === 'iadj') {
        outs = adjConjugate(item.word, true, finalConj);
      } else {
        outs = conjugate(item.word, finalConj, item.isIchidan);
      }
      for (var o = 0; o < outs.length; o++) {
        if (results.indexOf(outs[o]) === -1) results.push(outs[o]);
      }
    }
    return results;
  }

  /**
   * Generate a canonical answer + misconception-labeled distractors for a Japanese verb drill.
   * Every `misconception` strictly matches `FiezelMisconceptionLedger.ID_RE`.
   */
  function buildVerbExerciseSpec(lemma, verbType, targetForm, targetAuxs) {
    var isIchidan = verbType === 'Ichidan' || verbType === true;
    var auxs = Array.isArray(targetAuxs) ? targetAuxs : [];
    var conj = targetForm || Conjugation.Dictionary;
    var correctList = auxs.length
      ? conjugateAuxiliaries(lemma, auxs, conj, isIchidan)
      : conjugate(lemma, conj, isIchidan);
    var correct = correctList[0] || lemma;
    var distractors = [];
    var seen = {};
    seen[correct] = true;

    function pushDis(text, misconceptionId) {
      if (!text || seen[text]) return;
      seen[text] = true;
      distractors.push({ text: text, misconception: misconceptionId });
    }

    // 1. Ichidan <-> Godan class confusion
    if (isIchidan && lemma.slice(-1) === 'る') {
      var fakeGodan = auxs.length
        ? conjugateAuxiliaries(lemma, auxs, conj, false)[0]
        : conjugate(lemma, conj, false)[0];
      pushDis(fakeGodan, 'ja-ichidan-conjugated-as-godan');
    } else if (!isIchidan && lemma.slice(-1) === 'る' && !isSuruVerb(lemma) && !isKuruVerb(lemma)) {
      var fakeIchidan = auxs.length
        ? conjugateAuxiliaries(lemma, auxs, conj, true)[0]
        : conjugate(lemma, conj, true)[0];
      pushDis(fakeIchidan, 'ja-godan-ru-conjugated-as-ichidan');
    }

    // 2. 行く te/ta euphony exception (*行いて / *行いた)
    if (isIkuException(lemma) && (conj === Conjugation.Te || conj === Conjugation.Ta || auxs.indexOf(Auxiliary.TeIru) !== -1)) {
      var stemIku = lemma.slice(0, -1);
      if (conj === Conjugation.Te) pushDis(stemIku + 'いて', 'ja-iku-kiku-te-exception');
      if (conj === Conjugation.Ta) pushDis(stemIku + 'いた', 'ja-iku-kiku-te-exception');
      if (auxs.indexOf(Auxiliary.TeIru) !== -1) pushDis(stemIku + 'いている', 'ja-iku-kiku-te-exception');
    }

    // 3. Godan te/ta euphony confusion (-む/-ぶ/-ぬ -> *って, -く -> *って, -う/-つ/-る -> *いて)
    if (!isIchidan && !isSuruVerb(lemma) && !isKuruVerb(lemma) && (conj === Conjugation.Te || conj === Conjugation.Ta)) {
      var gBase = lemma.slice(0, -1);
      var suf = conj === Conjugation.Te ? 'て' : 'た';
      var voicedSuf = conj === Conjugation.Te ? 'で' : 'だ';
      var lastCh = lemma.slice(-1);
      if (/[むぶぬ]/.test(lastCh)) {
        pushDis(gBase + 'っ' + suf, 'ja-godan-te-euphony-confusion');
      } else if (lastCh === 'く' && !isIkuException(lemma)) {
        pushDis(gBase + 'っ' + suf, 'ja-godan-te-euphony-confusion');
      } else if (/[うつる]/.test(lastCh)) {
        pushDis(gBase + 'い' + suf, 'ja-godan-te-euphony-confusion');
        pushDis(gBase + 'ん' + voicedSuf, 'ja-godan-te-euphony-confusion');
      }
    }

    // 4. Tense / Polarity / Te-vs-Ta contrast distractors
    if (conj === Conjugation.Ta) {
      var nonPast = auxs.length
        ? conjugateAuxiliaries(lemma, auxs, Conjugation.Dictionary, isIchidan)[0]
        : lemma;
      pushDis(nonPast, 'ja-tense-past-nonpast-mismatch');
      var teForm = auxs.length
        ? conjugateAuxiliaries(lemma, auxs, Conjugation.Te, isIchidan)[0]
        : conjugate(lemma, Conjugation.Te, isIchidan)[0];
      pushDis(teForm, 'ja-te-vs-ta-form-confusion');
    } else if (conj === Conjugation.Te) {
      var taForm = auxs.length
        ? conjugateAuxiliaries(lemma, auxs, Conjugation.Ta, isIchidan)[0]
        : conjugate(lemma, Conjugation.Ta, isIchidan)[0];
      pushDis(taForm, 'ja-te-vs-ta-form-confusion');
    } else if (conj === Conjugation.Negative || auxs.indexOf(Auxiliary.Nai) !== -1) {
      var affirm = conjugate(lemma, Conjugation.Dictionary, isIchidan)[0];
      pushDis(affirm, 'ja-polarity-affirmative-negative-mismatch');
    }

    return {
      lemma: lemma,
      correct: correct,
      alternates: correctList.slice(1),
      distractors: distractors
    };
  }

  /* ============================================================================
   * 2. LIGHTWEIGHT REVERSE DECONJUGATOR (`jp-verb-deconjugator` port)
   * ============================================================================ */

  var REVERSE_RULES = [
    // Outer polite & aspectual layers -> intermediate stems
    { from: 'ませんでした', to: '', tag: 'polite_negative_past', next: 'masu_stem' },
    { from: 'ません', to: '', tag: 'polite_negative', next: 'masu_stem' },
    { from: 'ました', to: '', tag: 'polite_past', next: 'masu_stem' },
    { from: 'ましょう', to: '', tag: 'polite_volitional', next: 'masu_stem' },
    { from: 'ます', to: '', tag: 'polite_nonpast', next: 'masu_stem' },

    { from: 'ていました', to: 'て', tag: 'progressive_polite_past', next: 'te_form' },
    { from: 'ていません', to: 'て', tag: 'progressive_polite_negative', next: 'te_form' },
    { from: 'ています', to: 'て', tag: 'progressive_polite', next: 'te_form' },
    { from: 'ていた', to: 'て', tag: 'progressive_past', next: 'te_form' },
    { from: 'ていない', to: 'て', tag: 'progressive_negative', next: 'te_form' },
    { from: 'ている', to: 'て', tag: 'progressive', next: 'te_form' },
    { from: 'てる', to: 'て', tag: 'progressive_short', next: 'te_form' },
    { from: 'でいました', to: 'で', tag: 'progressive_polite_past', next: 'te_form' },
    { from: 'でいません', to: 'で', tag: 'progressive_polite_negative', next: 'te_form' },
    { from: 'でいます', to: 'で', tag: 'progressive_polite', next: 'te_form' },
    { from: 'でいた', to: 'で', tag: 'progressive_past', next: 'te_form' },
    { from: 'でいない', to: 'で', tag: 'progressive_negative', next: 'te_form' },
    { from: 'でいる', to: 'で', tag: 'progressive', next: 'te_form' },
    { from: 'でる', to: 'で', tag: 'progressive_short', next: 'te_form' },
    { from: 'てください', to: 'て', tag: 'polite_request', next: 'te_form' },
    { from: 'でください', to: 'で', tag: 'polite_request', next: 'te_form' },

    // Desiderative -tai
    { from: 'たくなかった', to: '', tag: 'tai_negative_past', next: 'masu_stem' },
    { from: 'たくない', to: '', tag: 'tai_negative', next: 'masu_stem' },
    { from: 'たかった', to: '', tag: 'tai_past', next: 'masu_stem' },
    { from: 'たい', to: '', tag: 'tai', next: 'masu_stem' },

    // Plain negative past & naide
    { from: 'なかった', to: 'ない', tag: 'plain_negative_past', next: 'nai_form' },
    { from: 'ないで', to: 'ない', tag: 'naide', next: 'nai_form' },
    { from: 'なければ', to: 'ない', tag: 'negative_conditional', next: 'nai_form' },

    // Irregular する / 来る
    { from: 'しない', to: 'する', tag: 'negative', next: 'lemma_irregular' },
    { from: 'して', to: 'する', tag: 'te_form', next: 'lemma_irregular' },
    { from: 'した', to: 'する', tag: 'plain_past', next: 'lemma_irregular' },
    { from: 'しよう', to: 'する', tag: 'volitional', next: 'lemma_irregular' },
    { from: 'すれば', to: 'する', tag: 'conditional', next: 'lemma_irregular' },
    { from: 'できる', to: 'する', tag: 'potential', next: 'lemma_irregular' },
    { from: 'される', to: 'する', tag: 'passive', next: 'lemma_irregular' },
    { from: 'させる', to: 'する', tag: 'causative', next: 'lemma_irregular' },
    { from: 'し', to: 'する', tag: 'masu_stem', next: 'lemma_irregular', onlyFrom: 'masu_stem' },

    { from: '来ない', to: '来る', tag: 'negative', next: 'lemma_irregular' },
    { from: 'こない', to: 'くる', tag: 'negative', next: 'lemma_irregular' },
    { from: '来て', to: '来る', tag: 'te_form', next: 'lemma_irregular' },
    { from: 'きて', to: 'くる', tag: 'te_form', next: 'lemma_irregular' },
    { from: '来た', to: '来る', tag: 'plain_past', next: 'lemma_irregular' },
    { from: 'きた', to: 'くる', tag: 'plain_past', next: 'lemma_irregular' },
    { from: '来られる', to: '来る', tag: 'potential_passive', next: 'lemma_irregular' },
    { from: 'こられる', to: 'くる', tag: 'potential_passive', next: 'lemma_irregular' },
    { from: '来させる', to: '来る', tag: 'causative', next: 'lemma_irregular' },
    { from: 'こさせる', to: 'くる', tag: 'causative', next: 'lemma_irregular' },
    { from: '来', to: '来る', tag: 'masu_stem', next: 'lemma_irregular', onlyFrom: 'masu_stem' },
    { from: 'き', to: 'くる', tag: 'masu_stem', next: 'lemma_irregular', onlyFrom: 'masu_stem' },

    // Negative -nai -> lemma
    { from: 'わない', to: 'う', tag: 'negative', next: 'lemma_godan' },
    { from: 'かない', to: 'く', tag: 'negative', next: 'lemma_godan' },
    { from: 'がない', to: 'ぐ', tag: 'negative', next: 'lemma_godan' },
    { from: 'さない', to: 'す', tag: 'negative', next: 'lemma_godan' },
    { from: 'たない', to: 'つ', tag: 'negative', next: 'lemma_godan' },
    { from: 'なない', to: 'ぬ', tag: 'negative', next: 'lemma_godan' },
    { from: 'ばない', to: 'ぶ', tag: 'negative', next: 'lemma_godan' },
    { from: 'まない', to: 'む', tag: 'negative', next: 'lemma_godan' },
    { from: 'らない', to: 'る', tag: 'negative', next: 'lemma_godan' },
    { from: 'ない', to: 'る', tag: 'negative', next: 'lemma_ichidan' },

    // Te-form -> lemma (including 行く -> 行って)
    { from: '行って', to: '行く', tag: 'te_form', next: 'lemma_godan' },
    { from: 'いって', to: 'いく', tag: 'te_form', next: 'lemma_godan' },
    { from: 'って', to: 'う', tag: 'te_form', next: 'lemma_godan' },
    { from: 'って', to: 'つ', tag: 'te_form', next: 'lemma_godan' },
    { from: 'って', to: 'る', tag: 'te_form', next: 'lemma_godan' },
    { from: 'いて', to: 'く', tag: 'te_form', next: 'lemma_godan' },
    { from: 'いで', to: 'ぐ', tag: 'te_form', next: 'lemma_godan' },
    { from: 'して', to: 'す', tag: 'te_form', next: 'lemma_godan' },
    { from: 'んで', to: 'ぬ', tag: 'te_form', next: 'lemma_godan' },
    { from: 'んで', to: 'ぶ', tag: 'te_form', next: 'lemma_godan' },
    { from: 'んで', to: 'む', tag: 'te_form', next: 'lemma_godan' },
    { from: 'て', to: 'る', tag: 'te_form', next: 'lemma_ichidan' },

    // Plain past -> lemma (including 行く -> 行った)
    { from: '行った', to: '行く', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'いった', to: 'いく', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'った', to: 'う', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'った', to: 'つ', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'った', to: 'る', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'いた', to: 'く', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'いだ', to: 'ぐ', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'した', to: 'す', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'んだ', to: 'ぬ', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'んだ', to: 'ぶ', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'んだ', to: 'む', tag: 'plain_past', next: 'lemma_godan' },
    { from: 'た', to: 'る', tag: 'plain_past', next: 'lemma_ichidan' },

    // Masu stem -> lemma
    { from: 'い', to: 'う', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'き', to: 'く', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'ぎ', to: 'ぐ', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'し', to: 'す', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'ち', to: 'つ', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'に', to: 'ぬ', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'び', to: 'ぶ', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'み', to: 'む', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: 'り', to: 'る', tag: 'masu_stem', next: 'lemma_godan', onlyFrom: 'masu_stem' },
    { from: '', to: 'る', tag: 'masu_stem', next: 'lemma_ichidan', onlyFrom: 'masu_stem' },

    // Potential / Passive / Causative / Conditional / Volitional
    { from: 'られる', to: 'る', tag: 'potential_passive', next: 'lemma_ichidan' },
    { from: 'させる', to: 'る', tag: 'causative', next: 'lemma_ichidan' },
    { from: 'わせる', to: 'う', tag: 'causative', next: 'lemma_godan' },
    { from: 'かせる', to: 'く', tag: 'causative', next: 'lemma_godan' },
    { from: 'がせる', to: 'ぐ', tag: 'causative', next: 'lemma_godan' },
    { from: 'たせる', to: 'つ', tag: 'causative', next: 'lemma_godan' },
    { from: 'ばせる', to: 'ぶ', tag: 'causative', next: 'lemma_godan' },
    { from: 'ませる', to: 'む', tag: 'causative', next: 'lemma_godan' },
    { from: 'らせる', to: 'る', tag: 'causative', next: 'lemma_godan' },
    { from: 'われる', to: 'う', tag: 'passive', next: 'lemma_godan' },
    { from: 'かれる', to: 'く', tag: 'passive', next: 'lemma_godan' },
    { from: 'がれる', to: 'ぐ', tag: 'passive', next: 'lemma_godan' },
    { from: 'たれる', to: 'つ', tag: 'passive', next: 'lemma_godan' },
    { from: 'ばれる', to: 'ぶ', tag: 'passive', next: 'lemma_godan' },
    { from: 'まれる', to: 'む', tag: 'passive', next: 'lemma_godan' },
    { from: 'える', to: 'う', tag: 'potential', next: 'lemma_godan' },
    { from: 'ける', to: 'く', tag: 'potential', next: 'lemma_godan' },
    { from: 'げる', to: 'ぐ', tag: 'potential', next: 'lemma_godan' },
    { from: 'せる', to: 'す', tag: 'potential', next: 'lemma_godan' },
    { from: 'てる', to: 'つ', tag: 'potential', next: 'lemma_godan' },
    { from: 'べる', to: 'ぶ', tag: 'potential', next: 'lemma_godan' },
    { from: 'める', to: 'む', tag: 'potential', next: 'lemma_godan' },
    { from: 'れる', to: 'る', tag: 'potential', next: 'lemma_godan' },
    { from: 'れば', to: 'る', tag: 'conditional', next: 'lemma_ichidan' },
    { from: 'えば', to: 'う', tag: 'conditional', next: 'lemma_godan' },
    { from: 'けば', to: 'く', tag: 'conditional', next: 'lemma_godan' },
    { from: 'げば', to: 'ぐ', tag: 'conditional', next: 'lemma_godan' },
    { from: 'せば', to: 'す', tag: 'conditional', next: 'lemma_godan' },
    { from: 'てば', to: 'つ', tag: 'conditional', next: 'lemma_godan' },
    { from: 'べば', to: 'ぶ', tag: 'conditional', next: 'lemma_godan' },
    { from: 'めば', to: 'む', tag: 'conditional', next: 'lemma_godan' },
    { from: 'よう', to: 'る', tag: 'volitional', next: 'lemma_ichidan' },
    { from: 'おう', to: 'う', tag: 'volitional', next: 'lemma_godan' },
    { from: 'こう', to: 'く', tag: 'volitional', next: 'lemma_godan' },
    { from: 'ごう', to: 'ぐ', tag: 'volitional', next: 'lemma_godan' },
    { from: 'そう', to: 'す', tag: 'volitional', next: 'lemma_godan' },
    { from: 'とう', to: 'つ', tag: 'volitional', next: 'lemma_godan' },
    { from: 'ぼう', to: 'ぶ', tag: 'volitional', next: 'lemma_godan' },
    { from: 'もう', to: 'む', tag: 'volitional', next: 'lemma_godan' },
    { from: 'ろう', to: 'る', tag: 'volitional', next: 'lemma_godan' },

    // i-Adjective inflections
    { from: 'よくなかった', to: 'いい', tag: 'iadj_negative_past', next: 'lemma_iadj' },
    { from: 'よくない', to: 'いい', tag: 'iadj_negative', next: 'lemma_iadj' },
    { from: 'よかった', to: 'いい', tag: 'iadj_past', next: 'lemma_iadj' },
    { from: 'よくて', to: 'いい', tag: 'iadj_te', next: 'lemma_iadj' },
    { from: 'くなかった', to: 'い', tag: 'iadj_negative_past', next: 'lemma_iadj' },
    { from: 'くない', to: 'い', tag: 'iadj_negative', next: 'lemma_iadj' },
    { from: 'かった', to: 'い', tag: 'iadj_past', next: 'lemma_iadj' },
    { from: 'くて', to: 'い', tag: 'iadj_te', next: 'lemma_iadj' },
    { from: 'ければ', to: 'い', tag: 'iadj_conditional', next: 'lemma_iadj' }
  ];

  function getMasterWords() {
    if (root && root.FiezelJaDictionary && root.FiezelJaDictionary.WORDS) {
      return root.FiezelJaDictionary.WORDS;
    }
    return null;
  }

  function scoreLemmaCandidate(base, expectedClass) {
    if (!base || base.length < 2) return 0;
    var score = 0;
    var knownClass = CORE_LEMMAS[base];
    if (knownClass) {
      score += 50;
      if (expectedClass === 'lemma_ichidan' && knownClass === 'ichidan') score += 40;
      else if (expectedClass === 'lemma_godan' && knownClass === 'godan') score += 40;
      else if (expectedClass === 'lemma_irregular' && knownClass === 'irregular') score += 45;
      else if (expectedClass === 'lemma_iadj' && knownClass === 'iadj') score += 40;
      else score -= 35; // Penalize wrong verb class (e.g. 帰る treated as Ichidan)
    } else if (expectedClass === 'lemma_irregular' && isSuruVerb(base) && base.length >= 4) {
      score += 65;
    }
    if (GODAN_RU_EXCEPTIONS[base] && expectedClass === 'lemma_ichidan') {
      score -= 60;
    }
    var dict = getMasterWords();
    if (dict) {
      if (dict[base]) score += 45;
      else if (isSuruVerb(base) && dict[base.slice(0, -2)]) score += 40;
    }
    return score;
  }

  /**
   * Reverse-deconjugate a Japanese surface form into ranked `{ base, derivations, score }` candidates.
   */
  function unconjugate(word, maxDepth) {
    var surface = String(word || '').trim();
    if (!surface || !HAS_JA_RE.test(surface)) return [];
    var limit = typeof maxDepth === 'number' ? maxDepth : 4;
    var candidates = [];
    var seenKey = Object.create(null);

    function walk(curWord, state, tags, depth) {
      if (depth > limit || !curWord) return;

      var isTerminalLemma =
        state === 'start' ||
        state === 'lemma_godan' ||
        state === 'lemma_ichidan' ||
        state === 'lemma_irregular' ||
        state === 'lemma_iadj';

      if (isTerminalLemma) {
        var sc = scoreLemmaCandidate(curWord, state);
        if (state === 'start' && sc > 0) {
          var dKey0 = curWord + '|dictionary';
          if (!seenKey[dKey0]) {
            seenKey[dKey0] = true;
            candidates.push({ base: curWord, derivations: ['dictionary'], score: sc + 10 });
          }
        } else if (state !== 'start') {
          var key = curWord + '|' + tags.join('>');
          if (!seenKey[key]) {
            seenKey[key] = true;
            candidates.push({
              base: curWord,
              derivations: tags.slice().reverse(),
              score: sc - depth * 2
            });
          }
        }
        if (state !== 'start' && state !== 'lemma_ichidan' && state !== 'lemma_godan') {
          // Terminal irregular or iadj lemma reached
          return;
        }
      }

      for (var i = 0; i < REVERSE_RULES.length; i++) {
        var rule = REVERSE_RULES[i];
        if (rule.onlyFrom && state !== rule.onlyFrom) continue;
        if (!rule.onlyFrom && state === 'masu_stem') continue;
        if (state === 'te_form' && rule.tag !== 'te_form') continue;
        if (state === 'nai_form' && rule.tag !== 'negative' && rule.tag !== 'iadj_negative') continue;

        if (rule.from === '' || curWord.slice(-rule.from.length) === rule.from) {
          var stemPart = rule.from === '' ? curWord : curWord.slice(0, -rule.from.length);
          if (!stemPart && rule.to.length < 2) continue;
          var nextWord = stemPart + rule.to;
          var nextTags = tags.concat([rule.tag]);
          walk(nextWord, rule.next, nextTags, depth + 1);
        }
      }
    }

    walk(surface, 'start', [], 0);
    candidates.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.base.length - b.base.length;
    });
    return candidates;
  }

  var PARTICLE_PAIRS = {
    'は|が': 'ja-wa-vs-ga-topic-subject',
    'が|は': 'ja-wa-vs-ga-topic-subject',
    'に|で': 'ja-ni-vs-de-location-action',
    'で|に': 'ja-ni-vs-de-location-action',
    'を|が': 'ja-wo-vs-ga-object-intransitive',
    'が|を': 'ja-wo-vs-ga-object-intransitive',
    'に|へ': 'ja-ni-vs-e-target-direction',
    'へ|に': 'ja-ni-vs-e-target-direction',
    'に|を': 'ja-ni-vs-wo-case-particle',
    'を|に': 'ja-ni-vs-wo-case-particle'
  };

  function hasTag(tags, pattern) {
    for (var i = 0; i < tags.length; i++) {
      if (pattern.test(tags[i])) return true;
    }
    return false;
  }

  /**
   * Diagnose whether `userAnswer` vs `targetAnswer` is a Japanese morphological or particle
   * misconception rather than a harmless keyboard typo.
   *
   * Used by `FiezelProductionGrader` BEFORE `distance === 1` typo forgiveness so 1-kana
   * Japanese inflection errors (`食べた` vs `食べて`, `食べます` vs `食べました`,
   * `*行いた` vs `行った`, `*帰た` vs `帰った`, `*食べらない` vs `食べない`) are NEVER
   * forgiven as typos and emit valid Braincore Misconception Ledger IDs.
   */
  function diagnoseJapaneseMorpheme(userAnswer, targetAnswer) {
    var u = String(userAnswer || '').trim();
    var t = String(targetAnswer || '').trim();
    if (!u || !t || u === t) return null;
    if (!HAS_JA_RE.test(u) && !HAS_JA_RE.test(t)) return null;

    // 1. Direct particle confusion (single particle or noun+particle differing only in final particle)
    var pPair = PARTICLE_PAIRS[u + '|' + t];
    if (pPair) {
      return { isMorphemeError: true, misconception: pPair, base: t };
    }
    if (u.length >= 2 && u.length === t.length && u.slice(0, -1) === t.slice(0, -1)) {
      var tailPair = PARTICLE_PAIRS[u.slice(-1) + '|' + t.slice(-1)];
      if (tailPair) {
        return { isMorphemeError: true, misconception: tailPair, base: t.slice(0, -1) };
      }
    }

    // 2. Analyze target deconjugation first so we can check malformed learner overgeneralizations
    var tAnalyses = unconjugate(t);
    var uAnalyses = unconjugate(u);
    var tTop = tAnalyses[0] || null;
    var uTop = uAnalyses[0] || null;

    if (tTop && tTop.base) {
      var lemma = tTop.base;
      var lemmaClass = CORE_LEMMAS[lemma];
      var isIchidan = lemmaClass === 'ichidan' || (!lemmaClass && !GODAN_RU_EXCEPTIONS[lemma] && inferTypeII(lemma));

      // Check learner malformed class-error forms against target lemma
      if (isIchidan && lemma.slice(-1) === 'る') {
        var fakeGodanForms = [
          conjugate(lemma, Conjugation.Negative, false)[0] + 'ない',
          conjugate(lemma, Conjugation.Te, false)[0],
          conjugate(lemma, Conjugation.Ta, false)[0],
          conjugate(lemma, Conjugation.Conjunctive, false)[0] + 'ます',
          conjugate(lemma, Conjugation.Conjunctive, false)[0] + 'ました',
          conjugate(lemma, Conjugation.Conditional, false)[0] + 'る'
        ];
        if (fakeGodanForms.indexOf(u) !== -1) {
          return { isMorphemeError: true, misconception: 'ja-ichidan-conjugated-as-godan', base: lemma };
        }
      } else if (!isIchidan && lemma.slice(-1) === 'る' && !isSuruVerb(lemma) && !isKuruVerb(lemma)) {
        var fakeIchidanForms = [
          lemma.slice(0, -1) + 'ない',
          lemma.slice(0, -1) + 'て',
          lemma.slice(0, -1) + 'た',
          lemma.slice(0, -1) + 'ます',
          lemma.slice(0, -1) + 'ました',
          lemma.slice(0, -1) + 'られる'
        ];
        if (fakeIchidanForms.indexOf(u) !== -1) {
          return { isMorphemeError: true, misconception: 'ja-godan-ru-conjugated-as-ichidan', base: lemma };
        }
      }

      // Check 行く te/ta euphony overgeneralization (*行いて / *行いた / *行いている)
      if (isIkuException(lemma)) {
        var ikuStem = lemma.slice(0, -1);
        if (u === ikuStem + 'いて' || u === ikuStem + 'いた' || u === ikuStem + 'いている' || u === ikuStem + 'いています') {
          return { isMorphemeError: true, misconception: 'ja-iku-kiku-te-exception', base: lemma };
        }
      }

      // Check Godan te/ta euphony confusion (shared kanji/kana stem + wrong te/ta allomorph)
      if (!isIchidan && !isSuruVerb(lemma) && !isKuruVerb(lemma)) {
        var gStem = lemma.slice(0, -1);
        if (gStem && u.indexOf(gStem) === 0 && /(って|った|いて|いた|いで|いだ|んで|んだ|して|した)$/.test(u)) {
          if (!uTop || uTop.base !== lemma) {
            return { isMorphemeError: true, misconception: 'ja-godan-te-euphony-confusion', base: lemma };
          }
        }
      }
    }

    // 3. Compare valid deconjugations sharing the same base (or sharing common kanji prefix)
    var sharedPair = null;
    for (var ti = 0; ti < tAnalyses.length && !sharedPair; ti++) {
      for (var ui = 0; ui < uAnalyses.length; ui++) {
        if (tAnalyses[ti].base === uAnalyses[ui].base) {
          sharedPair = { base: tAnalyses[ti].base, tTags: tAnalyses[ti].derivations, uTags: uAnalyses[ui].derivations };
          break;
        }
      }
    }

    if (sharedPair) {
      var uTags = sharedPair.uTags;
      var tTags = sharedPair.tTags;

      // Te vs Ta confusion (食べて vs 食べた, 飲んで vs 飲んだ)
      if (
        (hasTag(uTags, /^te_form$|_te$/) && hasTag(tTags, /past/)) ||
        (hasTag(tTags, /^te_form$|_te$/) && hasTag(uTags, /past/))
      ) {
        return { isMorphemeError: true, misconception: 'ja-te-vs-ta-form-confusion', base: sharedPair.base };
      }

      // Polarity mismatch (affirmative vs negative)
      if (hasTag(uTags, /negative/) !== hasTag(tTags, /negative/)) {
        return { isMorphemeError: true, misconception: 'ja-polarity-affirmative-negative-mismatch', base: sharedPair.base };
      }

      // Tense mismatch (past vs non-past)
      if (hasTag(uTags, /past/) !== hasTag(tTags, /past/)) {
        return { isMorphemeError: true, misconception: 'ja-tense-past-nonpast-mismatch', base: sharedPair.base };
      }

      // Politeness register mismatch (plain vs polite masu)
      if (hasTag(uTags, /polite/) !== hasTag(tTags, /polite/)) {
        return { isMorphemeError: true, misconception: 'ja-politeness-plain-masu-mismatch', base: sharedPair.base };
      }

      // Voice mismatch (potential / passive / causative)
      if (
        hasTag(uTags, /potential|passive|causative/) ||
        hasTag(tTags, /potential|passive|causative/)
      ) {
        return { isMorphemeError: true, misconception: 'ja-voice-potential-passive-causative-mismatch', base: sharedPair.base };
      }

      return { isMorphemeError: true, misconception: 'ja-verb-inflection-mismatch', base: sharedPair.base };
    }

    // 4. General Japanese suffix/kana guard: in Japanese, even a 1-kana difference on
    // grammatical endings (ます/ました, て/た, る/れ, く/い) is morphological, never a Latin typo.
    if (HAS_JA_RE.test(u) && HAS_JA_RE.test(t)) {
      if ((/(て|で)$/.test(u) && /(た|だ)$/.test(t)) || (/(た|だ)$/.test(u) && /(て|で)$/.test(t))) {
        return { isMorphemeError: true, misconception: 'ja-te-vs-ta-form-confusion', base: t };
      }
      if ((/ます$/.test(u) && /ました$/.test(t)) || (/ました$/.test(u) && /ます$/.test(t))) {
        return { isMorphemeError: true, misconception: 'ja-tense-past-nonpast-mismatch', base: t };
      }
      if ((/ない$/.test(u) !== /ない$/.test(t)) || (/ません/.test(u) !== /ません/.test(t))) {
        return { isMorphemeError: true, misconception: 'ja-polarity-affirmative-negative-mismatch', base: t };
      }
      // Transitive / intransitive pair sharing initial kanji (開く vs 開ける, 閉まる vs 閉める, 始まる vs 始める)
      if (/^[\u3400-\u9fff]/.test(u) && u.charAt(0) === t.charAt(0)) {
        return { isMorphemeError: true, misconception: 'ja-verb-inflection-mismatch', base: t };
      }
    }

    return null;
  }

  /* ============================================================================
   * 3. BUNSETSU SENTENCE-ORDER VALIDATOR FOR JAPANESE TOKEN-ORDER EXERCISES
   * ============================================================================ */

  var CASE_PARTICLES = {
    'は': true, 'が': true, 'を': true, 'に': true, 'で': true, 'へ': true,
    'と': true, 'から': true, 'まで': true, 'より': true, 'も': true,
    'には': true, 'では': true, 'とは': true, 'からは': true, 'までは': true,
    'にも': true, 'でも': true
  };

  var SENTENCE_FINAL_PARTICLES = { 'か': true, 'ね': true, 'よ': true, 'よね': true, 'な': true };

  function cleanJaToken(tok) {
    var raw = typeof tok === 'object' && tok ? (tok.text || tok.word || tok.option || '') : String(tok == null ? '' : tok);
    return raw.replace(/[\s\u3000。、！？!?.,「」『』]/g, '');
  }

  function looksLikePredicateChunk(text) {
    return /(ます|ません|ました|ませんでした|です|でした|ではない|じゃない|ではありません|じゃありません|たい|たくない|ている|ています|ていた|ていました|ください|ましょう|なかった)$/.test(text);
  }

  /**
   * Group an array of Japanese tokens into Bunsetsu phrases `{ core, particle, surface, isPredicate }`.
   * Adnominal `の` phrases (`私 + の + 本`) are bound tightly into one noun phrase so scrambling
   * `本 + の + 私` is never falsely accepted!
   */
  function segmentBunsetsu(rawTokens) {
    var list = (Array.isArray(rawTokens) ? rawTokens : []).map(cleanJaToken).filter(Boolean);
    if (list.length === 0) return [];

    // Pre-split combined noun+particle tokens (e.g. "私は" -> "私" + "は") only if not a single lexical word,
    // OR normalize separate ["私", "は"] and combined ["私は"] into identical `{ core, particle }` records!
    var chunks = [];
    var pendingCore = '';

    for (var i = 0; i < list.length; i++) {
      var tok = list[i];

      // Sentence-final particle attaches to preceding predicate chunk
      if (SENTENCE_FINAL_PARTICLES[tok] && chunks.length > 0 && !pendingCore) {
        var prevChunk = chunks[chunks.length - 1];
        prevChunk.surface += tok;
        prevChunk.finalParticle = (prevChunk.finalParticle || '') + tok;
        prevChunk.isPredicate = true;
        continue;
      }

      // Adnominal modifier particle の binds tightly to the NEXT noun!
      if (tok === 'の' && pendingCore) {
        pendingCore += 'の';
        continue;
      }
      if (tok.length >= 2 && tok.slice(-1) === 'の' && i < list.length - 1 && !CASE_PARTICLES[list[i + 1]]) {
        pendingCore += tok;
        continue;
      }

      if (CASE_PARTICLES[tok]) {
        chunks.push({
          core: pendingCore,
          particle: tok,
          surface: pendingCore + tok,
          isPredicate: false
        });
        pendingCore = '';
        continue;
      }

      // Auxiliary copula / polite suffix split as separate token (e.g. ["学生", "です"])
      if ((tok === 'です' || tok === 'でした' || tok === 'だ' || tok === 'だった' || tok === 'ではありません' || tok === 'じゃありません') && pendingCore) {
        pendingCore += tok;
        chunks.push({
          core: pendingCore,
          particle: '',
          surface: pendingCore,
          isPredicate: true
        });
        pendingCore = '';
        continue;
      }

      if (pendingCore) {
        // Previous pendingCore had no particle (e.g., temporal adverb 毎日 / 昨日 / 今日, or predicate)
        chunks.push({
          core: pendingCore,
          particle: '',
          surface: pendingCore,
          isPredicate: looksLikePredicateChunk(pendingCore)
        });
        pendingCore = '';
      }

      // Check if token itself ends with a case particle attached to a known content word (e.g. "図書館で")
      // Only peel 1-char particle when stem is non-empty and token does not look like a verb/predicate
      var peeled = false;
      if (tok.length >= 2 && !looksLikePredicateChunk(tok)) {
        var twoP = tok.slice(-2);
        var oneP = tok.slice(-1);
        if (tok.length >= 3 && (twoP === 'から' || twoP === 'まで' || twoP === 'には' || twoP === 'では')) {
          chunks.push({ core: tok.slice(0, -2), particle: twoP, surface: tok, isPredicate: false });
          peeled = true;
        } else if (
          (oneP === 'は' || oneP === 'が' || oneP === 'を' || oneP === 'へ' || oneP === 'で' || oneP === 'に') &&
          !/[ぁ-ん]{2,}$/.test(tok) // Avoid peeling verb/adverb endings like 静かに or 食べて
        ) {
          chunks.push({ core: tok.slice(0, -1), particle: oneP, surface: tok, isPredicate: false });
          peeled = true;
        }
      }
      if (!peeled) {
        pendingCore = tok;
      }
    }

    if (pendingCore) {
      chunks.push({
        core: pendingCore,
        particle: '',
        surface: pendingCore,
        isPredicate: true // Final bare chunk in SOV Japanese is the clause predicate
      });
    } else if (chunks.length > 0 && !chunks[chunks.length - 1].particle) {
      chunks[chunks.length - 1].isPredicate = true;
    }

    return chunks;
  }

  /**
   * Validate a learner's placed Japanese tokens against target tokens using Bunsetsu SOV grammar:
   *  - Exact character-level match -> `{ ok: true, exact: true }`
   *  - Valid Japanese free-order adjunct scrambling (`[毎日][私は][図書館で][本を][読みます]`) where:
   *      1) Every argument keeps its exact case/topic particle (`図書館+で`, `本+を`),
   *      2) Adnominal `の` chains (`私の本`) remain intact,
   *      3) The clause predicate stays strictly sentence-final
   *    -> `{ ok: true, exact: false, rationale: 'ja_bunsetsu_equivalent_order' }`
   *  - Otherwise returns `{ ok: false, misconception }` pinpointing:
   *      - `'ja-sov-predicate-position-error'` (predicate not at end of clause)
   *      - `'ja-particle-role-swap'` (case particles attached to swapped nouns, e.g. `図書館を本で`)
   *      - `'ja-no-modifier-order-error'` (reversed `の` modifier)
   */
  function validateJapaneseSentenceOrder(placedTokens, targetTokens) {
    var uClean = (Array.isArray(placedTokens) ? placedTokens : []).map(cleanJaToken).filter(Boolean);
    var tClean = (Array.isArray(targetTokens) ? targetTokens : []).map(cleanJaToken).filter(Boolean);
    var uJoined = uClean.join('');
    var tJoined = tClean.join('');

    if (!uJoined || !tJoined || (!HAS_JA_RE.test(uJoined) && !HAS_JA_RE.test(tJoined))) {
      return { ok: false, exact: false, misconception: null };
    }
    if (uJoined === tJoined) {
      return { ok: true, exact: true, misconception: null, rationale: 'ja_exact_order' };
    }

    var uChunks = segmentBunsetsu(uClean);
    var tChunks = segmentBunsetsu(tClean);
    if (uChunks.length < 2 || tChunks.length < 2) {
      return { ok: false, exact: false, misconception: 'ja-word-order-mismatch' };
    }

    // Check dangling particle at start (e.g. starting sentence with を / が / は)
    for (var d = 0; d < uChunks.length; d++) {
      if (!uChunks[d].core && uChunks[d].particle) {
        return { ok: false, exact: false, misconception: 'ja-particle-role-swap' };
      }
    }

    var uPred = uChunks[uChunks.length - 1];
    var tPred = tChunks[tChunks.length - 1];

    // Rule 1: Japanese SOV — Predicate MUST remain sentence-final!
    if (uPred.surface !== tPred.surface) {
      // Did the learner place the target predicate earlier in the sentence?
      var predMovedEarly = uChunks.slice(0, -1).some(function (c) { return c.surface === tPred.surface; });
      if (predMovedEarly) {
        return { ok: false, exact: false, misconception: 'ja-sov-predicate-position-error' };
      }
      if (uJoined.indexOf('の') !== -1 && tJoined.indexOf('の') !== -1) {
        return { ok: false, exact: false, misconception: 'ja-no-modifier-order-error' };
      }
      return { ok: false, exact: false, misconception: 'ja-sov-predicate-position-error' };
    }

    // Rule 2: Pre-predicate bunsetsu multiset must match exact `(core + particle)` pairs!
    if (uChunks.length !== tChunks.length) {
      if (uJoined.indexOf('の') !== -1 || tJoined.indexOf('の') !== -1) {
        return { ok: false, exact: false, misconception: 'ja-no-modifier-order-error' };
      }
      return { ok: false, exact: false, misconception: 'ja-particle-role-swap' };
    }

    var uPre = uChunks.slice(0, -1).map(function (c) { return c.surface; }).sort();
    var tPre = tChunks.slice(0, -1).map(function (c) { return c.surface; }).sort();

    for (var k = 0; k < tPre.length; k++) {
      if (uPre[k] !== tPre[k]) {
        // Check if same cores and same particles exist overall -> classic particle role swap!
        var uCores = uChunks.slice(0, -1).map(function (c) { return c.core; }).sort().join('|');
        var tCores = tChunks.slice(0, -1).map(function (c) { return c.core; }).sort().join('|');
        if (uCores === tCores) {
          return { ok: false, exact: false, misconception: 'ja-particle-role-swap' };
        }
        if (uJoined.indexOf('の') !== -1 || tJoined.indexOf('の') !== -1) {
          return { ok: false, exact: false, misconception: 'ja-no-modifier-order-error' };
        }
        return { ok: false, exact: false, misconception: 'ja-word-order-mismatch' };
      }
    }

    return {
      ok: true,
      exact: false,
      misconception: null,
      rationale: 'ja_bunsetsu_equivalent_order'
    };
  }

  return {
    Conjugation: Conjugation,
    Auxiliary: Auxiliary,
    VerbType: VerbType,
    conjugate: conjugate,
    conjugateAuxiliaries: conjugateAuxiliaries,
    adjConjugate: adjConjugate,
    buildVerbExerciseSpec: buildVerbExerciseSpec,
    unconjugate: unconjugate,
    diagnoseJapaneseMorpheme: diagnoseJapaneseMorpheme,
    segmentBunsetsu: segmentBunsetsu,
    validateJapaneseSentenceOrder: validateJapaneseSentenceOrder
  };
});
