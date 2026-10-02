/**
 * features/grammar/grammar-vocab-bridge.js
 * 
 * FIEZEL Learning Scaffolding & Pacing Leveling Engine:
 * Connects Vocabulary prerequisite mastery with Grammar Lessons and scales
 * practice session intensity according to 3 pacing tiers:
 * 
 * 1. "Pelajar Santai":  5 VOCAB  -> 10 grammar questions (range: 5-10)
 * 2. "Siswa Teladan":  10 VOCAB  -> 15 grammar questions (range: 10-15)
 * 3. "Super Rajin":    15 VOCAB  -> 20 grammar questions (range: 15-20)
 * 
 * Exports global window.FiezelGrammarVocabBridge for browser and CommonJS module.exports for test runners.
 */
(function(global) {
  'use strict';

  // Standard Fiezel i18n fallback wrapper
  function t(k, fb, params) {
    var s;
    try {
      var I = (typeof self !== 'undefined' ? self : this).FiezelI18n;
      s = I && I.t ? I.t(k, params) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) s = String(s).replace(/\{(\w+)\}/g, function (m, n) {
      return Object.prototype.hasOwnProperty.call(params, n) ? String(params[n]) : m;
    });
    return s;
  }

  // 1. Definition of the 3 Learning Pacing / Intensity Levels
  // String values are resolved lazily via t() so the test can verify zero Indonesian literals.
  const LEARNING_INTENSITY_LEVELS = {
    santai: {
      id: 'santai',
      get name() { return t('scaffold.name-santai', 'Pelajar Santai'); },
      shortName: 'Santai',
      vocabTarget: 5,
      grammarQuestionCount: 10,
      grammarMin: 5,
      grammarMax: 10,
      get badge() { return t('scaffold.badge-santai', '5 Kata · 10 Soal'); },
      icon: 'coffee',
      get description() { return t('scaffold.desc-santai', 'Ritme santai tapi konsisten: 5 kosakata & 10 soal grammar per sesi.'); }
    },
    teladan: {
      id: 'teladan',
      get name() { return t('scaffold.name-teladan', 'Siswa Teladan'); },
      shortName: 'Teladan',
      vocabTarget: 10,
      grammarQuestionCount: 15,
      grammarMin: 10,
      grammarMax: 15,
      get badge() { return t('scaffold.badge-teladan', '10 Kata · 15 Soal'); },
      icon: 'book-open',
      get description() { return t('scaffold.desc-teladan', 'Fokus berimbang: 10 kosakata & 15 soal grammar per sesi.'); }
    },
    rajin: {
      id: 'rajin',
      get name() { return t('scaffold.name-rajin', 'Super Rajin'); },
      shortName: 'Super Rajin',
      vocabTarget: 15,
      grammarQuestionCount: 20,
      grammarMin: 15,
      grammarMax: 20,
      get badge() { return t('scaffold.badge-rajin', '15 Kata · 20 Soal'); },
      icon: 'zap',
      get description() { return t('scaffold.desc-rajin', 'Intensitas maksimal: 15 kosakata & 20 soal grammar per sesi.'); }
    }
  };

  const DEFAULT_INTENSITY = 'santai';

  // Cache for grammar-vocab mapping data
  let _grammarVocabMapCache = null;

  function setGrammarVocabMap(data) {
    if (data && data.lessons) {
      _grammarVocabMapCache = data;
      return true;
    }
    return false;
  }

  function loadGrammarVocabMap() {
    if (_grammarVocabMapCache) return _grammarVocabMapCache;
    
    // In Node.js / test environment
    if (typeof require === 'function' && typeof process !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const root = typeof __fzRoot !== 'undefined' ? __fzRoot : path.join(__dirname, '..', '..');
        const filePath = path.join(root, 'content', 'grammar-vocab-map-v1.json');
        if (fs.existsSync(filePath)) {
          _grammarVocabMapCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return _grammarVocabMapCache;
        }
      } catch (_) {}
    }

    // In Browser environment via fetch
    if (typeof fetch === 'function' && typeof document !== 'undefined') {
      try {
        const url = new URL('content/grammar-vocab-map-v1.json', document.baseURI || location.href);
        fetch(url)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data && data.lessons) {
              _grammarVocabMapCache = data;
              try {
                if (typeof window !== 'undefined' && typeof window.drawTopScreen === 'function') {
                  window.drawTopScreen();
                }
              } catch (_) {}
            }
          })
          .catch(() => {});
      } catch (_) {}
    }

    return null;
  }

  // Pre-load map if synchronous loader is available
  try {
    loadGrammarVocabMap();
  } catch (_) {}

  /**
   * Get the active learning intensity ID ('santai' | 'teladan' | 'rajin')
   * @param {Object} [stateRef] Optional state reference
   * @returns {string}
   */
  function getActiveIntensity(stateRef) {
    const s = stateRef || (typeof state !== 'undefined' ? state : null);
    const pref = s?.preferences?.learningIntensity;
    if (pref && LEARNING_INTENSITY_LEVELS[pref]) {
      return pref;
    }
    return DEFAULT_INTENSITY;
  }

  /**
   * Set and persist learning intensity level
   * @param {string} intensityId 'santai' | 'teladan' | 'rajin'
   * @param {Object} [stateRef] Optional state reference
   * @returns {boolean}
   */
  function setActiveIntensity(intensityId, stateRef) {
    if (!LEARNING_INTENSITY_LEVELS[intensityId]) return false;
    const s = stateRef || (typeof state !== 'undefined' ? state : null);
    if (!s) return false;
    if (!s.preferences) s.preferences = {};
    s.preferences.learningIntensity = intensityId;

    if (typeof save === 'function') {
      try { save(); } catch (_) {}
    }

    if (typeof haptic === 'function') {
      try { haptic('selection'); } catch (_) {}
    }

    // Dispatch UI event for listeners
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('fiezel:intensity-change', {
          detail: { intensity: intensityId, config: LEARNING_INTENSITY_LEVELS[intensityId] }
        }));
      } catch (_) {}
    }

    return true;
  }

  /**
   * Get full configuration object for a given or active intensity
   * @param {string} [intensityId]
   * @param {Object} [stateRef]
   * @returns {Object}
   */
  function getIntensityConfig(intensityId, stateRef) {
    const id = intensityId || getActiveIntensity(stateRef);
    return LEARNING_INTENSITY_LEVELS[id] || LEARNING_INTENSITY_LEVELS[DEFAULT_INTENSITY];
  }

  /**
   * Get vocabulary target count for an intensity level (5, 10, or 15)
   * @param {string} [intensityId]
   * @param {Object} [stateRef]
   * @returns {number}
   */
  function getIntensityVocabTarget(intensityId, stateRef) {
    return getIntensityConfig(intensityId, stateRef).vocabTarget;
  }

  /**
   * Get grammar questions per session for an intensity level (10, 15, or 20)
   * @param {string} [intensityId]
   * @param {Object} [stateRef]
   * @returns {number}
   */
  function getIntensityGrammarCount(intensityId, stateRef) {
    return getIntensityConfig(intensityId, stateRef).grammarQuestionCount;
  }

  /**
   * Retrieve vocabulary items mapped to a specific grammar lesson/skill
   * @param {string} skill Lesson identifier (e.g. 'be_subject_agreement')
   * @param {string} [intensityId] Optional intensity level (defaults to active)
   * @param {Object} [stateRef] Optional state reference
   * @returns {Array<Object>} List of vocab details (up to 5, 10, or 15 items)
   */
  function getVocabForLesson(skill, intensityId, stateRef) {
    const targetCount = getIntensityVocabTarget(intensityId, stateRef);
    const map = loadGrammarVocabMap() || _grammarVocabMapCache;
    
    if (map && map.lessons && map.lessons[skill]) {
      const lessonEntry = map.lessons[skill];
      const details = lessonEntry.vocabDetails || [];
      if (details.length) {
        return details.slice(0, targetCount);
      }
    }

    // Dynamic fallback from global V array if map is loading or skill is dynamic
    if (typeof V !== 'undefined' && Array.isArray(V) && V.length) {
      const meta = typeof GRAMMAR_ITEMS !== 'undefined' && Array.isArray(GRAMMAR_ITEMS)
        ? GRAMMAR_ITEMS.find(x => x.skill === skill)
        : null;
      const level = meta?.level || (typeof getActiveLevel === 'function' ? getActiveLevel() : 'A1');
      const sameLevel = V.filter(v => v.level === level);
      const fallbackList = sameLevel.length >= targetCount ? sameLevel : V;
      return fallbackList.slice(0, targetCount).map(v => ({
        id: v.id,
        word: v.word,
        meaning: v.meaning || (v.meanings?.[0]?.meaning || ''),
        level: v.level,
        partOfSpeech: v.partOfSpeech || 'noun',
        example: v.example || ''
      }));
    }

    return [];
  }

  /**
   * Check vocabulary prerequisite readiness for a grammar lesson
   * @param {string} skill Grammar lesson identifier
   * @param {Object} [stateRef]
   * @returns {Object} { targetCount, masteredCount, studiedCount, isReady, completionRatio, words }
   */
  function getVocabPrerequisiteStatus(skill, stateRef) {
    const s = stateRef || (typeof state !== 'undefined' ? state : null);
    const intensity = getActiveIntensity(s);
    const vocabList = getVocabForLesson(skill, intensity, s);
    const targetCount = vocabList.length;
    
    let masteredCount = 0;
    let studiedCount = 0;
    const wordsWithStatus = vocabList.map(item => {
      const vProgress = s?.vocab?.[item.id];
      const mastery = Number(vProgress?.mastery) || 0;
      const isMastered = mastery >= 60;
      const isStudied = Boolean(vProgress?.attempts || mastery > 0);
      if (isMastered) masteredCount++;
      if (isStudied) studiedCount++;
      return {
        ...item,
        mastery,
        isMastered,
        isStudied,
        status: isMastered ? 'mastered' : (isStudied ? 'learning' : 'new')
      };
    });

    const completionRatio = targetCount > 0 ? (masteredCount / targetCount) : 1;
    // Considered ready if at least 50% mastered or all have been practiced
    const isReady = targetCount === 0 || (masteredCount >= Math.ceil(targetCount * 0.5)) || (studiedCount >= targetCount);

    return {
      skill,
      intensity,
      targetCount,
      masteredCount,
      studiedCount,
      completionRatio,
      isReady,
      words: wordsWithStatus
    };
  }

  /**
   * Start a dedicated Vocabulary Warmup session for a specific grammar lesson
   * @param {string} skill Grammar lesson identifier
   */
  function startGrammarVocabWarmup(skill, options = {}) {
    const s = typeof state !== 'undefined' ? state : null;
    const intensity = getActiveIntensity(s);
    const targetVocabDetails = getVocabForLesson(skill, intensity, s);
    
    if (!targetVocabDetails.length) {
      if (typeof showToast === 'function') {
        showToast(t('scaffold.vocab-siap', 'Kosakata pengantar sedang disiapkan.'), 'warn');
      }
      return;
    }

    // Resolve full vocab items from global V array
    let pool = [];
    if (typeof V !== 'undefined' && Array.isArray(V)) {
      const idSet = new Set(targetVocabDetails.map(d => d.id));
      pool = V.filter(v => idSet.has(v.id));
    }
    if (!pool.length) {
      pool = targetVocabDetails;
    }

    if (typeof quizLoop === 'function') {
      const cfg = getIntensityConfig(intensity, s);
      if (typeof showToast === 'function') {
        showToast(t('scaffold.memulai-warmup', 'Memulai Warmup ' + cfg.name + ': ' + pool.length + ' kosakata'), 'success');
      }
      quizLoop({
        type: 'vocab',
        warmupSkill: skill,
        allowCrossLevel: true,
        count: pool.length,
        pool: pool,
        factory: item => {
          const q = typeof makeVocabQuestion === 'function' ? makeVocabQuestion(item) : { ...item };
          return {
            ...q,
            warmupSkill: skill
          };
        },
        onComplete: (summary) => {
          // Lifecycle hook: result screen retains visibility and offers 'result-return-warmup-btn'
          if (typeof options?.onComplete === 'function') {
            try { options.onComplete(summary); } catch (_) {}
          }
        }
      });
    }
  }

  /**
   * Render interactive Intensity Level Selector (Segmented Pill Control)
   * @param {Object} [options]
   * @returns {string} HTML markup
   */
  function renderIntensitySelector(options = {}) {
    const s = typeof state !== 'undefined' ? state : null;
    const current = getActiveIntensity(s);
    const compact = Boolean(options.compact);
    const onSelectFn = options.onSelect || 'FiezelGrammarVocabBridge.handleIntensitySelect';

    const levels = Object.values(LEARNING_INTENSITY_LEVELS);
    
    return `
      <div class="grammar-intensity-selector${compact ? ' is-compact' : ''}" role="radiogroup" aria-label="${t('scaffold.tingkat-intensitas', 'Tingkat Intensitas Belajar')}">
        <div class="intensity-label-row">
          <span class="intensity-eyebrow">
            <i data-lucide="sliders-horizontal"></i>
            <b>${t('scaffold.intensitas-belajar', 'Intensitas Belajar')}</b>
          </span>
          <span class="intensity-current-badge">${LEARNING_INTENSITY_LEVELS[current]?.badge || ''}</span>
        </div>
        <div class="intensity-pill-group">
          ${levels.map(lvl => {
            const isActive = lvl.id === current;
            return `
              <button type="button"
                role="radio"
                aria-checked="${isActive}"
                class="intensity-pill${isActive ? ' is-active' : ''}"
                data-intensity="${lvl.id}"
                onclick="${onSelectFn}('${lvl.id}')"
                title="${lvl.description}">
                <span class="intensity-pill-dot" aria-hidden="true"></span>
                <span class="intensity-pill-name">${lvl.name}</span>
                <span class="intensity-pill-meta">${lvl.badge}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render the Scaffolding Vocab Warmup Card inside renderGrammarLesson()
   * @param {string} skill Grammar lesson identifier
   * @returns {string} HTML markup
   */
  function renderLessonVocabWarmup(skill) {
    const s = typeof state !== 'undefined' ? state : null;
    const status = getVocabPrerequisiteStatus(skill, s);
    const cfg = getIntensityConfig(status.intensity, s);
    const pct = Math.round(status.completionRatio * 100);

    return `
      <div class="grammar-vocab-scaffold-card">
        <div class="scaffold-header">
          <div class="scaffold-title-group">
            <span class="scaffold-eyebrow">
              <i data-lucide="graduation-cap"></i>
              ${t('scaffold.prasyarat-kosakata', 'Prasyarat Kosakata (' + cfg.name + ')')}
            </span>
            <div class="scaffold-stats">
              <b>${status.masteredCount}/${status.targetCount}</b> ${t('scaffold.kosakata-dikuasai', 'kosakata dikuasai')}
            </div>
          </div>
          <button type="button" class="scaffold-intensity-toggle" onclick="FiezelGrammarVocabBridge.openIntensityModal('${skill}')" title="${t('scaffold.ubah-target', 'Ubah target intensitas')}">
            <span>${cfg.shortName} (${cfg.vocabTarget}V)</span>
            <i data-lucide="chevron-down"></i>
          </button>
        </div>

        <div class="scaffold-pills-row">
          ${Object.values(LEARNING_INTENSITY_LEVELS).map(lvl => {
            const isAct = lvl.id === status.intensity;
            return `
              <button type="button"
                class="scaffold-intensity-pill${isAct ? ' is-active' : ''}"
                onclick="FiezelGrammarVocabBridge.handleIntensitySelect('${lvl.id}', '${skill}')"
                title="${lvl.description}">
                ${lvl.shortName} (${lvl.vocabTarget}V)
              </button>
            `;
          }).join('')}
        </div>

        <div class="scaffold-progress-bar" aria-label="Progress: ${pct}%">
          <div class="scaffold-progress-fill" style="width: ${Math.max(6, pct)}%"></div>
        </div>

        <div class="scaffold-vocab-rail">
          ${status.words.map(w => {
            const statusClass = w.isMastered ? 'is-mastered' : (w.isStudied ? 'is-learning' : 'is-new');
            const icon = w.isMastered ? 'check' : (w.isStudied ? 'clock' : 'circle');
            return `
              <div class="scaffold-vocab-chip ${statusClass}" title="${w.word}: ${w.meaning} (${w.partOfSpeech})">
                <i data-lucide="${icon}" class="chip-icon"></i>
                <span class="chip-word"><b>${w.word}</b></span>
                <span class="chip-meaning">${w.meaning}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="scaffold-actions">
          <button type="button" class="scaffold-warmup-btn primary" onclick="FiezelGrammarVocabBridge.startGrammarVocabWarmup('${skill}')">
            <i data-lucide="sparkles"></i>
            <span>${status.isReady ? t('scaffold.review-kosakata', 'Review Kosakata Lagi') : t('scaffold.pelajari-dulu', 'Pelajari Kosakata Dulu (Warmup)')}</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Modal to switch learning intensity seamlessly from anywhere
   * @param {string} [returnSkill] Optional skill to re-render upon selection
   */
  function openIntensityModal(returnSkill) {
    if (typeof openModal !== 'function') return;
    const s = typeof state !== 'undefined' ? state : null;
    const current = getActiveIntensity(s);

    const html = `
      <div class="modal-intensity-sheet">
        <div class="modal-mark">FIEZEL</div>
        <h2>${t('scaffold.pilih-intensitas', 'Pilih Intensitas Belajar')}</h2>
        <p class="muted">${t('scaffold.pilih-intensitas-desc', 'Sesuaikan jumlah kosakata prasyarat dan soal grammar per sesi sesuai ritme belajarmu.')}</p>
        
        <div class="modal-intensity-options">
          ${Object.values(LEARNING_INTENSITY_LEVELS).map(lvl => {
            const isSel = lvl.id === current;
            return `
              <div class="intensity-option-card${isSel ? ' is-selected' : ''}"
                   onclick="FiezelGrammarVocabBridge.applyIntensityAndClose('${lvl.id}', '${returnSkill || ''}')">
                <div class="option-header">
                  <span class="option-name"><b>${lvl.name}</b></span>
                  <span class="option-badge">${lvl.badge}</span>
                </div>
                <p class="option-desc">${lvl.description}</p>
                <div class="option-specs">
                  <span><i data-lucide="book-open"></i> ${t('scaffold.kosakata-prasyarat', lvl.vocabTarget + ' Kosakata Prasyarat')}</span>
                  <span><i data-lucide="check-circle-2"></i> ${t('scaffold.soal-grammar', lvl.grammarQuestionCount + ' Soal Grammar')}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="modal-actions">
          <button type="button" onclick="closeModal()">${t('scaffold.tutup', 'Tutup')}</button>
        </div>
      </div>
    `;

    openModal(html);
  }

  function handleIntensitySelect(intensityId, returnSkill) {
    setActiveIntensity(intensityId);
    if (typeof showToast === 'function') {
      const cfg = getIntensityConfig(intensityId);
      showToast(t('scaffold.intensitas-diubah', 'Intensitas diubah ke ' + cfg.name + ' (' + cfg.badge + ')'), 'success');
    }
    const scrollY = (typeof window !== 'undefined' && typeof window.scrollY === 'number') ? window.scrollY : 0;
    if (returnSkill && typeof renderGrammarLesson === 'function') {
      renderGrammarLesson(returnSkill);
      if (typeof window !== 'undefined' && scrollY > 0) {
        try { window.scrollTo({ top: scrollY, behavior: 'instant' }); } catch (_) {}
      }
      return;
    }
    if (typeof drawTopScreen === 'function') {
      drawTopScreen();
    } else if (typeof render === 'function') {
      render();
    }
  }

  function applyIntensityAndClose(intensityId, returnSkill) {
    if (typeof closeModal === 'function') {
      closeModal();
    }
    handleIntensitySelect(intensityId, returnSkill);
  }

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#39;');
  }

  function playAudio(w) {
    if (typeof say === 'function') {
      try { say(w); } catch (_) {}
    }
  }

  function playSfx(n) {
    if (typeof uiSfx === 'function') {
      try { uiSfx(n); } catch (_) {}
    }
  }

  function triggerHaptic(n) {
    if (typeof haptic === 'function') {
      try { haptic(n); } catch (_) {}
    }
  }

  /**
   * Check if learner has chosen intensity for the first time
   * @param {Object} [stateRef]
   * @returns {boolean} True if onboarding modal was opened
   */
  function checkFirstTimeIntensity(stateRef) {
    const s = stateRef || (typeof state !== 'undefined' ? state : null);
    if (!s) return false;
    if (!s.preferences) s.preferences = {};
    if (s.preferences.learningIntensityChosen) return false;
    openFirstTimeIntensityModal();
    return true;
  }

  /**
   * Onboarding modal displayed the very first time student accesses Tata Bahasa
   */
  function openFirstTimeIntensityModal() {
    if (typeof openModal !== 'function') return;
    const s = typeof state !== 'undefined' ? state : null;
    const current = getActiveIntensity(s);

    const html = `
      <div class="modal-intensity-sheet first-time-intensity">
        <div class="modal-mark">FIEZEL</div>
        <h2>${t('scaffold.onboarding-title', 'Pilih Ritme Belajarmu')}</h2>
        <p class="muted">${t('scaffold.onboarding-desc', 'Tentukan berapa banyak kosakata kunci yang ingin kamu kuasai per materi grammar.')}</p>
        
        <div class="modal-intensity-options">
          ${Object.values(LEARNING_INTENSITY_LEVELS).map(lvl => {
            const isSel = lvl.id === current;
            return `
              <div class="intensity-option-card${isSel ? ' is-selected' : ''}"
                   onclick="FiezelGrammarVocabBridge.selectFirstTimeIntensity('${lvl.id}')">
                <div class="option-header">
                  <span class="option-name"><b>${lvl.name}</b></span>
                  <span class="option-badge">${lvl.badge}</span>
                </div>
                <p class="option-desc">${lvl.description}</p>
                <div class="option-specs">
                  <span><i data-lucide="book-open"></i> ${t('scaffold.kosakata-prasyarat', lvl.vocabTarget + ' Kosakata Prasyarat')}</span>
                  <span><i data-lucide="check-circle-2"></i> ${t('scaffold.soal-grammar', lvl.grammarQuestionCount + ' Soal Grammar')}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    openModal(html);
  }

  function selectFirstTimeIntensity(intensityId) {
    const s = typeof state !== 'undefined' ? state : null;
    if (s) {
      if (!s.preferences) s.preferences = {};
      s.preferences.learningIntensity = intensityId;
      s.preferences.learningIntensityChosen = true;
      if (typeof save === 'function') {
        try { save(); } catch (_) {}
      }
    }
    if (typeof closeModal === 'function') {
      closeModal();
    }
    if (typeof showToast === 'function') {
      const cfg = getIntensityConfig(intensityId);
      showToast(t('scaffold.intensitas-diubah', 'Intensitas diubah ke ' + cfg.name + ' (' + cfg.badge + ')'), 'success');
    }
    if (typeof drawTopScreen === 'function') {
      drawTopScreen();
    } else if (typeof render === 'function') {
      render();
    }
  }

  /**
   * Gateway sheet shown when student taps a sub-grammar lesson
   * @param {string} skill
   */
  function openLessonPrerequisiteGate(skill) {
    const s = typeof state !== 'undefined' ? state : null;
    const status = getVocabPrerequisiteStatus(skill, s);
    const meta = (typeof GRAMMAR_ITEMS !== 'undefined' && Array.isArray(GRAMMAR_ITEMS))
      ? GRAMMAR_ITEMS.find(x => x.skill === skill)
      : null;
    const lessonTitle = meta ? (meta.title || meta.skill) : skill;

    const html = `
      <div class="lesson-prereq-gateway-sheet">
        <div class="gateway-header">
          <span class="gateway-badge"><i data-lucide="sparkles"></i> ${t('scaffold.gateway-title', 'Hafal Dulu Kosakata Ini!')}</span>
          <h2>${esc(lessonTitle)}</h2>
          <p class="muted">${t('scaffold.gateway-subtitle', 'Setelah kamu menghafalnya, latihan grammar otomatis terbuka!')}</p>
        </div>

        <div class="gateway-vocab-grid">
          ${status.words.map(w => `
            <div class="gateway-vocab-card">
              <div class="gw-word-top">
                <span class="gw-word"><b>${esc(w.word)}</b></span>
                <button type="button" class="gw-audio-btn" onclick="FiezelGrammarVocabBridge.playVocabAudio('${esc(w.word)}')" aria-label="Audio ${esc(w.word)}">
                  <i data-lucide="volume-2"></i>
                </button>
              </div>
              <div class="gw-meaning">${esc(w.meaning.split(';')[0].trim())}</div>
            </div>
          `).join('')}
        </div>

        <div class="gateway-actions">
          <button type="button" class="gateway-btn primary" onclick="FiezelGrammarVocabBridge.startVocabMiniGame('${skill}')">
            <i data-lucide="play"></i>
            <span>${t('scaffold.btn-start-game', 'Mulai Mini Game Seru 🎮')}</span>
          </button>
        </div>
      </div>
    `;

    if (typeof openModal === 'function') {
      openModal(html);
    }
  }

  function skipToGrammar(skill) {
    if (typeof closeModal === 'function') {
      closeModal();
    }
    const s = typeof state !== 'undefined' ? state : null;
    if (s) {
      if (!s.grammar) s.grammar = {};
      if (!s.grammar[skill]) s.grammar[skill] = {};
      s.grammar[skill].vocabReady = true;
      if (typeof save === 'function') {
        try { save(); } catch (_) {}
      }
    }
    if (typeof enterStage === 'function' && typeof renderGrammarLesson === 'function') {
      enterStage('grammar-lesson', () => renderGrammarLesson(skill));
      renderGrammarLesson(skill);
    } else if (typeof practiceSkill === 'function') {
      practiceSkill(skill);
    }
  }

  function playVocabAudio(word) {
    playAudio(word);
    playSfx('tap');
  }

  // Active Mini-Game Session State
  let _activeMiniGame = null;

  /**
   * Start the micro-interactive mini-game for a grammar lesson
   * @param {string} skill
   */
  function startVocabMiniGame(skill) {
    const s = typeof state !== 'undefined' ? state : null;
    const status = getVocabPrerequisiteStatus(skill, s);
    const words = status.words.slice(0, status.targetCount);

    if (!words.length) {
      completeMiniGameAndUnlock(skill);
      return;
    }

    // Prepare matching game arrays for Round 1
    const enCards = words.map(w => ({ id: w.id, text: w.word, word: w.word }));
    const idCards = words.map(w => ({ id: w.id, text: w.meaning.split(';')[0].trim(), word: w.word }));

    // Shuffle Indonesian cards
    for (let i = idCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idCards[i], idCards[j]] = [idCards[j], idCards[i]];
    }

    // Prepare Round 2: Rapid ABCD Meaning Questions (e.g., body -> A. tangan, B. mulut, C. kaki, D. badan)
    const allPoolFallback = (typeof V !== 'undefined' && Array.isArray(V)) ? V : words;
    const rapidWords = words.slice(0, Math.min(4, words.length));
    const rapidQuestions = rapidWords.map(w => {
      const correctMeaning = w.meaning.split(';')[0].trim();
      const distractors = getSemanticMeaningDistractors(w, words.concat(allPoolFallback), 3);
      const choices = [correctMeaning, ...distractors];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      return {
        id: w.id,
        word: w.word,
        phonetic: w.phonetic || '',
        correctMeaning,
        options: choices
      };
    });

    _activeMiniGame = {
      skill,
      words,
      round: 1, // 1: Bubble Snap (Match), 2: Rapid Meaning ABCD, 3: Sentence Puzzle, 4: Auto-Unlock
      combo: 0,
      matchedIds: new Set(),
      selectedEn: null,
      selectedId: null,
      enCards,
      idCards,
      // Round 2 state
      rapidQuestions,
      rapidIndex: 0,
      rapidSelected: null,
      rapidIsCorrect: null,
      // Round 3 Puzzle state
      puzzleIndex: 0,
      placedTokens: []
    };

    renderMiniGameModal();
  }

  function renderMiniGameModal() {
    if (!_activeMiniGame) return;
    if (typeof openModal !== 'function') return;

    const g = _activeMiniGame;
    let stageHtml = '';

    if (g.round === 1) {
      // Round 1: Bubble Snap / Card Connect (Word-to-Meaning Match)
      stageHtml = `
        <div class="mini-game-round round-1">
          <div class="mini-game-header">
            <span class="game-badge"><i data-lucide="sparkles"></i> Round 1: ${t('scaffold.game-round1-title', 'Cocokkan Kata & Artinya')}</span>
            <span class="game-combo-pill" id="gameComboPill">${g.combo > 1 ? t('scaffold.game-combo', 'Kombo x' + g.combo + '! 🔥') : ''}</span>
          </div>
          <p class="game-instruction">${t('scaffold.game-round1-desc', 'Ketuk kata bahasa Inggris lalu ketuk artinya yang pas!')}</p>

          <div class="match-game-board">
            <div class="match-col en-col">
              ${g.enCards.map(item => {
                const isMatched = g.matchedIds.has(item.id);
                const isSel = g.selectedEn === item.id;
                return `
                  <button type="button" 
                          class="match-card en-card${isMatched ? ' is-matched' : ''}${isSel ? ' is-selected' : ''}" 
                          ${isMatched ? 'disabled' : ''}
                          onclick="FiezelGrammarVocabBridge.handleCardClick('${item.id}', 'en')">
                    <b>${esc(item.text)}</b>
                    <i data-lucide="volume-2" class="match-sound-icon"></i>
                  </button>
                `;
              }).join('')}
            </div>

            <div class="match-col id-col">
              ${g.idCards.map(item => {
                const isMatched = g.matchedIds.has(item.id);
                const isSel = g.selectedId === item.id;
                return `
                  <button type="button" 
                          class="match-card id-card${isMatched ? ' is-matched' : ''}${isSel ? ' is-selected' : ''}" 
                          ${isMatched ? 'disabled' : ''}
                          onclick="FiezelGrammarVocabBridge.handleCardClick('${item.id}', 'id')">
                    <span>${esc(item.text)}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (g.round === 2) {
      // Round 2: Rapid-Fire Meaning Challenge (ABCD)
      const q = g.rapidQuestions[g.rapidIndex] || g.rapidQuestions[0];
      stageHtml = `
        <div class="mini-game-round round-rapid">
          <div class="mini-game-header">
            <span class="game-badge"><i data-lucide="sparkles"></i> Round 2: ${t('scaffold.game-round2-rapid-title', 'Tebak Arti Kilat')}</span>
            <span class="game-combo-pill">${g.combo > 1 ? t('scaffold.game-combo', 'Kombo x' + g.combo + '! 🔥') : ''}</span>
            <span class="game-progress-tag">${g.rapidIndex + 1}/${g.rapidQuestions.length}</span>
          </div>
          <p class="game-instruction">${t('scaffold.game-round2-rapid-desc', 'Pilih arti kata bahasa Inggris di bawah ini dengan cepat!')}</p>

          <div class="rapid-word-card">
            <div class="rapid-word-banner">
              <h2 class="rapid-target-word">${esc(q.word)}</h2>
              <button type="button" class="rapid-audio-btn" onclick="FiezelGrammarVocabBridge.playVocabAudio('${esc(q.word)}')" aria-label="Audio ${esc(q.word)}">
                <i data-lucide="volume-2"></i>
              </button>
            </div>
            ${q.phonetic ? `<div class="rapid-phonetic">${esc(q.phonetic)}</div>` : ''}
          </div>

          <div class="rapid-options-grid">
            ${q.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx] || String(idx + 1);
              let stateClass = '';
              if (g.rapidSelected === opt) {
                stateClass = g.rapidIsCorrect ? ' is-correct' : ' is-wrong';
              }
              return `
                <button type="button" class="rapid-choice-btn${stateClass}" onclick="FiezelGrammarVocabBridge.handleRapidChoice('${esc(opt)}')">
                  <span class="choice-letter">${letter}</span>
                  <span class="choice-text">${esc(opt)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if (g.round === 3) {
      // Round 3: Micro Sentence Puzzle with Grammar Clue
      const word = g.words[g.puzzleIndex] || g.words[0];
      const targetSentence = word.example || ('Please use your ' + word.word + '.');
      if (!g.cachedTokens || g.cachedWord !== word.word) {
        const tokens = targetSentence.replace(/[.!?]/g, '').split(/\s+/).filter(Boolean);
        const shuffled = [...tokens];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        g.cachedTokens = tokens;
        g.cachedShuffledTokens = shuffled;
        g.cachedWord = word.word;
      }
      const tokens = g.cachedTokens;
      const shuffledTokens = g.cachedShuffledTokens;

      const meta = (typeof GRAMMAR_ITEMS !== 'undefined' && Array.isArray(GRAMMAR_ITEMS))
        ? GRAMMAR_ITEMS.find(x => x.skill === g.skill)
        : null;
      const grammarRuleText = meta ? (meta.title || meta.skill) : 'Pola Tata Bahasa';

      stageHtml = `
        <div class="mini-game-round round-3-puzzle">
          <div class="mini-game-header">
            <span class="game-badge"><i data-lucide="sparkles"></i> Round 3: ${t('scaffold.game-round3-title', 'Susun Kalimat Tata Bahasa')}</span>
            <span class="game-progress-tag">${g.puzzleIndex + 1}/${Math.min(2, g.words.length)}</span>
          </div>
          <p class="game-instruction">${t('scaffold.game-round3-desc', 'Susun kepingan kata menjadi kalimat yang tepat sesuai aturan grammar!')}</p>

          <div class="puzzle-grammar-cue">
            <i data-lucide="lightbulb"></i>
            <span><b>${t('scaffold.fokus-tata-bahasa', 'Aturan Grammar')}:</b> ${esc(grammarRuleText)}</span>
          </div>

          <div class="puzzle-clue-card">
            <span class="clue-label">${t('scaffold.fokus-kata', 'Fokus Kata: {word} ({meaning})', { word: word.word, meaning: word.meaning.split(';')[0].trim() })}</span>
          </div>

          <div class="puzzle-sentence-stage" id="puzzleSentenceStage">
            <div class="puzzle-slot-line" id="puzzleSlotLine">
              ${g.placedTokens.map((tok, idx) => `
                <button type="button" class="puzzle-placed-chip" onclick="FiezelGrammarVocabBridge.removePuzzleToken(${idx})">
                  ${esc(tok)}
                </button>
              `).join('')}
              ${g.placedTokens.length === 0 ? '<span class="puzzle-empty-hint">' + t('scaffold.hint-ketuk-keping', 'Ketuk keping di bawah...') + '</span>' : ''}
            </div>
          </div>

          <div class="puzzle-bank-tiles">
            ${shuffledTokens.map(tok => {
              const usedCount = g.placedTokens.filter(t => t === tok).length;
              const totalInTokens = tokens.filter(t => t === tok).length;
              const isUsed = usedCount >= totalInTokens;
              return `
                <button type="button" 
                        class="puzzle-tile${isUsed ? ' is-used' : ''}" 
                        ${isUsed ? 'disabled' : ''}
                        onclick="FiezelGrammarVocabBridge.addPuzzleToken('${esc(tok)}')">
                  ${esc(tok)}
                </button>
              `;
            }).join('')}
          </div>

          <div class="puzzle-actions">
            <button type="button" class="puzzle-submit-btn" onclick="FiezelGrammarVocabBridge.checkSentencePuzzle()">
              <i data-lucide="check-circle-2"></i>
              <span>${t('scaffold.btn-periksa-kalimat', 'Periksa Kalimat')}</span>
            </button>
          </div>
        </div>
      `;
    } else if (g.round === 4) {
      // Round 4: Victory Celebration & Automatic Auto-Unlock into Grammar Practice
      stageHtml = `
        <div class="mini-game-round round-4-unlocked">
          <div class="unlock-animation-box">
            <div class="unlock-trophy-ring">
              <i data-lucide="sparkles"></i>
            </div>
            <h2>${t('scaffold.game-unlocked-title', 'Luar Biasa! Kosakata Terhafal Sempurna 🎉')}</h2>
            <p class="muted">${t('scaffold.game-unlocked-desc', 'Latihan soal grammar otomatis terbuka untukmu...')}</p>

            <div class="unlock-progress-fill">
              <div class="fill-bar"></div>
            </div>

            <button type="button" class="enter-grammar-btn primary" onclick="FiezelGrammarVocabBridge.completeMiniGameAndUnlock('${g.skill}')">
              <i data-lucide="play"></i>
              <span>${t('scaffold.btn-enter-grammar', 'Masuk ke Latihan Grammar 🚀')}</span>
            </button>
          </div>
        </div>
      `;
    }

    const html = `
      <div class="modal-mini-game-sheet">
        <div class="mini-game-nav">
          <span class="game-brand">FIEZEL QUEST</span>
          <button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup">
            <i data-lucide="x"></i>
          </button>
        </div>
        ${stageHtml}
      </div>
    `;

    openModal(html);

    if (g.round === 4) {
      // Auto-unlock transition after 1.4 seconds
      setTimeout(() => {
        if (_activeMiniGame && _activeMiniGame.round === 4 && _activeMiniGame.skill === g.skill) {
          completeMiniGameAndUnlock(g.skill);
        }
      }, 1400);
    }
  }

  function handleCardClick(id, type) {
    if (!_activeMiniGame || _activeMiniGame.round !== 1) return;
    const g = _activeMiniGame;

    if (type === 'en') {
      g.selectedEn = id;
      const wordObj = g.words.find(w => w.id === id);
      if (wordObj) playAudio(wordObj.word);
      playSfx('tap');
      triggerHaptic('selection');
    } else if (type === 'id') {
      g.selectedId = id;
      playSfx('tap');
    }

    // Check if both selected
    if (g.selectedEn && g.selectedId) {
      if (g.selectedEn === g.selectedId) {
        // MATCH!
        g.matchedIds.add(g.selectedEn);
        g.combo++;
        playSfx('success');
        triggerHaptic('medium');
        g.selectedEn = null;
        g.selectedId = null;

        // Check completion of Round 1
        if (g.matchedIds.size >= g.words.length) {
          playSfx('levelup');
          setTimeout(() => {
            if (_activeMiniGame) {
              _activeMiniGame.round = 2; // Move to Rapid Meaning Challenge
              _activeMiniGame.rapidIndex = 0;
              _activeMiniGame.rapidSelected = null;
              _activeMiniGame.rapidIsCorrect = null;
              renderMiniGameModal();
            }
          }, 500);
          return;
        }
      } else {
        // MISMATCH
        g.combo = 0;
        playSfx('error');
        triggerHaptic('light');
        g.selectedEn = null;
        g.selectedId = null;
      }
    }

    renderMiniGameModal();
  }

  function handleRapidChoice(chosen) {
    if (!_activeMiniGame || _activeMiniGame.round !== 2) return;
    const g = _activeMiniGame;
    const q = g.rapidQuestions[g.rapidIndex];
    if (!q) return;

    g.rapidSelected = chosen;
    if (chosen === q.correctMeaning) {
      g.rapidIsCorrect = true;
      g.combo++;
      playSfx('success');
      triggerHaptic('medium');
      playAudio(q.word);
      renderMiniGameModal();

      setTimeout(() => {
        if (!_activeMiniGame || _activeMiniGame.round !== 2) return;
        _activeMiniGame.rapidSelected = null;
        _activeMiniGame.rapidIsCorrect = null;
        _activeMiniGame.rapidIndex++;

        if (_activeMiniGame.rapidIndex >= _activeMiniGame.rapidQuestions.length) {
          // Advance to Round 3 (Sentence Puzzle)
          _activeMiniGame.round = 3;
          _activeMiniGame.puzzleIndex = 0;
          _activeMiniGame.placedTokens = [];
          playSfx('levelup');
          renderMiniGameModal();
        } else {
          renderMiniGameModal();
        }
      }, 420);
    } else {
      g.rapidIsCorrect = false;
      g.combo = 0;
      playSfx('error');
      triggerHaptic('light');
      renderMiniGameModal();
      setTimeout(() => {
        if (!_activeMiniGame || _activeMiniGame.round !== 2) return;
        _activeMiniGame.rapidSelected = null;
        _activeMiniGame.rapidIsCorrect = null;
        renderMiniGameModal();
      }, 600);
    }
  }

  function addPuzzleToken(tok) {
    if (!_activeMiniGame || _activeMiniGame.round !== 3) return;
    _activeMiniGame.placedTokens.push(tok);
    playSfx('tap');
    renderMiniGameModal();
  }

  function removePuzzleToken(idx) {
    if (!_activeMiniGame || _activeMiniGame.round !== 3) return;
    _activeMiniGame.placedTokens.splice(idx, 1);
    playSfx('tap');
    renderMiniGameModal();
  }

  function checkSentencePuzzle() {
    if (!_activeMiniGame || _activeMiniGame.round !== 3) return;
    const g = _activeMiniGame;
    const word = g.words[g.puzzleIndex] || g.words[0];
    const targetSentence = word.example || ('Please use your ' + word.word + '.');
    const targetTokens = targetSentence.replace(/[.!?]/g, '').split(/\s+/).filter(Boolean);

    const userSentence = g.placedTokens.join(' ').toLowerCase();
    const expectedSentence = targetTokens.join(' ').toLowerCase();

    if (userSentence === expectedSentence || g.placedTokens.length >= targetTokens.length) {
      // Puzzle correct or advanced
      playSfx('success');
      playAudio(targetSentence);
      g.puzzleIndex++;
      g.placedTokens = [];

      const maxPuzzles = Math.min(2, g.words.length);
      if (g.puzzleIndex >= maxPuzzles) {
        // Round 3 completed -> Move to Round 4 (Celebration & Auto-Unlock!)
        g.round = 4;
        playSfx('levelup');
        renderMiniGameModal();
      } else {
        renderMiniGameModal();
      }
    } else {
      playSfx('error');
      if (typeof showToast === 'function') {
        showToast(t('scaffold.toast-urutan-salah', 'Coba periksa urutan katanya lagi ya!'), 'warn');
      }
    }
  }

  function completeMiniGameAndUnlock(skill) {
    _activeMiniGame = null;
    const s = typeof state !== 'undefined' ? state : null;
    if (s) {
      if (!s.grammar) s.grammar = {};
      if (!s.grammar[skill]) s.grammar[skill] = {};
      s.grammar[skill].vocabReady = true;
      if (typeof save === 'function') {
        try { save(); } catch (_) {}
      }
    }

    if (typeof closeModal === 'function') {
      closeModal();
    }

    if (typeof showToast === 'function') {
      showToast(t('scaffold.toast-vocab-terkuasai', 'Kosakata Terkuasai! Membuka Latihan Grammar...'), 'success');
    }

    // Launch grammar practice
    if (typeof practiceSkill === 'function') {
      practiceSkill(skill);
    } else if (typeof renderGrammarLesson === 'function') {
      renderGrammarLesson(skill);
    }
  }

  /**
   * Helper to get pure semantic meaning distractors without part-of-speech labels
   */
  function getSemanticMeaningDistractors(targetWord, allPool, count = 3) {
    const targetMeaning = String(targetWord?.meaning || '').split(';')[0].trim().toLowerCase();
    const otherMeanings = (allPool || [])
      .filter(w => w.word !== targetWord.word && w.meaning)
      .map(w => String(w.meaning).split(';')[0].trim().toLowerCase())
      .filter(m => m !== targetMeaning && m.length > 1 && !/^(kata\s+|noun|verb|adjective|kata benda|kata kerja|kata seru)/i.test(m));

    const unique = [...new Set(otherMeanings)];
    const shuffled = [...unique];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const chosen = shuffled.slice(0, count);

    const fallbacks = ['tangan', 'mulut', 'kaki', 'rumah', 'jalan', 'buku', 'teman', 'hari', 'makan', 'minum'];
    while (chosen.length < count) {
      const fb = fallbacks[chosen.length % fallbacks.length];
      if (fb !== targetMeaning && !chosen.includes(fb)) chosen.push(fb);
    }

    return chosen;
  }

  // Public Interface
  const FiezelGrammarVocabBridge = {
    LEVELS: LEARNING_INTENSITY_LEVELS,
    DEFAULT_INTENSITY,
    getActiveIntensity,
    setActiveIntensity,
    getIntensityConfig,
    getIntensityVocabTarget,
    getIntensityGrammarCount,
    getVocabForLesson,
    getVocabPrerequisiteStatus,
    startGrammarVocabWarmup,
    renderIntensitySelector,
    renderLessonVocabWarmup,
    openIntensityModal,
    handleIntensitySelect,
    applyIntensityAndClose,
    loadGrammarVocabMap,
    setGrammarVocabMap,
    checkFirstTimeIntensity,
    openFirstTimeIntensityModal,
    selectFirstTimeIntensity,
    openLessonPrerequisiteGate,
    skipToGrammar,
    playVocabAudio,
    startVocabMiniGame,
    renderMiniGameModal,
    handleCardClick,
    handleRapidChoice,
    addPuzzleToken,
    removePuzzleToken,
    checkSentencePuzzle,
    completeMiniGameAndUnlock,
    getSemanticMeaningDistractors,
    getActiveMiniGame: () => _activeMiniGame
  };

  // Export to global scope
  global.FiezelGrammarVocabBridge = FiezelGrammarVocabBridge;

  // Support CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelGrammarVocabBridge;
  }
})(typeof window !== 'undefined' ? window : globalThis);
