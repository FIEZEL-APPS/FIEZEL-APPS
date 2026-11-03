/**
 * features/mandarin/mandarin-pinyin-engine.js
 *
 * FIEZEL AUTOMATIC PINYIN RUBY ANNOTATION ENGINE & GLOBAL DISPLAY TOGGLE
 * Mirroring FiezelJaUi (Furigana/Romaji Engine) for Standard Mandarin (Putonghua).
 *
 * Menyediakan:
 * 1. Anotasi otomatis teks Hanzi ke tag <ruby class="zh-ruby">字<rt class="zh-rt">zì</rt></ruby>
 * 2. Algoritma segmentasi leksikon berbasis kamus FIEZEL HSK 1–6
 * 3. Sakelar tampilan global [拼音 Pinyin] dengan persistensi localStorage ('fiezel-zh-display-v1')
 * 4. Mode zero-flicker CSS toggle via class `fz-zh-no-pinyin` pada <body>
 * 5. Format transkripsi 3-baris untuk Kawan Bicara Xiao Mochi (Hanzi, Pinyin, Terjemahan ID)
 *
 * 100% Proprietary Clean Native FIEZEL Assets — Zero External Third-Party Branding.
 */

(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FiezelMandarinPinyinEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'fiezel-zh-display-v1';
  var HAS_HANZI_RE = /[\u4e00-\u9fa5]/;
  var HANZI_RUN_RE = /([\u4e00-\u9fa5]+|[^\u4e00-\u9fa5]+)/g;

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 1. PREFERENSI TAMPILAN GLOBAL (PINYIN ON/OFF) ---------- */
  function readPrefs() {
    try {
      if (typeof localStorage === 'undefined') return { pinyin: true };
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        return { pinyin: parsed.pinyin !== false };
      }
    } catch (_) {}
    return { pinyin: true };
  }

  function writePrefs(prefs) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      }
    } catch (_) {}
    applyDisplayPrefs();
  }

  function applyDisplayPrefs(targetDoc) {
    var doc = targetDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.body) return;
    var prefs = readPrefs();
    doc.body.classList.toggle('fz-zh-no-pinyin', !prefs.pinyin);

    // Sinkronkan atribut aria-pressed pada seluruh tombol sakelar
    var btns = doc.querySelectorAll('.fz-zh-pinyin-toggle-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', prefs.pinyin ? 'true' : 'false');
      if (prefs.pinyin) {
        btns[i].classList.add('active');
      } else {
        btns[i].classList.remove('active');
      }
    }
  }

  function togglePinyin() {
    var prefs = readPrefs();
    prefs.pinyin = !prefs.pinyin;
    writePrefs(prefs);
    return prefs.pinyin;
  }

  function renderDisplayToggleBar() {
    var prefs = readPrefs();
    var isAct = prefs.pinyin;
    return '<div class="fz-zh-display-bar" style="display:inline-flex;align-items:center;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;padding:3px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<button type="button" class="btn btn-sm fz-zh-pinyin-toggle-btn' + (isAct ? ' active' : '') + '" aria-pressed="' + (isAct ? 'true' : 'false') + '" onclick="FiezelMandarinPinyinEngine.togglePinyin()" style="border-radius:8px;font-size:11.5px;font-weight:800;padding:4px 10px;border:none;cursor:pointer;background:' + (isAct ? '#FFE4E6' : 'transparent') + ';color:' + (isAct ? '#BE123C' : '#64748B') + ';" title="Tampilkan/Sembunyikan panduan baca Pinyin">'
      + '拼音 Pinyin'
      + '</button>'
      + '</div>';
  }

  /* ---------- 2. BASIS LEKSIKON PINYIN HANZI LENGKAP ---------- */
  // Kamus kata majemuk & karakter tunggal paling sering digunakan di HSK 1–6
  var COMMON_CHAR_MAP = {
    '你': 'nǐ', '好': 'hǎo', '我': 'wǒ', '是': 'shì', '叫': 'jiào', '什': 'shén', '么': 'me', '名': 'míng', '字': 'zì',
    '他': 'tā', '她': 'tā', '它': 'tā', '们': 'men', '这': 'zhè', '那': 'nà', '哪': 'nǎ', '谁': 'shéi', '多': 'duō',
    '大': 'dà', '小': 'xiǎo', '少': 'shǎo', '不': 'bù', '很': 'hěn', '太': 'tài', '都': 'dōu', '也': 'yě', '和': 'hé',
    '在': 'zài', '有': 'yǒu', '个': 'gè', '岁': 'suì', '年': 'nián', '月': 'yuè', '日': 'rì', '号': 'hào', '天': 'tiān',
    '星': 'xīng', '期': 'qī', '点': 'diǎn', '分': 'fēn', '现': 'xiàn', '去': 'qù', '来': 'lái', '回': 'huí', '家': 'jiā',
    '吃': 'chī', '喝': 'hē', '看': 'kàn', '见': 'jiàn', '听': 'tīng', '说': 'shuō', '读': 'dú', '写': 'xiě', '想': 'xiǎng',
    '要': 'yào', '能': 'néng', '会': 'huì', '买': 'mǎi', '卖': 'mài', '做': 'zuò', '作': 'zuò', '学': 'xué', '习': 'xí',
    '生': 'shēng', '老': 'lǎo', '师': 'shī', '友': 'yǒu', '朋': 'péng', '人': 'rén', '男': 'nán', '女': 'nǚ', '儿': 'ér',
    '子': 'zǐ', '爸': 'bà', '妈': 'mā', '哥': 'gē', '姐': 'jiě', '弟': 'dì', '妹': 'mèi', '钱': 'qián', '块': 'kuài',
    '水': 'shuǐ', '茶': 'chá', '菜': 'cài', '饭': 'fàn', '米': 'mǐ', '面': 'miàn', '肉': 'ròu', '鱼': 'yú', '车': 'chē',
    '站': 'zhàn', '机': 'jī', '飞': 'fēi', '电': 'diàn', '话': 'huà', '脑': 'nǎo', '视': 'shì', '影': 'yǐng', '书': 'shū',
    '本': 'běn', '字': 'zì', '语': 'yǔ', '汉': 'hàn', '中': 'zhōng', '国': 'guó', '北': 'běi', '京': 'jīng', '上': 'shàng',
    '下': 'xià', '前': 'qián', '后': 'hòu', '里': 'lǐ', '外': 'wài', '左': 'zuǒ', '右': 'yòu', '东': 'dōng', '西': 'xī',
    '南': 'nán', '一': 'yī', '二': 'èr', '三': 'sān', '四': 'sì', '五': 'wǔ', '六': 'liù', '七': 'qī', '八': 'bā',
    '九': 'jiǔ', '十': 'shí', '百': 'bǎi', '千': 'qiān', '万': 'wàn', '零': 'líng', '高': 'gāo', '兴': 'xìng', '快': 'kuài',
    '乐': 'lè', '喜': 'xǐ', '欢': 'huan', '爱': 'ài', '对': 'duì', '起': 'qǐ', '没': 'méi', '关': 'guān', '系': 'xi',
    '谢': 'xiè', '再': 'zài', '请': 'qǐng', '问': 'wèn', '贵': 'guì', '姓': 'xìng', '什': 'shén', '么': 'me', '得': 'de',
    '地': 'de', '的': 'de', '着': 'zhe', '了': 'le', '过': 'guo', '吧': 'ba', '吗': 'ma', '呢': 'ne', '啊': 'a'
  };

  var COMMON_WORD_MAP = {
    '你好': 'nǐ hǎo', '我们': 'wǒmen', '你们': 'nǐmen', '他们': 'tāmen', '她们': 'tāmen',
    '中国': 'zhōngguó', '北京': 'běijīng', '汉语': 'hànyǔ', '中文': 'zhōngwén', '普通话': 'pǔtōnghuà',
    '学生': 'xuésheng', '老师': 'lǎoshī', '朋友': 'péngyou', '同学': 'tóngxué', '同事': 'tóngshì',
    '医生': 'yīshēng', '护士': 'hùshi', '工程师': 'gōngchéngshī', '服务员': 'fúwùyuán', '司机': 'sījī',
    '爸爸': 'bàba', '妈妈': 'māma', '哥哥': 'gēge', '姐姐': 'jiějie', '弟弟': 'dìdi', '妹妹': 'mèimei',
    '早上': 'zǎoshang', '中午': 'zhōngwǔ', '下午': 'xiàwǔ', '晚上': 'wǎnshang', '昨天': 'zuótiān',
    '今天': 'jīntiān', '明天': 'míngtiān', '现在': 'xiànzài', '星期': 'xīngqī', '时候': 'shíhou',
    '分钟': 'fēnzhōng', '小时': 'xiǎoshí', '年': 'nián', '月': 'yuè', '日': 'rì', '号': 'hào',
    '喜欢': 'xǐhuan', '高兴': 'gāoxìng', '认识': 'rènshi', '谢谢': 'xièxie', '不客气': 'bú kèqi',
    '对不起': 'duìbuqǐ', '没关系': 'méi guānxi', '再见': 'zàijiàn', '请问': 'qǐngwèn',
    '吃东西': 'chī dōngxi', '喝水': 'hē shuǐ', '喝茶': 'hē chá', '喝咖啡': 'hē kāfēi', '吃早饭': 'chī zǎofàn',
    '看书': 'kàn shū', '看电影': 'kàn diànyǐng', '听音乐': 'tīng yīnyuè', '打电话': 'dǎ diànhuà', '做作业': 'zuò zuòyè',
    '去学校': 'qù xuéxiào', '回家': 'huí jiā', '买东西': 'mǎi dōngxi', '坐高铁': 'zuò gāotiě', '打车': 'dǎ chē',
    '怎么样': 'zěnmeyàng', '多少钱': 'duōshao qián', '为什么': 'wèishénme', '因为': 'yīnwèi', '所以': 'suǒyǐ',
    '虽然': 'suīrán', '但是': 'dànshì', '不但': 'búdàn', '而且': 'érqiě', '如果': 'rúguǒ',
    '小麻薯': 'xiǎo máshu', '菲泽尔': 'fēizéěr'
  };

  /* ---------- 3. ALGORITMA ANOTASI RUBY PINYIN (MAXIMUM MATCHING) ---------- */
  function getPinyinForChar(ch) {
    if (COMMON_CHAR_MAP[ch]) return COMMON_CHAR_MAP[ch];
    // Konsultasikan ke VocabBank bila tersedia di runtime
    if (typeof FiezelMandarinVocabBank !== 'undefined' && FiezelMandarinVocabBank.getByHanzi) {
      var item = FiezelMandarinVocabBank.getByHanzi(ch);
      if (item && item.pinyin && item.pinyin !== 'zh') {
        return item.pinyin.split(/\s+/)[0];
      }
    }
    return '';
  }

  function getPinyinForWord(word) {
    if (COMMON_WORD_MAP[word]) return COMMON_WORD_MAP[word];
    if (typeof FiezelMandarinVocabBank !== 'undefined' && FiezelMandarinVocabBank.getByHanzi) {
      var item = FiezelMandarinVocabBank.getByHanzi(word);
      if (item && item.pinyin && item.pinyin !== 'zh') {
        return item.pinyin;
      }
    }
    return '';
  }

  function rubyHtml(charStr, pinyinStr) {
    if (!pinyinStr) {
      return esc(charStr);
    }
    return '<ruby class="zh-ruby">' + esc(charStr) + '<rp>(</rp><rt class="zh-rt">' + esc(pinyinStr) + '</rt><rp>)</rp></ruby>';
  }

  function annotateHanziRun(runText) {
    var resultHtml = '';
    var i = 0;
    var len = runText.length;

    while (i < len) {
      var matched = false;

      // Coba cocokkan kata 4 karakter, 3 karakter, 2 karakter (Greedy Matching)
      for (var wLen = Math.min(4, len - i); wLen >= 2; wLen--) {
        var subWord = runText.slice(i, i + wLen);
        var pinyinPhrase = getPinyinForWord(subWord);

        if (pinyinPhrase) {
          var pyParts = pinyinPhrase.split(/\s+/);
          if (pyParts.length === wLen) {
            for (var k = 0; k < wLen; k++) {
              resultHtml += rubyHtml(subWord[k], pyParts[k]);
            }
          } else {
            // Jika pinyin suku kata tidak terpisah spasi, sebar per karakter
            for (var m = 0; m < wLen; m++) {
              var charPy = getPinyinForChar(subWord[m]);
              resultHtml += rubyHtml(subWord[m], charPy);
            }
          }
          i += wLen;
          matched = true;
          break;
        }
      }

      // Jika tidak cocok frasa majemuk, anotasikan per karakter tunggal
      if (!matched) {
        var singleChar = runText[i];
        var singlePy = getPinyinForChar(singleChar);
        resultHtml += rubyHtml(singleChar, singlePy);
        i++;
      }
    }

    return resultHtml;
  }

  function annotateText(text) {
    if (!text || typeof text !== 'string') return '';
    if (!HAS_HANZI_RE.test(text)) return esc(text);

    return text.replace(HANZI_RUN_RE, function (match, segment) {
      if (HAS_HANZI_RE.test(segment)) {
        return annotateHanziRun(segment);
      }
      return esc(segment);
    });
  }

  /* ---------- 4. PENYISIRAN DOM TREEWALKER (ANNOTATE ELEMENT) ---------- */
  var SKIP_SELECTOR = 'ruby, rt, rp, script, style, textarea, input, code, pre, .zh-ruby, [data-zh-annotated]';

  function annotateElement(el) {
    if (!el || typeof document === 'undefined') return 0;
    if (el.nodeType === 3) {
      // Jika langsung text node
      if (HAS_HANZI_RE.test(el.nodeValue)) {
        var span = document.createElement('span');
        span.setAttribute('data-zh-annotated', '');
        span.innerHTML = annotateText(el.nodeValue);
        el.parentNode.replaceChild(span, el);
        return 1;
      }
      return 0;
    }

    if (el.matches && el.matches(SKIP_SELECTOR)) return 0;

    var walker = document.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */, null);
    var textNodes = [];
    var current;

    while ((current = walker.nextNode())) {
      var parent = current.parentNode;
      if (!parent || (parent.closest && parent.closest(SKIP_SELECTOR))) continue;
      if (HAS_HANZI_RE.test(current.nodeValue)) {
        textNodes.push(current);
      }
    }

    for (var i = 0; i < textNodes.length; i++) {
      var node = textNodes[i];
      var holder = document.createElement('span');
      holder.setAttribute('data-zh-annotated', '');
      holder.innerHTML = annotateText(node.nodeValue);
      node.parentNode.replaceChild(holder, node);
    }

    return textNodes.length;
  }

  /* ---------- 5. FORMAT 3-BARIS TRANSKRIPSI MITRA KAIWA (XIAO MOCHI) ---------- */
  function formatThreeLine(hzText, pyText, idText) {
    var pinyinLine = pyText || '';
    if (!pinyinLine && hzText) {
      // Generate pinyin bila tidak disediakan
      var parts = [];
      for (var i = 0; i < hzText.length; i++) {
        var py = getPinyinForChar(hzText[i]);
        if (py) parts.push(py);
      }
      pinyinLine = parts.join(' ');
    }

    return '<div class="fz-zh-three-line" style="display:flex;flex-direction:column;gap:3px;margin:4px 0;">'
      + '<div class="fz-zh-line-hz" style="font-size:16px;font-weight:800;color:#0F172A;font-family:var(--fz-font-cjk);letter-spacing:0.02em;">' + annotateText(hzText) + '</div>'
      + '<div class="fz-zh-line-py" style="font-size:12px;font-weight:700;color:#BE123C;font-family:var(--fz-font-pinyin);">' + esc(pinyinLine) + '</div>'
      + '<div class="fz-zh-line-id" style="font-size:12px;color:#475569;line-height:1.35;">' + esc(idText || '') + '</div>'
      + '</div>';
  }

  return {
    readPrefs: readPrefs,
    writePrefs: writePrefs,
    applyDisplayPrefs: applyDisplayPrefs,
    togglePinyin: togglePinyin,
    renderDisplayToggleBar: renderDisplayToggleBar,
    getPinyinForChar: getPinyinForChar,
    getPinyinForWord: getPinyinForWord,
    rubyHtml: rubyHtml,
    annotateText: annotateText,
    annotateElement: annotateElement,
    formatThreeLine: formatThreeLine
  };
});
