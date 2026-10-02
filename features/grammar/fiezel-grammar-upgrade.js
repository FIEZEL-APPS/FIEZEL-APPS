/**
 * Fiezel Grammar UI/UX Upgrade Feature Module
 * File: fiezel-grammar-upgrade.js
 * 
 * Modul ini menyediakan antarmuka dan interaksi yang ditingkatkan untuk 
 * fitur Grammar, termasuk latihan pengurutan token, highlight sintaksis, 
 * popover panduan tata bahasa, umpan balik yang diperkaya, kotak kesalahan 
 * (Mistake Vault), dan kalkulator tingkat penguasaan (Mastery Tier).
 */
(function() {
  'use strict';

  const FiezelGrammarUpgrade = {};

  /**
   * 1. Token-Order Exercise Renderer
   * Merender latihan susun kata (token-order) untuk grammar.
   * @param {Object} q Objek pertanyaan (q.tokens, q.distractors, q.correctOrder)
   * @param {Function} onComplete Callback saat pengguna selesai/submit, dipanggil dengan boolean (isCorrect)
   * @returns {HTMLElement} Elemen DOM siap dimasukkan ke dalam kuis
   */
  FiezelGrammarUpgrade.renderTokenOrder = function(q, onComplete) {
    const container = document.createElement('div');
    container.className = 'token-order-container';

    // Gabungkan token benar dan pengecoh, lalu acak
    const tokens = [...(q.tokens || [])];
    const distractors = [...(q.distractors || [])];
    const allTokens = [...tokens, ...distractors];
    
    // Fungsi untuk mengacak array dasar (Fisher-Yates)
    const shuffle = (array) => {
      let currentIndex = array.length, randomIndex;
      while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
    };
    
    const bankTokens = shuffle(allTokens.map((text, id) => ({ text, id })));
    const placedTokens = [];
    
    container.innerHTML = `
      <div class="token-rail" id="tokenRail" aria-label="${FiezelI18n.t('grammar.token-rail-aria', 'Area penyusunan kalimat')}"></div>
      <div class="token-bank" id="tokenBank" aria-label="${FiezelI18n.t('grammar.token-bank-aria', 'Daftar kata tersedia')}"></div>
      <div class="token-actions">
        <button id="tokenSubmitBtn" class="primary" disabled>${FiezelI18n.t('quiz.periksa', 'Periksa')}</button>
      </div>
    `;

    const railEl = container.querySelector('#tokenRail');
    const bankEl = container.querySelector('#tokenBank');
    const submitBtn = container.querySelector('#tokenSubmitBtn');

    const render = () => {
      railEl.innerHTML = '';
      bankEl.innerHTML = '';

      // Render kata di bank
      bankTokens.forEach((token, index) => {
        if (token.placed) {
          const placeholder = document.createElement('div');
          placeholder.className = 'token-chip placeholder';
          bankEl.appendChild(placeholder);
        } else {
          const btn = document.createElement('button');
          btn.className = 'token-chip';
          btn.textContent = token.text;
          btn.onclick = () => {
            if (self.prefersReducedMotion && !self.prefersReducedMotion()) {
              // Animasi ringan bisa ditambahkan di sini via CSS class
            }
            if (typeof self.haptic === 'function') self.haptic('tap');
            if (typeof self.uiSfx === 'function') self.uiSfx('pop');
            token.placed = true;
            placedTokens.push(token);
            render();
          };
          bankEl.appendChild(btn);
        }
      });

      // Render kata di rail (kalimat disusun)
      placedTokens.forEach((token, index) => {
        const btn = document.createElement('button');
        btn.className = 'token-chip placed';
        btn.textContent = token.text;
        btn.onclick = () => {
          if (typeof self.haptic === 'function') self.haptic('tap');
          token.placed = false;
          placedTokens.splice(index, 1);
          render();
        };
        railEl.appendChild(btn);
      });

      submitBtn.disabled = placedTokens.length === 0;
    };

    submitBtn.onclick = () => {
      // Evaluasi kebenaran urutan
      // Asumsi q.correctOrder adalah urutan string atau id yang benar. 
      // Untuk sederhananya, bandingkan string teks yang disusun dengan q.tokens (urutan benar)
      const userText = placedTokens.map(t => t.text).join(' ');
      const correctText = (q.tokens || []).join(' ');
      const isCorrect = userText === correctText;
      
      if (typeof onComplete === 'function') onComplete(isCorrect);
    };

    render();
    if (typeof self.enhanceUI === 'function') self.enhanceUI();
    return container;
  };

  /**
   * 2. Syntax Highlighter
   * Memberikan penandaan sintaks (warna) untuk kalimat sesuai dengan anotasi.
   * @param {string} sentence Kalimat utuh
   * @param {Array} annotations Array objek {word: 'kata', type: 'verb'}
   * @returns {string} String HTML dengan tag span
   */
  FiezelGrammarUpgrade.highlightSyntax = function(sentence, annotations) {
    if (!sentence || !annotations || !Array.isArray(annotations)) return typeof self.esc === 'function' ? self.esc(sentence || '') : (sentence || '');
    
    let result = sentence;
    // Lakukan replace per kata dari anotasi, pastikan menggunakan batas kata
    annotations.forEach(ann => {
      if (ann.word && ann.type) {
        const regex = new RegExp(`\\b(${ann.word})\\b`, 'gi');
        result = result.replace(regex, `<span class="syntax-${ann.type}">$1</span>`);
      }
    });
    
    return result;
  };

  /**
   * 3. Grammar Hint Popover
   * Menampilkan panduan tata bahasa (grammar rule) yang mengambang dekat elemen acuan.
   * @param {string} rule Teks aturan tata bahasa
   * @param {HTMLElement} anchorEl Elemen jangkar tempat popover akan muncul
   */
  FiezelGrammarUpgrade.showGrammarHint = function(rule, anchorEl) {
    // Hapus popover lama jika ada
    let existing = document.getElementById('grammarHintPopover');
    if (existing) existing.remove();

    const popover = document.createElement('div');
    popover.id = 'grammarHintPopover';
    popover.className = 'grammar-hint-popover fade-in';
    
    popover.innerHTML = `
      <div class="popover-arrow"></div>
      <div class="popover-content">
        <div class="popover-header">
          <i data-lucide="info"></i> <strong>${FiezelI18n.t('grammar.petunjuk', 'Petunjuk Tata Bahasa')}</strong>
        </div>
        <p>${typeof self.esc === 'function' ? self.esc(rule) : rule}</p>
      </div>
    `;
    
    document.body.appendChild(popover);
    
    if (typeof self.enhanceUI === 'function') self.enhanceUI();

    // Hitung posisi relatif terhadap elemen anchor
    const rect = anchorEl.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    
    // Posisikan tepat di bawah anchor
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX + (rect.width / 2) - (popoverRect.width / 2);

    // Pastikan tidak keluar dari layar
    if (left < 10) left = 10;
    if (left + popoverRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popoverRect.width - 10;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.position = 'absolute';
    popover.style.zIndex = '1000';

    // Dismiss jika klik di luar popover
    const dismiss = (e) => {
      if (!popover.contains(e.target) && e.target !== anchorEl) {
        popover.remove();
        document.removeEventListener('click', dismiss);
        document.removeEventListener('touchstart', dismiss);
      }
    };
    
    // Sedikit delay agar event klik pemanggil tidak langsung memicu dismiss
    setTimeout(() => {
      document.addEventListener('click', dismiss);
      document.addEventListener('touchstart', dismiss, {passive: true});
    }, 100);
  };

  /**
   * 4. Enhanced Feedback Builder
   * Membangun HTML umpan balik yang lebih kaya.
   * @param {Object} q Objek pertanyaan
   * @param {number} j Indeks opsi yang dipilih
   * @param {boolean} ok Status benar/salah
   * @returns {string} Markup HTML
   */
  FiezelGrammarUpgrade.buildFeedbackHTML = function(q, j, ok) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;
    
    const pickedOption = q.options ? q.options[j] : '';
    const correctOption = q.options ? q.options[q.answerIndex] : '';
    
    const icon = ok ? 'circle-check-big' : 'circle-x';
    const title = ok ? FiezelI18n.t('quiz.verdict-correct', 'Tepat sekali!') : FiezelI18n.t('quiz.verdict-wrong', 'Belum tepat');
    
    // Ambil penjelasan kegagalan untuk pilihan ini (dari q.explain.distractors)
    let pickedWhyFails = '';
    if (!ok && q.type === 'grammar' && q.explain && Array.isArray(q.explain.distractors)) {
      const dist = q.explain.distractors.find(x => x.option && pickedOption && x.option.toLowerCase() === pickedOption.toLowerCase());
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
          ? `<p>${FiezelI18n.t('quiz.correct-answer', 'Jawabanmu benar: ')} <strong>${esc(pickedOption)}</strong></p>`
          : `<p class="wrong-pick"><i data-lucide="x"></i> ${FiezelI18n.t('quiz.jawabanmu', 'Jawabanmu:')} <strong>${esc(pickedOption)}</strong></p>
             <p class="correct-pick"><i data-lucide="check"></i> ${FiezelI18n.t('quiz.answer-paling-tepat-adalah', 'Yang benar:')} <strong>${esc(correctOption)}</strong></p>`
        }
      </div>

      ${pickedWhyFails ? `<div class="feedback-your-pick-box"><p><strong>${FiezelI18n.t('quiz.mengapa-salah', 'Mengapa kurang tepat?')}</strong> ${esc(pickedWhyFails)}</p></div>` : ''}

      <div class="grammar-rule-pill">
        <p class="grammar-rule-why"><strong>${FiezelI18n.t('quiz.intinya', 'Intinya:')}</strong> ${whyText}</p>
        ${ruleText ? `<p class="grammar-rule-text"><strong>${FiezelI18n.t('quiz.aturannya', 'Aturannya:')}</strong> ${ruleText}</p>` : ''}
      </div>

      <p class="memory-tip">
        <i data-lucide="lightbulb"></i>
        <span>${memoryTip}</span>
      </p>

      <button class="ai-btn" id="aiExplainBtn" onclick="if(typeof explainWithAI==='function') explainWithAI(q, j);">
        <i data-lucide="sparkles"></i> ${FiezelI18n.t('quiz.jelaskan-dengan-cara-lebih-sederhana', 'Jelaskan lebih sederhana')}
      </button>
    `;
  };

  /**
   * 5. Mistake Vault Manager
   * Melacak kesalahan grammar dari state history.
   * Kesalahan dihitung dari item grammar (berdasarkan ID skill) yang gagal.
   * Menunggu 2 sesi sukses berbeda untuk menghapus kesalahan.
   */
  FiezelGrammarUpgrade.getMistakeCount = function() {
    if (!self.state || !self.state.history) return 0;
    
    // Heuristik sederhana: ambil history, cari item grammar yang salah dan belum diselesaikan 2x
    // Menggunakan state.mistakeVault jika ada, atau buat on-the-fly dari history.
    if (self.state.mistakeVault) {
      return Object.keys(self.state.mistakeVault).length;
    }
    return 0; // Fallback jika tidak ada tracker eksplisit
  };

  FiezelGrammarUpgrade.renderVaultCard = function() {
    const count = this.getMistakeCount();
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;
    
    const cardHtml = `
      <div class="row">
        <b><i data-lucide="archive"></i> ${FiezelI18n.t('grammar.mistake-vault-title', 'Koleksi Kesalahan')}</b>
        <span>${count} ${FiezelI18n.t('grammar.mistake-vault-items', 'catatan')}</span>
      </div>
      <p class="muted">
        ${count > 0 
          ? FiezelI18n.t('grammar.mistake-vault-desc-active', 'Latih kembali polanya sampai tuntas 2x sesi.') 
          : FiezelI18n.t('grammar.mistake-vault-desc-empty', 'Hebat! Kamu tidak memiliki catatan kesalahan tertunda.')}
      </p>
      ${count > 0 
        ? `<button onclick="startMistakeVaultSession()" class="primary">
             ${FiezelI18n.t('grammar.mistake-vault-btn', 'Latih Kesalahan')} <i data-lucide="arrow-right"></i>
           </button>` 
        : ''}
    `;

    return typeof self.card === 'function' ? self.card(cardHtml, 'mistake-vault-card') : `<div class="card mistake-vault-card">${cardHtml}</div>`;
  };

  FiezelGrammarUpgrade.clearMistake = function(skillId) {
    if (!self.state) return;
    if (!self.state.mistakeVault) self.state.mistakeVault = {};
    if (self.state.mistakeVault[skillId]) {
      delete self.state.mistakeVault[skillId];
      // Panggil fungsi simpan jika ada
      if (typeof self.saveState === 'function') self.saveState();
    }
  };

  /**
   * 6. Mastery Tier Calculator
   * Menghitung tingkatan penguasaan dari 1 sampai 4.
   * @param {string} skill ID skill grammar
   * @returns {number} Tingkatan penguasaan (1, 2, 3, atau 4)
   */
  FiezelGrammarUpgrade.getMasteryTier = function(skill) {
    if (!self.state || !self.state.grammar || !self.state.grammar[skill]) return 1;
    
    const mastery = self.state.grammar[skill].mastery || 0;
    
    if (mastery < 40) return 1; // Tier 1: Recognition
    if (mastery >= 40 && mastery < 70) return 2; // Tier 2: Practice
    if (mastery >= 70 && mastery < 90) return 3; // Tier 3: Production
    if (mastery >= 90) return 4; // Tier 4: Mastered
    
    return 1;
  };

  // Ekspor ke window / self
  self.FiezelGrammarUpgrade = FiezelGrammarUpgrade;

})();
