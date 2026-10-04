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
   * Cari kalimat latihan yang benar-benar memadukan kata kunci dengan pola grammar aktif
   */
  function getAlignedSentenceForPuzzle(skill, wordObj) {
    if (!wordObj) return 'Please use your words.';
    const w = String(wordObj.word || '').toLowerCase();
    
    // Coba cari dari bank soal grammar aktif (G atau GRAMMAR_ITEMS)
    if (typeof G !== 'undefined' && G && G[skill] && Array.isArray(G[skill])) {
      for (const item of G[skill]) {
        // item[0] adalah stem kalimat, misal: "My cat ___ very small." atau "They ___ at home today."
        const stem = String(item[0] || '');
        const correctOpt = Array.isArray(item[1]) && Number.isInteger(item[2]) ? item[1][item[2]] : '';
        if (stem && correctOpt && stem.includes('___')) {
          const filled = stem.replace('___', correctOpt).replace(/[.!?]/g, '').trim();
          const tokens = filled.split(/\s+/);
          // Cek apakah kalimat soal memuat kata kosakata ini
          const matchWord = tokens.some(tok => tok.toLowerCase().replace(/[^a-z]/g, '') === w);
          if (matchWord && tokens.length <= 7) {
            return filled + '.';
          }
        }
      }
    }

    // Jika tidak ditemukan kecocokan persis di bank grammar aktif, periksa apakah word.example ringkas
    if (wordObj.example && typeof wordObj.example === 'string') {
      const exClean = wordObj.example.trim();
      const exTokens = exClean.replace(/[.!?]/g, '').trim().split(/\s+/).filter(Boolean);
      // Gunakan kalimat contoh kamus bila ringkas (<= 7 kata) dan utuh
      if (exTokens.length >= 3 && exTokens.length <= 7) {
        return /[.!?]$/.test(exClean) ? exClean : exClean + '.';
      }
    }

    return 'We study ' + wordObj.word + ' here.';
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
        /* Audit UX grammar U6: arti di peta ini hanya berbahasa Indonesia. V sudah ditimpa arti
           sesuai locale (vocabForLocale di app.js), jadi murid Thai membaca arti Thai. */
        const bank = (typeof V !== 'undefined' && Array.isArray(V)) ? V : [];
        return details.slice(0, targetCount).map(d => {
          const v = bank.find(x => x && x.id === d.id);
          return v && v.meaning ? Object.assign({}, d, { meaning: v.meaning }) : d;
        });
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
   * Braincore Telemetry: Catat bukti penguasaan kosakata ke BKT dan state.vocab
   */
  function recordVocabMastery(word, ok, latency = 2000) {
    if (!word) return;
    const s = typeof state !== 'undefined' ? state : null;
    if (typeof updateMastery === 'function') {
      try { updateMastery('vocab', word, ok, latency); } catch (_) {}
    } else if (s) {
      if (!s.vocab) s.vocab = {};
      if (!s.vocab[word]) s.vocab[word] = { correct: 0, total: 0, mastery: 0, streak: 0 };
      const v = s.vocab[word];
      v.total = (v.total || 0) + 1;
      if (ok) {
        v.correct = (v.correct || 0) + 1;
        v.streak = (v.streak || 0) + 1;
        v.mastery = Math.min(100, (v.mastery || 0) + 20);
      } else {
        v.streak = 0;
        v.mastery = Math.max(0, (v.mastery || 0) - 10);
      }
    }

    // Sambungkan ke Braincore BKT Engine
    try {
      const root = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : global);
      if (root && root.FiezelMasteryBKT && typeof bktRead === 'function' && typeof bktWrite === 'function') {
        const bktSt = bktRead();
        const updated = root.FiezelMasteryBKT.update(bktSt, {
          lesson: 'vocab_' + word,
          correct: !!ok,
          weight: ok ? 1.0 : 0.8
        }, Date.now());
        bktWrite(updated);
      }
    } catch (_) {}
  }

  /**
   * Braincore Telemetry: Catat bukti penguasaan grammar ke BKT dan state.grammar
   */
  function recordGrammarMastery(skill, ok, latency = 3500) {
    if (!skill) return;
    if (typeof updateMastery === 'function') {
      try { updateMastery('grammar', skill, ok, latency); } catch (_) {}
    }
    if (typeof bktRecord === 'function') {
      try { bktRecord({ lessonSkill: skill, skill: skill }, ok, 1.0, 1.2); } catch (_) {}
    }
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
      const vProgress = s?.vocab?.[item.word] || s?.vocab?.[item.id];
      let mastery = Number(vProgress?.mastery) || 0;

      // Integrasi ke Braincore BKT bila data tersedia
      try {
        const root = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : global);
        if (root && root.FiezelMasteryBKT && typeof bktRead === 'function') {
          const bktSt = bktRead();
          if (bktSt && bktSt.lessons) {
            const bktWord = root.FiezelMasteryBKT.readLesson ? root.FiezelMasteryBKT.readLesson(bktSt.lessons, 'vocab_' + item.word) : null;
            if (bktWord && bktWord.L > 0) {
              mastery = Math.max(mastery, Math.round(bktWord.L * 100));
            }
          }
        }
      } catch (_) {}

      const isMastered = mastery >= 60;
      const isStudied = Boolean(vProgress?.attempts || vProgress?.total || mastery > 0);
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
              ${t('scaffold.prasyarat-kosakata', 'Prasyarat Kosakata (' + cfg.name + ')', { name: cfg.name })}
            </span>
            <div class="scaffold-stats">
              <b>${status.masteredCount}/${status.targetCount}</b> ${t('scaffold.kosakata-dikuasai', 'kosakata dikuasai', { mastered: status.masteredCount, total: status.targetCount })}
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
                  <span><i data-lucide="book-open"></i> ${t('scaffold.kosakata-prasyarat', lvl.vocabTarget + ' Kosakata Prasyarat', { count: lvl.vocabTarget })}</span>
                  <span><i data-lucide="check-circle-2"></i> ${t('scaffold.soal-grammar', lvl.grammarQuestionCount + ' Soal Grammar', { count: lvl.grammarQuestionCount })}</span>
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
      showToast(t('scaffold.intensitas-diubah', 'Intensitas diubah ke ' + cfg.name + ' (' + cfg.badge + ')', { name: cfg.name, badge: cfg.badge }), 'success');
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
                  <span><i data-lucide="book-open"></i> ${t('scaffold.kosakata-prasyarat', lvl.vocabTarget + ' Kosakata Prasyarat', { count: lvl.vocabTarget })}</span>
                  <span><i data-lucide="check-circle-2"></i> ${t('scaffold.soal-grammar', lvl.grammarQuestionCount + ' Soal Grammar', { count: lvl.grammarQuestionCount })}</span>
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
      showToast(t('scaffold.intensitas-diubah', 'Intensitas diubah ke ' + cfg.name + ' (' + cfg.badge + ')', { name: cfg.name, badge: cfg.badge }), 'success');
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

    // Smart Braincore Bypass: Jika kosakata prasyarat SUDAH dikuasai menurut BKT/OLM
    if (status.isReady || (s?.grammar?.[skill]?.vocabReady)) {
      if (s) {
        if (!s.grammar) s.grammar = {};
        if (!s.grammar[skill]) s.grammar[skill] = {};
        s.grammar[skill].vocabReady = true;
        if (typeof save === 'function') { try { save(); } catch (_) {} }
      }
      if (typeof enterStage === 'function' && typeof renderGrammarLesson === 'function') {
        enterStage('grammar-lesson', () => renderGrammarLesson(skill));
        renderGrammarLesson(skill);
      } else if (typeof practiceSkill === 'function') {
        practiceSkill(skill);
      }
      return;
    }

    const meta = (typeof GRAMMAR_ITEMS !== 'undefined' && Array.isArray(GRAMMAR_ITEMS))
      ? GRAMMAR_ITEMS.find(x => x.skill === skill)
      : null;
    const lessonTitle = meta ? (meta.title || meta.skill) : skill;

    const html = `
      <div class="lesson-prereq-gateway-sheet">
        <div class="gateway-header">
          <span class="gateway-badge"><i data-lucide="sparkles"></i> ${t('scaffold.gateway-title', 'Hafal Dulu Kosakata Ini!')}</span>
          <h2>${esc(lessonTitle)}</h2>
          <p class="muted">${t('scaffold.gateway-subtitle', 'Setelah kamu menghafalnya, latihan grammar otomatis terbuka!', { count: status.targetCount || (status.words ? status.words.length : 5) })}</p>
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
      round: 1, // 1: Match, 2: Sentence Puzzle, 3: Victory Scorecard
      combo: 0,
      bestCombo: 0,
      matchedIds: new Set(),
      selectedEn: null,
      selectedId: null,
      enCards,
      idCards,
      // Sentence puzzle state
      puzzleIndex: 0,
      placedTokens: [],
      hintRequested: false,
      puzzleFeedback: null
    };

    renderMiniGameModal();
  }

  function renderMiniGameModal() {
    if (!_activeMiniGame) return;
    if (typeof openModal !== 'function') return;

    const g = _activeMiniGame;
    let stageHtml = '';
    const currentRound = (g.round === 3 || g.round === 4 || g.isVictory) ? 3 : (g.round === 2 ? 2 : 1);
    const totalRounds = 3;

    // Segmented Stepper Bar
    const steps = [
      { num: 1, label: t('scaffold.step-match', 'Cocokkan') },
      { num: 2, label: t('scaffold.step-puzzle', 'Susun Kalimat') },
      { num: 3, label: t('scaffold.step-ready', 'Siap Belajar') }
    ];

    const progressBarHtml = `
      <div class="mini-game-stepper" role="progressbar" aria-valuenow="${currentRound}" aria-valuemin="1" aria-valuemax="${totalRounds}">
        ${steps.map((st, idx) => {
          const isDone = currentRound > st.num;
          const isCurrent = currentRound === st.num;
          return `
            <div class="stepper-node${isDone ? ' is-done' : ''}${isCurrent ? ' is-active' : ''}">
              <div class="stepper-dot">
                ${isDone ? '<i data-lucide="check"></i>' : `<span>${st.num}</span>`}
              </div>
              <span class="stepper-label">${st.label}</span>
            </div>
            ${idx < steps.length - 1 ? `<div class="stepper-line${isDone ? ' is-done' : ''}"></div>` : ''}
          `;
        }).join('')}
      </div>
    `;

    if (currentRound === 1) {
      // Round 1: Word-to-Meaning Matching Game
      const remainingPairs = g.words.length - g.matchedIds.size;
      stageHtml = `
        <div class="mini-game-round round-1" data-testid="mini-game-stage-match">
          <div class="stage-hero-banner">
            <div class="stage-title-wrap">
              <span class="stage-tag"><i data-lucide="sparkles"></i> ${t('scaffold.round1-badge', 'Tahap 1')}</span>
              <h3 class="stage-heading">${t('scaffold.game-round1-title', 'Cocokkan Kata & Artinya')}</h3>
            </div>
            <div class="stage-meta-badges">
              ${g.combo > 1 ? `<span class="game-combo-pill" id="gameComboPill">🔥 x${g.combo}</span>` : ''}
              <span class="game-counter-pill">${g.matchedIds.size}/${g.words.length}</span>
            </div>
          </div>
          
          <p class="game-instruction">${t('scaffold.game-round1-desc', 'Ketuk kartu bahasa Inggris lalu pilih artinya dalam bahasa Indonesia.')}</p>

          <div class="match-game-board">
            <div class="match-col en-col">
              <div class="col-header">${t('scaffold.col-english', 'Bahasa Inggris')}</div>
              ${g.enCards.map(item => {
                const isMatched = g.matchedIds.has(item.id);
                const isSel = g.selectedEn === item.id;
                return `
                  <button type="button" 
                          class="match-card en-card${isMatched ? ' is-matched' : ''}${isSel ? ' is-selected' : ''}" 
                          ${isMatched ? 'disabled' : ''}
                          onclick="FiezelGrammarVocabBridge.handleCardClick('${item.id}', 'en')"
                          aria-pressed="${isSel}">
                    <span class="card-text">${esc(item.text)}</span>
                    <i data-lucide="volume-2" class="match-sound-icon"></i>
                  </button>
                `;
              }).join('')}
            </div>

            <div class="match-col id-col">
              <div class="col-header">${t('scaffold.col-indonesia', 'Arti Indonesia')}</div>
              ${g.idCards.map(item => {
                const isMatched = g.matchedIds.has(item.id);
                const isSel = g.selectedId === item.id;
                return `
                  <button type="button" 
                          class="match-card id-card${isMatched ? ' is-matched' : ''}${isSel ? ' is-selected' : ''}" 
                          ${isMatched ? 'disabled' : ''}
                          onclick="FiezelGrammarVocabBridge.handleCardClick('${item.id}', 'id')"
                          aria-pressed="${isSel}">
                    <span class="card-text">${esc(item.text)}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="stage-bottom-status">
            <span class="status-subtle">${remainingPairs > 0 ? t('scaffold.pairs-remaining', 'Tersisa ' + remainingPairs + ' pasangan kata', { count: remainingPairs }) : t('scaffold.all-paired', 'Semua pasangan cocok!')}</span>
          </div>
        </div>
      `;
    } else if (currentRound === 2) {
      // Round 2: Sentence Puzzle with Smart Grammar Infiltration
      const word = g.words[g.puzzleIndex] || g.words[0];
      const targetSentence = getAlignedSentenceForPuzzle(g.skill, word);
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
      const maxPuzzles = Math.min(2, g.words.length);

      stageHtml = `
        <div class="mini-game-round round-2 round-puzzle round-3-puzzle" data-testid="mini-game-stage-puzzle">
          <div class="stage-hero-banner">
            <div class="stage-title-wrap">
              <span class="stage-tag"><i data-lucide="sparkles"></i> ${t('scaffold.round2-badge', 'Tahap 2')}</span>
              <h3 class="stage-heading">${t('scaffold.game-round3-title', 'Susun Kalimat Tata Bahasa')}</h3>
            </div>
            <div class="stage-meta-badges">
              <span class="game-counter-pill">${g.puzzleIndex + 1}/${maxPuzzles}</span>
            </div>
          </div>

          <p class="game-instruction">${t('scaffold.game-round3-desc', 'Susun kepingan kata menjadi kalimat yang tepat sesuai aturan grammar!')}</p>

          <div class="puzzle-context-card">
            <div class="context-item">
              <i data-lucide="book-open"></i>
              <span><b>${t('scaffold.fokus-tata-bahasa', 'Aturan')}:</b> ${esc(grammarRuleText)}</span>
            </div>
            <div class="context-item word-highlight">
              <i data-lucide="target"></i>
              <span><b>${t('scaffold.label-kata-kunci', 'Kata Kunci')}:</b> <u>${esc(word.word)}</u> (${esc(word.meaning.split(';')[0].trim())})</span>
            </div>
          </div>

          <div class="puzzle-sentence-stage" id="puzzleSentenceStage">
            <div class="puzzle-slot-line" id="puzzleSlotLine">
              ${g.placedTokens.map((tok, idx) => `
                <button type="button" class="puzzle-placed-chip" onclick="FiezelGrammarVocabBridge.removePuzzleToken(${idx})" title="Ketuk untuk melepas">
                  <span class="tok-text">${esc(tok)}</span>
                  <i data-lucide="x" class="chip-remove-icon"></i>
                </button>
              `).join('')}
              ${g.placedTokens.length === 0 ? '<span class="puzzle-empty-hint">' + t('scaffold.hint-ketuk-keping', 'Ketuk keping di bawah...') + '</span>' : ''}
            </div>
          </div>

          ${g.puzzleFeedback ? `
            <div class="puzzle-pedagogical-feedback ${g.puzzleFeedback.ok ? 'is-success' : 'is-error'}" role="alert">
              <i data-lucide="${g.puzzleFeedback.ok ? 'check-circle-2' : 'circle-x'}"></i>
              <div class="feedback-body">
                <span class="feedback-title">${g.puzzleFeedback.ok ? t('scaffold.puzzle-ok-title', 'Tepat Sekali!') : t('scaffold.puzzle-err-title', 'Periksa Kembali')}</span>
                <span class="feedback-desc">${esc(g.puzzleFeedback.message)}</span>
              </div>
            </div>
          ` : ''}

          <div class="puzzle-bank-wrapper">
            <span class="bank-label">${t('scaffold.bank-label', 'Pilihan Kata:')}</span>
            <div class="puzzle-bank-tiles">
              ${shuffledTokens.map(tok => {
                const usedCount = g.placedTokens.filter(t => t === tok).length;
                const totalInTokens = tokens.filter(t => t === tok).length;
                const isUsed = usedCount >= totalInTokens;
                return `
                  <button type="button" 
                          class="puzzle-tile${isUsed ? ' is-used' : ''}" 
                          ${isUsed ? 'disabled aria-disabled="true"' : ''}
                          onclick="FiezelGrammarVocabBridge.addPuzzleToken('${esc(tok)}')">
                    ${esc(tok)}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="puzzle-actions-bar">
            ${(!g.puzzleFeedback?.ok && g.hasTriedOnce && !g.hintRequested) ? `
              <button type="button" 
                      class="puzzle-hint-btn" 
                      onclick="FiezelGrammarVocabBridge.requestPuzzleHint()">
                <i data-lucide="lightbulb"></i>
                <span>${t('scaffold.btn-minta-petunjuk', 'Petunjuk Pola')}</span>
              </button>
            ` : ''}
            <button type="button" 
                    class="puzzle-submit-btn" 
                    ${g.placedTokens.length === 0 ? 'disabled' : ''}
                    onclick="FiezelGrammarVocabBridge.checkSentencePuzzle()">
              <i data-lucide="check-circle-2"></i>
              <span>${t('scaffold.btn-periksa-kalimat', 'Periksa Kalimat')}</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Round 3: Victory & Comprehensive Mastery Scorecard
      stageHtml = `
        <div class="mini-game-round round-3-unlocked round-4-unlocked round-victory" data-testid="mini-game-stage-complete">
          <div class="victory-card-wrap">
            <div class="victory-icon-emblem">
              <i data-lucide="sparkles"></i>
            </div>
            
            <h2 class="victory-headline">${t('scaffold.game-unlocked-title', 'Kosakata Terkuasai Sempurna! 🎉')}</h2>
            <p class="victory-subtext">${t('scaffold.game-unlocked-desc', 'Semua kosakata kunci berhasil kamu kuasai. Kamu siap menaklukkan materi grammar ini!')}</p>

            <div class="mastery-summary-box">
              <div class="summary-stat-row">
                <div class="summary-metric">
                  <span class="metric-num">${g.words.length}</span>
                  <span class="metric-label">${t('scaffold.metric-vocab', 'Kosakata Dikenali')}</span>
                </div>
                <div class="summary-metric-divider"></div>
                <div class="summary-metric">
                  <span class="metric-num">${(g.bestCombo && g.bestCombo > 0) ? g.bestCombo : (g.combo > 0 ? g.combo : 1)}x</span>
                  <span class="metric-label">${t('scaffold.metric-combo', 'Kombo Terbaik')}</span>
                </div>
                <div class="summary-metric-divider"></div>
                <div class="summary-metric">
                  <span class="metric-num">100%</span>
                  <span class="metric-label">${t('scaffold.metric-ready', 'Siap Latihan')}</span>
                </div>
              </div>

              <div class="mastered-vocab-pills">
                ${g.words.map(w => `
                  <span class="mastered-pill">
                    <i data-lucide="check"></i>
                    <b>${esc(w.word)}</b> (${esc(w.meaning.split(';')[0].trim())})
                  </span>
                `).join('')}
              </div>
            </div>

            <div class="victory-cta-actions">
              <button type="button" class="enter-grammar-btn primary" onclick="FiezelGrammarVocabBridge.completeMiniGameAndUnlock('${g.skill}')">
                <span>${t('scaffold.btn-enter-grammar', 'Masuk ke Latihan Grammar')}</span>
                <i data-lucide="arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    const html = `
      <div class="modal-mini-game-sheet">
        <div class="mini-game-header-fixed">
          <div class="mini-game-nav">
            <div class="nav-brand-group">
              <span class="game-brand">FIEZEL QUEST</span>
              <span class="game-lesson-indicator">${esc((typeof friendlySkillName === 'function' && friendlySkillName(g.skill)) || g.skill)}</span>
            </div>
            <button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="${t('scaffold.close', 'Tutup')}">
              <i data-lucide="x"></i>
            </button>
          </div>
          ${progressBarHtml}
        </div>
        <div class="mini-game-scroll-body">
          ${stageHtml}
        </div>
      </div>
    `;

    openModal(html);
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
        g.combo = (g.combo || 0) + 1;
        if (g.combo > (g.bestCombo || 0)) {
          g.bestCombo = g.combo;
        }
        playSfx('success');
        triggerHaptic('medium');
        const wordObj = g.words.find(w => w.id === g.selectedEn);
        if (wordObj) {
          recordVocabMastery(wordObj.word, true, 2000);
        }
        g.selectedEn = null;
        g.selectedId = null;

        // Check completion of Round 1
        if (g.matchedIds.size >= g.words.length) {
          playSfx('levelup');
          setTimeout(() => {
            if (_activeMiniGame) {
              _activeMiniGame.round = 2; // Move to Sentence Puzzle Stage
              _activeMiniGame.puzzleIndex = 0;
              _activeMiniGame.placedTokens = [];
              _activeMiniGame.puzzleFeedback = null;
              renderMiniGameModal();
            }
          }, 450);
          return;
        }
      } else {
        // MISMATCH
        g.combo = 0;
        playSfx('error');
        triggerHaptic('light');
        const wordObj = g.words.find(w => w.id === g.selectedEn);
        if (wordObj) {
          recordVocabMastery(wordObj.word, false, 4000);
        }
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
      recordVocabMastery(q.word, true, 1800);
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
      recordVocabMastery(q.word, false, 3500);
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
    if (!_activeMiniGame || (_activeMiniGame.round !== 2 && _activeMiniGame.round !== 3)) return;
    _activeMiniGame.placedTokens.push(tok);
    playSfx('tap');
    renderMiniGameModal();
  }

  function removePuzzleToken(idx) {
    if (!_activeMiniGame || (_activeMiniGame.round !== 2 && _activeMiniGame.round !== 3)) return;
    _activeMiniGame.placedTokens.splice(idx, 1);
    playSfx('tap');
    renderMiniGameModal();
  }

  function checkSentencePuzzle() {
    if (!_activeMiniGame || (_activeMiniGame.round !== 2 && _activeMiniGame.round !== 3)) return;
    const g = _activeMiniGame;
    const word = g.words[g.puzzleIndex] || g.words[0];
    const targetSentence = getAlignedSentenceForPuzzle(g.skill, word);
    const targetTokens = targetSentence.replace(/[.!?]/g, '').split(/\s+/).filter(Boolean);

    const norm = s => String(s || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const userSentence = norm(g.placedTokens.join(' '));
    const expectedSentence = norm(targetTokens.join(' '));

    // STRICT CHECK: Hanya lulus jika susunan kalimat benar-benar tepat sesuai target!
    if (userSentence === expectedSentence) {
      // Puzzle correct!
      recordGrammarMastery(g.skill, true, 3000);
      playSfx('success');
      playAudio(targetSentence);
      g.puzzleFeedback = {
        ok: true,
        message: t('scaffold.puzzle-correct-detail', 'Susunan kalimat tepat sesuai pola grammar!')
      };
      renderMiniGameModal();

      setTimeout(() => {
        if (!_activeMiniGame) return;
        _activeMiniGame.puzzleIndex++;
        _activeMiniGame.placedTokens = [];
        _activeMiniGame.puzzleFeedback = null;

        const maxPuzzles = Math.min(2, _activeMiniGame.words.length);
        if (_activeMiniGame.puzzleIndex >= maxPuzzles) {
          _activeMiniGame.round = 3;
          _activeMiniGame.isVictory = true;
          playSfx('levelup');
          renderMiniGameModal();
        } else {
          renderMiniGameModal();
        }
      }, 700);
    } else {
      // Salah susunan kalimat: bedah secara presisi dan mendidik
      recordGrammarMastery(g.skill, false, 4500);
      playSfx('error');
      triggerHaptic('light');

      // Analisis token yang tertinggal atau salah posisi
      const missingTokens = targetTokens.filter(t => !g.placedTokens.includes(t));
      let feedbackMsg = '';
      if (g.placedTokens.length < targetTokens.length) {
        if (missingTokens.length > 0) {
          feedbackMsg = t('scaffold.missing-token-feedback', 'Kata "' + missingTokens[0] + '" belum kamu masukkan ke kalimat.', { word: missingTokens[0] });
        } else {
          feedbackMsg = t('scaffold.incomplete-sentence', 'Kalimat belum lengkap, masih ada kata yang tertinggal.');
        }
      } else {
        feedbackMsg = t('scaffold.reorder-hint', 'Periksa kembali urutan subjek dan kata kerjanya.');
      }

      g.hasTriedOnce = true;
      g.puzzleFeedback = {
        ok: false,
        message: feedbackMsg
      };

      if (typeof showToast === 'function') {
        showToast(feedbackMsg, 'warn');
      }
      renderMiniGameModal();
    }
  }

  function requestPuzzleHint() {
    if (!_activeMiniGame || (_activeMiniGame.round !== 2 && _activeMiniGame.round !== 3)) return;
    const g = _activeMiniGame;
    const word = g.words[g.puzzleIndex] || g.words[0];
    const targetSentence = getAlignedSentenceForPuzzle(g.skill, word);
    const targetTokens = targetSentence.replace(/[.!?]/g, '').split(/\s+/).filter(Boolean);
    const firstWord = targetTokens[0] || '';

    g.hintRequested = true;
    playSfx('tap');
    g.puzzleFeedback = {
      ok: false,
      message: t('scaffold.hint-first-token', 'Petunjuk: Kalimat ini diawali dengan kata "' + firstWord + '".', { word: firstWord })
    };
    renderMiniGameModal();
  }

  function completeMiniGameAndUnlock(skill) {
    const s = typeof state !== 'undefined' ? state : null;
    if (s) {
      if (!s.grammar) s.grammar = {};
      if (!s.grammar[skill]) s.grammar[skill] = {};
      s.grammar[skill].vocabReady = true;

      // Braincore telemetry: pastikan semua kata yang baru dipelajari teregistrasi di s.vocab & BKT
      const status = getVocabPrerequisiteStatus(skill, s);
      (status.words || []).forEach(w => {
        recordVocabMastery(w.word, true, 1500);
      });

      if (typeof save === 'function') {
        try { save(); } catch (_) {}
      }
    }
    _activeMiniGame = null;

    if (typeof closeModal === 'function') {
      closeModal();
    }

    if (typeof showToast === 'function') {
      showToast(t('scaffold.toast-vocab-terkuasai', 'Kosakata Terkuasai! Membuka Latihan Grammar...'), 'success');
    }

    // Launch grammar practice
    if (typeof enterStage === 'function' && typeof renderGrammarLesson === 'function') {
      enterStage('grammar-lesson', () => renderGrammarLesson(skill));
      renderGrammarLesson(skill);
    } else if (typeof practiceSkill === 'function') {
      practiceSkill(skill);
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
    requestPuzzleHint,
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
