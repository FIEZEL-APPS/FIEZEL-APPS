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

  // i18n helper — mirrors FiezelI18n.t() when available, falls back to the default string
  function t(key, fallback) {
    if (typeof FiezelI18n !== 'undefined' && typeof FiezelI18n.t === 'function') {
      return FiezelI18n.t(key, fallback);
    }
    return fallback;
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
                  <span><i data-lucide="book"></i> ${t('scaffold.kosakata-prasyarat', lvl.vocabTarget + ' Kosakata Prasyarat')}</span>
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
    setGrammarVocabMap
  };

  // Export to global scope
  global.FiezelGrammarVocabBridge = FiezelGrammarVocabBridge;

  // Support CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelGrammarVocabBridge;
  }
})(typeof window !== 'undefined' ? window : globalThis);
