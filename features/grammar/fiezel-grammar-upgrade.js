/**
 * Fiezel Grammar UI/UX Upgrade Feature Module
 * File: fiezel-grammar-upgrade.js
 *
 * Modul ini menyediakan antarmuka dan interaksi yang ditingkatkan untuk
 * fitur Grammar, termasuk latihan pengurutan token (Token Rail), highlight
 * sintaksis, popover 4-level progressive disclosure hint, umpan balik yang
 * diperkaya (bottom sheet), kotak kesalahan (Mistake Vault), dan kalkulator
 * tingkat penguasaan (Mastery Tier).
 */
(function() {
  'use strict';

  const FiezelGrammarUpgrade = {};

  const SUBJ_WORDS = new Set([
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those'
  ]);
  const PREP_WORDS = new Set([
    'in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'about', 'into', 'through', 'after', 'before', 'under', 'over', 'between', 'during', 'without', 'against'
  ]);
  const AUX_WORDS = new Set([
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had',
    'do', 'does', 'did',
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must'
  ]);
  const COMMON_VERBS = new Set([
    'go', 'goes', 'went', 'gone', 'going',
    'eat', 'eats', 'ate', 'eaten', 'eating',
    'drink', 'drinks', 'drank', 'drunk', 'drinking',
    'read', 'reads', 'reading',
    'write', 'writes', 'wrote', 'written', 'writing',
    'see', 'sees', 'saw', 'seen', 'seeing',
    'like', 'likes', 'liked', 'liking',
    'want', 'wants', 'wanted', 'wanting',
    'study', 'studies', 'studied', 'studying',
    'play', 'plays', 'played', 'playing',
    'make', 'makes', 'made', 'making',
    'take', 'takes', 'took', 'taken', 'taking',
    'come', 'comes', 'came', 'coming',
    'know', 'knows', 'knew', 'known', 'knowing',
    'think', 'thinks', 'thought', 'thinking',
    'look', 'looks', 'looked', 'looking',
    'use', 'uses', 'used', 'using',
    'find', 'finds', 'found', 'finding',
    'give', 'gives', 'gave', 'given', 'giving',
    'tell', 'tells', 'told', 'telling',
    'work', 'works', 'worked', 'working',
    'call', 'calls', 'called', 'calling',
    'try', 'tries', 'tried', 'trying',
    'ask', 'asks', 'asked', 'asking',
    'need', 'needs', 'needed', 'needing',
    'feel', 'feels', 'felt', 'feeling',
    'become', 'becomes', 'became', 'becoming',
    'leave', 'leaves', 'left', 'leaving',
    'put', 'puts', 'putting',
    'mean', 'means', 'meant', 'meaning',
    'keep', 'keeps', 'kept', 'keeping',
    'let', 'lets', 'letting',
    'begin', 'begins', 'began', 'begun', 'beginning',
    'seem', 'seems', 'seemed', 'seeming',
    'help', 'helps', 'helped', 'helping',
    'talk', 'talks', 'talked', 'talking',
    'turn', 'turns', 'turned', 'turning',
    'start', 'starts', 'started', 'starting',
    'show', 'shows', 'showed', 'shown', 'showing',
    'hear', 'hears', 'heard', 'hearing',
    'live', 'lives', 'lived', 'living'
  ]);

  /**
   * Mengklasifikasikan kata ke kategori sintaksis untuk penandaan warna (syntax highlighting).
   * @param {string} rawWord Kata mentah
   * @returns {string} 'subj' | 'prep' | 'aux' | 'verb' | 'obj' | ''
   */
  FiezelGrammarUpgrade.classifyWord = function(rawWord) {
    if (!rawWord || typeof rawWord !== 'string') return '';
    const clean = rawWord.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    if (!clean) return '';
    if (SUBJ_WORDS.has(clean)) return 'subj';
    if (AUX_WORDS.has(clean)) return 'aux';
    if (PREP_WORDS.has(clean)) return 'prep';
    if (COMMON_VERBS.has(clean) || clean.endsWith('ing') || clean.endsWith('ed')) return 'verb';
    return '';
  };

  /**
   * 1. Token-Order Exercise Renderer (Tap-to-Order Token Rail)
   * Merender latihan susun kata untuk grammar dengan token rail interaktif.
   * @param {Object} q Objek pertanyaan (q.tokens, q.distractors, q.correctOrder)
   * @param {Function} onComplete Callback saat pengguna selesai/submit, dipanggil dengan boolean (isCorrect)
   * @returns {HTMLElement} Elemen DOM siap dimasukkan ke dalam kuis
   */
  FiezelGrammarUpgrade.renderTokenOrder = function(q, onComplete, opts) {
    // Mode ukur (tes penempatan, ujian lompat level, gerbang lewati materi): tanpa bantuan
    // apa pun - arti kata yang bisa diintip adalah bantuan, dan bantuan di alat ukur membuat
    // levelnya mengukur bantuan itu, bukan muridnya (audit P-A 2026-10-04).
    const measure = !!(opts && opts.measure);
    const container = document.createElement('div');
    container.className = 'token-order-container';
    const esc = (str) => String(str ?? '')
      .split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;')
      .split('"').join('&quot;').split("'").join('&#039;');

    const tokens = [...(q.tokens || [])];
    const distractors = [...(q.distractors || [])];
    const allTokens = [...tokens, ...distractors];

    // Fisher-Yates shuffle
    const shuffle = (array) => {
      let currentIndex = array.length, randomIndex;
      while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
    };

    // Arti kata (gloss) dalam bahasa MURID. Dua sumber, keduanya sudah dwibahasa:
    //  1. q.gloss — peta {kata: arti} dari pembuat soal (app.js mengisinya dari bank kosakata
    //     yang sudah ber-overlay locale);
    //  2. kamus kecil kata fungsi & bentuk berinfleksi di copy-map (`grammar.gloss.<kata>`),
    //     karena bank kosakata hanya memuat bentuk dasar.
    // Dulu kamusnya literal Indonesia di sini, jadi murid Thai membaca "dia (pr)".
    const glossFor = (text) => {
      const lower = text.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
      const fromQ = (q.gloss && (q.gloss[text] || q.gloss[lower])) || '';
      if (fromQ) return String(fromQ);
      const isThai = (self.FiezelI18n?.getLocale?.() === 'th');
      const loc = isThai ? 'th' : 'id';
      const key = 'grammar.gloss.' + lower;
      try {
        if (typeof FiezelI18n.hasCopy === 'function' && FiezelI18n.hasCopy(loc, key)) return FiezelI18n.t(key);
      } catch (_) {}
      if (self.FiezelGrammarLexicon && typeof self.FiezelGrammarLexicon.lookup === 'function') {
        const gl = self.FiezelGrammarLexicon.lookup(lower, loc);
        if (gl) return gl;
      }
      return '';
    };

    const bankTokens = shuffle(allTokens.map((item, id) => {
      const rawText = typeof item === 'object' && item ? (item.text || item.option || item.word || '') : String(item ?? '');
      const text = rawText.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()“”"']+|[.,\/#!$%\^&\*;:{}=\-_`~()“”"']+$/g, '');
      const explicitSyntax = typeof item === 'object' && item.syntax ? item.syntax : '';
      const syntax = explicitSyntax || FiezelGrammarUpgrade.classifyWord(text);
      const gloss = glossFor(text);
      return { text, id, syntax, gloss, placed: false };
    }));
    // Tombol "intip arti" hanya muncul kalau memang ada arti yang bisa diintip: tombol yang
    // ditekan lalu tidak mengubah apa pun justru membuat murid mengira aplikasinya rusak.
    const anyGloss = !measure && bankTokens.some(t => t.gloss);
    const placedTokens = [];
    let vacantSlotIndex = null;
    let showGloss = false;
    const vacantSlotHtml = () => `<span aria-hidden="true">↳</span> ${esc(FiezelI18n.t('grammar.token-isi-di-sini'))}`;

    container.innerHTML = `
      <div class="token-rail" id="tokenRail" aria-label="${FiezelI18n.t('grammar.token-rail-aria', 'Area penyusunan kalimat')}"></div>
      <div class="gx-gloss-bar">
        <span class="token-bank-label">${FiezelI18n.t('grammar.token-bank-aria', 'Daftar kata tersedia')}</span>
        ${anyGloss ? `<button type="button" class="gx-btn-gloss" id="tokenGlossToggle" aria-pressed="false">
          <span aria-hidden="true">📖</span> ${esc(FiezelI18n.t('grammar.token-intip-arti'))}
        </button>` : ''}
      </div>
      <div class="token-bank" id="tokenBank" aria-label="${FiezelI18n.t('grammar.token-bank-aria', 'Daftar kata tersedia')}"></div>
      <div class="token-actions">
        <button type="button" id="tokenResetBtn" class="token-reset-btn" disabled>
          <i data-lucide="rotate-ccw"></i>
          <span>${FiezelI18n.t('umum.hapus', 'Hapus')}</span>
        </button>
        <button type="button" id="tokenSubmitBtn" class="primary token-submit-btn" disabled>${FiezelI18n.t('quiz.periksa', 'Periksa')}</button>
      </div>
    `;

    const railEl = container.querySelector('#tokenRail');
    const bankEl = container.querySelector('#tokenBank');
    const glossToggleBtn = container.querySelector('#tokenGlossToggle');
    const submitBtn = container.querySelector('#tokenSubmitBtn');
    const resetBtn = container.querySelector('#tokenResetBtn');

    if (glossToggleBtn) {
      glossToggleBtn.onclick = () => {
        showGloss = !showGloss;
        glossToggleBtn.classList.toggle('active', showGloss);
        glossToggleBtn.setAttribute('aria-pressed', String(showGloss));
        render();
      };
    }

    const render = () => {
      railEl.innerHTML = '';
      bankEl.innerHTML = '';

      // Render kata di bank
      bankTokens.forEach((token) => {
        if (token.placed) {
          const placeholder = document.createElement('div');
          placeholder.className = 'token-chip placed placeholder';
          placeholder.setAttribute('aria-hidden', 'true');
          placeholder.textContent = token.text;
          bankEl.appendChild(placeholder);
        } else {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'token-chip' + (showGloss && token.gloss ? ' has-gloss' : '');
          if (showGloss && token.gloss) {
            btn.innerHTML = `<span class="token-gloss">${esc(token.gloss)}</span><span class="token-word">${esc(token.text)}</span>`;
          } else {
            btn.textContent = token.text;
          }
          btn.onclick = () => {
            if (typeof self.haptic === 'function') self.haptic('tap');
            if (typeof self.uiSfx === 'function') self.uiSfx('pop');
            token.placed = true;
            if (vacantSlotIndex !== null && vacantSlotIndex <= placedTokens.length) {
              placedTokens.splice(vacantSlotIndex, 0, token);
              vacantSlotIndex = null;
            } else {
              placedTokens.push(token);
            }
            render();
          };
          bankEl.appendChild(btn);
        }
      });

      // Render kata di rail (kalimat yang sedang disusun) dengan dukungan vacant slot insertion
      placedTokens.forEach((token, index) => {
        if (vacantSlotIndex === index) {
          const vacantEl = document.createElement('span');
          vacantEl.className = 'gx-vacant-slot';
          vacantEl.innerHTML = vacantSlotHtml();
          railEl.appendChild(vacantEl);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'token-chip in-rail' + (showGloss && token.gloss ? ' has-gloss' : '');
        if (showGloss && token.gloss) {
          btn.innerHTML = `<span class="token-gloss">${esc(token.gloss)}</span><span class="token-word">${esc(token.text)}</span>`;
        } else {
          btn.textContent = token.text;
        }
        btn.setAttribute('title', FiezelI18n.t('grammar.token-lepas', 'Ketuk untuk melepas'));
        btn.onclick = () => {
          if (typeof self.haptic === 'function') self.haptic('tap');
          token.placed = false;
          placedTokens.splice(index, 1);
          vacantSlotIndex = index;
          render();
        };
        railEl.appendChild(btn);
      });

      if (vacantSlotIndex !== null && vacantSlotIndex >= placedTokens.length) {
        const vacantEl = document.createElement('span');
        vacantEl.className = 'gx-vacant-slot';
        vacantEl.innerHTML = vacantSlotHtml();
        railEl.appendChild(vacantEl);
      }

      const targetCount = Array.isArray(q.tokens) && q.tokens.length > 0 ? q.tokens.length : 1;
      submitBtn.disabled = placedTokens.length < targetCount;
      if (q.__scaffoldAttempt) {
        submitBtn.classList.add('token-submit-retry');
        submitBtn.innerHTML = `<i data-lucide="rotate-ccw"></i> <span>${FiezelI18n.t('quiz.periksa-ulang', 'Periksa Ulang')}</span>`;
      }
      if (resetBtn) resetBtn.disabled = placedTokens.length === 0;
    };

    if (resetBtn) {
      resetBtn.onclick = () => {
        if (typeof self.haptic === 'function') self.haptic('tap');
        bankTokens.forEach((token) => { token.placed = false; });
        placedTokens.length = 0;
        vacantSlotIndex = null;
        render();
      };
    }

    submitBtn.onclick = () => {
      const norm = (s) => String(s || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      const userText = placedTokens.map(t => t.text).join(' ');
      const userNorm = norm(userText);
      const correctText = (q.tokens || []).map(t => typeof t === 'object' && t.text ? t.text : String(t)).join(' ');
      const targets = [correctText, q.options?.[0], ...(q.alternates || [])].filter(Boolean);
      const isCorrect = userText === correctText || targets.some(tgt => norm(tgt) === userNorm);

      const unplacedTokens = bankTokens.filter(t => !t.placed).map(t => t.text);

      // Kiriman SALAH langsung diteruskan ke answer() di app.js. Dulu widget menahan kiriman
      // salah pertama dan memberi petunjuknya sendiri: answer() tidak pernah melihatnya,
      // sehingga murid mendapat tiga kesempatan (bukan dua), salah-lalu-benar tercatat benar
      // di percobaan pertama, dan BrainCore buta terhadap kesalahan pertama (audit
      // BRAINCORE-GRAMMAR-FEEDBACK-AUDIT-2026-10-03 G1). Retry, petunjuk, dan diagnosisnya
      // (diagnoseTokenOrderMistake) sudah dimiliki answer(); widget cukup memberi goyangan.
      if (!isCorrect) {
        railEl.classList.remove('gx-shake');
        void railEl.offsetWidth;
        railEl.classList.add('gx-shake');
      }

      if (typeof onComplete === 'function') {
        onComplete(isCorrect, {
          userText: userText,
          placedTokens: placedTokens.map(t => t.text),
          unplacedTokens: unplacedTokens
        });
      }
    };

    render();
    if (typeof self.enhanceUI === 'function') self.enhanceUI();
    try { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); } catch(_) {}
    return container;
  };

  /**
   * 2. Syntax Highlighter
   * Memberikan penandaan sintaks (warna) untuk kalimat sesuai anotasi atau klasifikasi POS.
   * @param {string} sentence Kalimat utuh
   * @param {Array} annotations Array objek {word: 'kata', type: 'verb'}
   * @returns {string} String HTML dengan tag span
   */
  FiezelGrammarUpgrade.highlightSyntax = function(sentence, annotations) {
    if (!sentence) return '';
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    if (annotations && Array.isArray(annotations) && annotations.length > 0) {
      let result = sentence;
      annotations.forEach(ann => {
        if (ann.word && ann.type) {
          const regex = new RegExp(`\\b(${ann.word})\\b`, 'gi');
          const cls = ann.type === 'target' || ann.type === 'error' ? 'target-word' : `syntax-${ann.type}`;
          result = result.replace(regex, `<span class="${cls}">$1</span>`);
        }
      });
      return result;
    }

    // Auto-highlight jika tidak ada anotasi manual
    const words = String(sentence).split(/(\s+)/);
    return words.map(w => {
      if (/^\s+$/.test(w)) return w;
      const type = FiezelGrammarUpgrade.classifyWord(w);
      return type ? `<span class="syntax-${type}">${esc(w)}</span>` : esc(w);
    }).join('');
  };

  /**
   * 2b. Target Word Formatter for Sentence Correction & Fill-in Questions
   * Formats the target word/error token with distinct highlight tint, underline, and italic styling.
   * @param {string} stem Kalimat utama soal
   * @param {string} [targetWord] Kata target spesifik jika ada
   * @param {Array} [options] Pilihan jawaban untuk deteksi otomatis
   * @param {string} [instruction] Instruksi soal untuk deteksi mode repair
   * @returns {string} String HTML aman dengan tag <span class="target-word">
   */
  FiezelGrammarUpgrade.formatTargetWord = function(stem, targetWord, options, instruction) {
    if (!stem) return '';
    const esc = (str) => {
      if (typeof self !== 'undefined' && typeof self.esc === 'function') return self.esc(str);
      return String(str ?? '')
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#039;');
    };

    // Jika sudah ada tag target-word, kembalikan langsung
    if (/<span class="target-word">|<mark>|<u><i>|<i><u>/i.test(stem)) return stem;

    // 1. Tangani penanda eksplisit dalam teks jika ada: *kata*, [kata], <u>kata</u>
    const mdMatch = stem.match(/(\*|_|<u>|\[)([A-Za-z0-9_’'\s-]{1,40})(\*|_|<\/u>|\])/i);
    if (mdMatch && !/_{2,}|\[\.\.\.\]/.test(mdMatch[0])) {
      const matchIndex = mdMatch.index;
      const fullLen = mdMatch[0].length;
      const word = mdMatch[2].trim();
      const before = stem.slice(0, matchIndex);
      const after = stem.slice(matchIndex + fullLen);
      return `${esc(before)}<span class="target-word">${esc(word)}</span>${esc(after)}`;
    }

    const stripQuotes = (s) => {
      let r = String(s || '').trim();
      const openQuotes = ['"', "'", '\u201c', '\u2018'];
      const closeQuotes = ['"', "'", '\u201d', '\u2019'];
      if (r.length >= 2) {
        const first = r[0];
        const last = r[r.length - 1];
        const openIdx = openQuotes.indexOf(first);
        const closeIdx = closeQuotes.indexOf(last);
        if (openIdx !== -1 && closeIdx !== -1) {
          return r.slice(1, -1).trim();
        }
      }
      return r;
    };

    let target = stripQuotes(targetWord);

    // 2. Deteksi otomatis jika target belum diset eksplisit dan instruksi meminta perbaikan kalimat
    if (!target && /perbaiki|repair|koreksi|ganti|benahi|ubah|salah|pilihan yang tepat|correct|fix|pilihlah|แก้ไข/i.test(instruction || '')) {
      const quoteMatch = stem.match(new RegExp('[\\x22\\u201c\\x27\\u2018]([A-Za-z0-9_\\u2019\\x27-]{1,30})[\\x22\\u201d\\x27\\u2019]'));
      if (quoteMatch && quoteMatch[1]) {
        target = quoteMatch[1];
      } else if (Array.isArray(options) && options.length > 0) {
        const sortedOpts = [...options]
          .map(opt => stripQuotes(opt))
          .filter(Boolean)
          .sort((a, b) => b.length - a.length);

        for (const cleanOpt of sortedOpts) {
          const cleanOptionText = cleanOpt.replace(/^\[|\]$/g, '').trim();
          const escOpt = (cleanOptionText || cleanOpt).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const optRegex = new RegExp('(?:^|[^A-Za-z0-9])(' + escOpt + ')(?:[^A-Za-z0-9]|$)', 'i');
          if (optRegex.test(stem)) {
            target = cleanOptionText || cleanOpt;
            break;
          }
        }
      }
    }

    if (target) {
      const cleanTarget = target.replace(/^\[|\]$/g, '').trim();
      const escTarget = (cleanTarget || target).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(^|[^A-Za-z0-9])(' + escTarget + ')([^A-Za-z0-9]|$)', 'i');
      const match = stem.match(regex);
      if (match) {
        const matchIndex = match.index + match[1].length;
        const wordLen = match[2].length;
        const before = stem.slice(0, matchIndex);
        const word = stem.slice(matchIndex, matchIndex + wordLen);
        const after = stem.slice(matchIndex + wordLen);
        return `${esc(before)}<span class="target-word">${esc(word)}</span>${esc(after)}`;
      }
    }

    return esc(stem);
  };

  /**
   * 3. 4-Level Progressive Disclosure Grammar Hint Popover
   * Menampilkan panduan tata bahasa 4 tingkat:
   * Level 1: Arah Fokus (Conceptual Orientation)
   * Level 2: Aturan Pola (Grammar Rule)
   * Level 3: Waspada Jebakan (Distractor Warning / Trap Avoidance)
   * Level 4: Kunci Pemahaman & Memori (Deep Why + Mnemonic Cue)
   * @param {Object|string} qOrRule Objek pertanyaan atau string rule
   * @param {HTMLElement} anchorEl Elemen jangkar tempat popover akan muncul
   */
  FiezelGrammarUpgrade.showGrammarHint = function(qOrRule, anchorEl) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    let existing = document.getElementById('grammarHintPopover');
    if (existing) {
      // Jika popover sudah ada dan dipanggil kembali, majukan tingkat disclosure atau dismiss jika sudah level 4
      const currentLevel = parseInt(existing.getAttribute('data-level') || '1', 10);
      if (currentLevel < 4) {
        existing.remove();
        return FiezelGrammarUpgrade._renderHintPopover(qOrRule, anchorEl, currentLevel + 1);
      } else {
        existing.remove();
        return;
      }
    }

    FiezelGrammarUpgrade._renderHintPopover(qOrRule, anchorEl, 1);
  };

  FiezelGrammarUpgrade._renderHintPopover = function(qOrRule, anchorEl, initialLevel = 1) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    const q = (typeof qOrRule === 'object' && qOrRule !== null) ? qOrRule : { explain: { rule: String(qOrRule || '') } };
    const exp = q.explain || {};

    const levels = [
      {
        num: 1,
        title: FiezelI18n.t('grammar.hint-level-1', 'Arah Fokus'),
        text: exp.clue || q.pedagogicalObjective || FiezelI18n.t('grammar.hint-fallback', 'Perhatikan subjek kalimat dan penanda waktu untuk menentukan bentuk yang tepat.')
      },
      {
        num: 2,
        title: FiezelI18n.t('grammar.hint-level-2', 'Aturan Pola'),
        text: exp.rule || q.rule || FiezelI18n.t('quiz.fallback-context', 'Gunakan pola bentuk kata kerja yang sesuai dengan subjek.')
      },
      {
        num: 3,
        title: FiezelI18n.t('grammar.hint-level-3', 'Waspada Jebakan'),
        text: exp.avoid || (exp.distractors && exp.distractors.length ? exp.distractors[0].reason : FiezelI18n.t('quiz.fallback-hint-check', 'Hati-hati dengan pilihan pengecoh yang mirip tapi tidak sesuai konteks kalimat.'))
      },
      {
        num: 4,
        title: FiezelI18n.t('grammar.hint-level-4', 'Kunci & Memori'),
        // Audit G8: dulu tingkat ini membuka `explain.why` - kalimat "kenapa jawaban benar itu
        // benar" yang pada ±78% soal menyebut kuncinya, SEBELUM murid menjawab. Kini hanya
        // pegangan ingatan; alasan lengkapnya tetap ada di pembahasan sesudah menjawab.
        text: exp.memory ? `💡 ${exp.memory}` : FiezelI18n.t('quiz.fallback-hint-connect', 'Ingat pola kalimat dan hubungannya dengan subjek.')
      }
    ];

    let currentLvl = Math.max(1, Math.min(4, initialLevel));

    const popover = document.createElement('div');
    popover.id = 'grammarHintPopover';
    popover.className = 'grammar-hint-popover grammar-hint-sheet fade-in';
    popover.setAttribute('data-level', String(currentLvl));
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'true');

    const updateContent = () => {
      popover.setAttribute('data-level', String(currentLvl));
      // Audit G8: tingkat petunjuk tertinggi yang DILIHAT murid dicatat di soal; app.js
      // menuliskannya ke baris riwayat dan meringankan bobot bukti jawaban benar sesudahnya.
      if (typeof qOrRule === 'object' && qOrRule !== null) {
        qOrRule.__hintLevel = Math.max(Number(qOrRule.__hintLevel) || 0, currentLvl);
      }
      const cur = levels[currentLvl - 1];

      popover.innerHTML = `
        <div class="hint-sheet-handle" aria-hidden="true"></div>
        <div class="hint-popover-header">
          <div style="display:flex;align-items:center;gap:6px">
            <i data-lucide="info"></i>
            <strong>${FiezelI18n.t('grammar.petunjuk', 'Petunjuk Tata Bahasa')}</strong>
          </div>
          <span class="hint-level-pill">${currentLvl}/4</span>
          <button type="button" id="hintCloseBtn" class="hint-close-btn" aria-label="${FiezelI18n.t('modal.tutup', 'Tutup')}"><i data-lucide="x"></i></button>
        </div>
        <div class="hint-step-indicator" aria-hidden="true">
          ${[1,2,3,4].map(i => `<div class="hint-step-dot${i <= currentLvl ? ' active' : ''}"></div>`).join('')}
        </div>
        <div class="hint-body">
          <p class="hint-body-title">${esc(cur.title)}</p>
          <p class="hint-body-text">${typeof self.formatRuleForDisplay === 'function' ? self.formatRuleForDisplay(esc(cur.text)) : esc(cur.text)}</p>
        </div>
        <div class="hint-popover-actions">
          ${currentLvl < 4
            ? `<button type="button" class="hint-next-btn" id="hintNextBtn">${FiezelI18n.t('grammar.hint-next', 'Petunjuk Berikutnya')} <i data-lucide="arrow-right"></i></button>`
            : `<button type="button" class="hint-next-btn" id="hintNextBtn"><i data-lucide="check"></i> ${FiezelI18n.t('grammar.hint-close', 'Mengerti')}</button>`
          }
        </div>
      `;

      if (typeof self.enhanceUI === 'function') self.enhanceUI();

      const closeBtn = popover.querySelector('#hintCloseBtn') || popover.querySelector('.hint-close-btn');
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          popover.remove();
        };
      }

      const nextBtn = popover.querySelector('#hintNextBtn');
      if (nextBtn) {
        nextBtn.onclick = (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          if (currentLvl < 4) {
            currentLvl++;
            updateContent();
          } else {
            popover.remove();
          }
        };
      }
    };

    updateContent();
    document.body.appendChild(popover);

    const dismiss = (e) => {
      if (popover.parentNode && !popover.contains(e.target) && (!anchorEl || e.target !== anchorEl)) {
        popover.remove();
        document.removeEventListener('click', dismiss);
        document.removeEventListener('touchstart', dismiss);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', dismiss);
      document.addEventListener('touchstart', dismiss, { passive: true });
    }, 100);
  };

  /**
   * 4. Enhanced Feedback Builder (Non-punitive Bottom Sheet)
   * Membangun HTML umpan balik dengan non-punitive sheet, rule pill, dan AI Explain.
   * @param {Object} q Objek pertanyaan
   * @param {number} j Indeks opsi yang dipilih
   * @param {boolean} ok Status benar/salah
   * @returns {string} Markup HTML
   */
  FiezelGrammarUpgrade.buildFeedbackHTML = function(q, j, ok) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    const pickedOption = q.__userTokenAnswer || (q.options ? q.options[j] : '');
    const correctOption = (q.tokens ? q.tokens.join(' ') : '') || (q.options ? q.options[q.answerIndex] : '');

    const icon = ok ? 'circle-check-big' : 'circle-x';
    const title = ok ? FiezelI18n.t('quiz.verdict-correct', 'Tepat sekali!') : FiezelI18n.t('quiz.verdict-wrong', 'Belum tepat');

    let pickedWhyFails = '';
    if (!ok && (q.type === 'grammar' || q.type === 'video-grammar') && q.explain && Array.isArray(q.explain.distractors)) {
      const dist = q.explain.distractors.find(x => x.option && pickedOption && String(x.option).toLowerCase() === String(pickedOption).toLowerCase());
      pickedWhyFails = dist ? (dist.reason || '').trim() : '';
    }

    const whyText = q.explain && q.explain.why ? esc(q.explain.why) : FiezelI18n.t('quiz.fallback-context', 'Pemakaian bentuk yang tepat.');
    const ruleText = q.explain && q.explain.rule ? esc(q.explain.rule) : '';
    const memoryTip = q.explain && q.explain.memory ? esc(q.explain.memory) : FiezelI18n.t('quiz.fallback-hint-connect', 'Ingat pola kalimatnya.');

    return `
      <div class="feedback-title">
        <i data-lucide="${icon}"></i><b>${title}</b>
      </div>

      <div class="feedback-comparison">
        ${ok
          ? `<p>${FiezelI18n.t('quiz.correct-answer', { answer: `<strong>${esc(pickedOption)}</strong>` })}</p>`
          : `<p class="wrong-pick"><i data-lucide="x"></i> ${FiezelI18n.t('quiz.jawabanmu', 'Jawabanmu:')} <strong>${esc(pickedOption)}</strong></p>
             <p class="correct-pick"><i data-lucide="check"></i> ${FiezelI18n.t('quiz.answer-paling-tepat-adalah', 'Yang benar:')} <strong>${esc(correctOption)}</strong></p>`
        }
      </div>

      ${pickedWhyFails ? `<div class="feedback-your-pick-box"><p><strong>${FiezelI18n.t('quiz.mengapa-salah', 'Mengapa kurang tepat?')}</strong> ${esc(pickedWhyFails)}</p></div>` : ''}

      <div class="feedback-rule-pill grammar-rule-pill">
        <p class="grammar-rule-why"><strong>${FiezelI18n.t('quiz.intinya', 'Intinya:')}</strong> ${whyText}</p>
        ${ruleText ? `<p class="grammar-rule-text"><strong>${FiezelI18n.t('quiz.aturannya', 'Aturannya:')}</strong> ${ruleText}</p>` : ''}
      </div>

      ${(q.contrast || q.explain?.contrast) ? `
      <div class="gx-contrast-card">
        <div class="gx-contrast-title">💡 ${FiezelI18n.t('grammar.contrast-title')}</div>
        <div class="gx-contrast-body">${esc(q.contrast || q.explain?.contrast)}</div>
      </div>` : ''}

      <div class="feedback-memory-box memory-tip">
        <div class="feedback-memory-header">
          <i data-lucide="lightbulb"></i>
          <span class="feedback-memory-kicker">${FiezelI18n.t('quiz.trik-ingat', 'Trik Cepat Ingat')}</span>
        </div>
        <div class="feedback-memory-content">
          ${FiezelGrammarUpgrade.formatMemoryTip ? FiezelGrammarUpgrade.formatMemoryTip(memoryTip) : ('<span>' + memoryTip + '</span>')}
        </div>
      </div>

      <button class="ai-btn" id="aiExplainBtn">
        <i data-lucide="sparkles"></i> ${FiezelI18n.t('quiz.jelaskan-dengan-cara-lebih-sederhana', 'Jelaskan lebih sederhana')}
      </button>
    `;
  };

  /**
   * Helper format tips mengingat: memformat perbandingan rumus (=) menjadi bullet terstruktur
   */
  FiezelGrammarUpgrade.formatMemoryTip = function(txt) {
    if (!txt) return '';
    let s = String(txt).trim();
    s = s.replace(/\b(Trik cepat|Tips cepat|Tips|Trik ingat|Catatan):/gi, '<strong>$1:</strong>');
    return `<span>${s}</span>`;
  };

  /**
   * 5. Mistake Vault Manager
   * Melacak antrean kesalahan grammar dengan SRS queue dan 2-session graduation.
   */
  FiezelGrammarUpgrade.getMistakeCount = function() {
    if (!self.state) return 0;
    if (self.state.mistakeVault && Object.keys(self.state.mistakeVault).length > 0) {
      return Object.keys(self.state.mistakeVault).length;
    }
    // Fallback baca dari riwayat jika mistakeVault belum diinisialisasi
    if (self.state.history && Array.isArray(self.state.history)) {
      const s = new Set();
      self.state.history.slice(-50).forEach(h => {
        if ((h.type === 'grammar' || h.domain === 'grammar') && !h.ok && (h.skill || h.lessonSkill)) {
          s.add(h.skill || h.lessonSkill);
        }
      });
      return s.size;
    }
    return 0;
  };

  FiezelGrammarUpgrade.renderVaultCard = function() {
    const count = this.getMistakeCount();
    if (!count || count <= 0) return '';

    const cardHtml = `
      <div class="row">
        <b><i data-lucide="archive"></i> ${FiezelI18n.t('grammar.mistake-vault-title', 'Koleksi Kesalahan')}</b>
        <span>${count} ${FiezelI18n.t('grammar.mistake-vault-items', 'catatan')}</span>
      </div>
      <p class="muted">
        ${FiezelI18n.t('grammar.mistake-vault-desc-active', 'Latih kembali polanya sampai tuntas 2x sesi.')}
      </p>
      <button onclick="startMistakeVaultSession()" class="primary">
        ${FiezelI18n.t('grammar.mistake-vault-btn', 'Latih Kesalahan')} <i data-lucide="arrow-right"></i>
      </button>
    `;

    return typeof self.card === 'function' ? self.card(cardHtml, 'mistake-vault-card') : `<div class="card mistake-vault-card">${cardHtml}</div>`;
  };

  FiezelGrammarUpgrade.clearMistake = function(skillId) {
    if (!self.state) return;
    if (!self.state.mistakeVault) self.state.mistakeVault = {};
    if (self.state.mistakeVault[skillId]) {
      delete self.state.mistakeVault[skillId];
      if (typeof self.saveState === 'function') self.saveState();
    }
  };

  /**
   * 6. Mastery Tier Calculator
   * Menghitung tingkatan penguasaan dari 1 sampai 4.
   * @param {string} skill ID skill grammar
   * @param {number} [explicitMastery] Nilai mastery opsional
   * @returns {number} Tingkatan penguasaan (1, 2, 3, atau 4)
   */
  FiezelGrammarUpgrade.getMasteryTier = function(skill, explicitMastery) {
    let mastery = 0;
    if (typeof explicitMastery === 'number') {
      mastery = explicitMastery;
    } else if (self.state?.grammar?.[skill]?.mastery) {
      mastery = self.state.grammar[skill].mastery;
    }

    if (mastery < 40) return 1; // Tier 1: Recognition
    if (mastery >= 40 && mastery < 70) return 2; // Tier 2: Practice
    if (mastery >= 70 && mastery < 90) return 3; // Tier 3: Production
    if (mastery >= 90) return 4; // Tier 4: Mastered

    return 1;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelGrammarUpgrade;
  }
  if (typeof self !== 'undefined') {
    self.FiezelGrammarUpgrade = FiezelGrammarUpgrade;
  }

})();
