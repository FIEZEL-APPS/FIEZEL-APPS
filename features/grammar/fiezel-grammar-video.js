/**
 * Fiezel Video-First Grammar UI Module
 * File: fiezel-grammar-video.js
 * 
 * Modul ini menyediakan antarmuka latihan tata bahasa berbasis video (Video-First),
 * terinspirasi dari aplikasi Cake English. Modul ini mendukung pemutaran video
 * dengan subtitle, auto-pause di titik grammar, dan overlay pertanyaan (cloze/pilihan ganda).
 */
(function() {
  'use strict';

  const FiezelGrammarVideo = {};

  /**
   * Mengkonversi template soal grammar-video menjadi format soal standar kuis
   * yang kompatibel dengan quizLoop.
   * @param {Object} template Data template soal dari data bank
   * @returns {Object} Objek soal standar
   */
  FiezelGrammarVideo.createVideoGrammarQuestion = function(template) {
    template = template || {};
    const ex = template.exercise || {};
    let stemQuestion = ex.question || FiezelI18n.t('grammar.video.question', 'Perhatikan video dan lengkapi bagian yang kosong.');
    if (ex.clozeText) {
      stemQuestion = stemQuestion ? `${stemQuestion} ${ex.clozeText}` : ex.clozeText;
    }

    return {
      id: template.id || `vg-${Date.now()}`,
      type: 'video-grammar',
      level: template.level || 'A1',
      question: stemQuestion,
      options: ex.options || [],
      answerIndex: Number.isInteger(ex.answerIndex) ? ex.answerIndex : 0,
      videoConfig: {
        videoUrl: template.videoUrl || '',
        posterUrl: template.posterUrl || '',
        subtitles: template.subtitles || [],
        pauseAt: template.pauseAt || 0,
        loopCount: template.loopCount || 3,
        speed: template.speed || 1.0,
        exercise: template.exercise
      },
      explain: ex.explain || {},
      skill: template.skill,
      lessonSkill: template.lessonSkill
    };
  };

  /**
   * Merender pemutar video HTML5 kustom.
   * @param {Object} [config] Konfigurasi video
   * @param {Object} [state] Status internal (di-mutate)
   * @returns {HTMLElement} Elemen container pemutar video
   */
  FiezelGrammarVideo.renderVideoPlayer = function(config, state) {
    config = config || {};
    state = state || {};
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;
    
    const container = document.createElement('div');
    container.className = 'video-player-container';
    
    // Inject gaya CSS khusus jika belum ada
    if (!document.getElementById('fiezel-video-grammar-style')) {
      const style = document.createElement('style');
      style.id = 'fiezel-video-grammar-style';
      style.textContent = `
        .video-exercise-wrap { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; overflow: hidden; border-radius: var(--radius-lg); background: var(--surface); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid var(--line); margin-bottom: 16px; }
        .video-player-container { position: relative; width: 100%; padding-top: 56.25%; background: #000; overflow: hidden; flex-shrink: 0; border-radius: var(--radius-lg); margin-bottom: 16px; }
        .video-player-container video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        .video-controls { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); display: flex; align-items: center; gap: 12px; z-index: 10; }
        .video-controls button { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; display: grid; place-items: center; border-radius: var(--radius-sm); }
        .video-controls button:focus-visible { outline: 2px solid var(--focus-ring); }
        .video-progress-wrap { flex: 1; height: 12px; display: flex; align-items: center; cursor: pointer; }
        .video-progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; position: relative; overflow: hidden; }
        .video-progress-fill { position: absolute; left: 0; top: 0; height: 100%; background: var(--sun); width: 0%; border-radius: 2px; transition: width 0.1s linear; }
        .video-speed-btn { font-size: 0.85rem; font-weight: 700; width: 44px; height: 32px; background: rgba(255,255,255,0.2) !important; border-radius: 16px !important; }
        .video-center-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(0,0,0,0.65); border: 2px solid rgba(255,255,255,0.85); border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 8; backdrop-filter: blur(4px); transition: transform 0.2s, opacity 0.2s; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
        .video-center-play:hover { transform: translate(-50%, -50%) scale(1.1); background: rgba(0,0,0,0.85); }
        .video-center-play.hidden { opacity: 0; pointer-events: none; }
        .video-subtitle-overlay { position: absolute; bottom: 50px; left: 0; right: 0; text-align: center; pointer-events: none; padding: 0 16px; z-index: 5; }
        .video-subtitle-text { display: inline-block; background: rgba(0,0,0,0.65); color: #fff; padding: 6px 12px; border-radius: var(--radius-sm); font-size: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.8); line-height: 1.4; transition: all 0.2s; backdrop-filter: blur(4px); }
        .video-subtitle-text.highlight { color: var(--sun); transform: scale(1.05); }
        .video-loop-badge { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-pill); font-weight: 700; z-index: 5; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 4px; }
        .video-overlay-pane { position: absolute; inset: 0; background: rgba(0,0,0,0.7); z-index: 20; display: flex; flex-direction: column; justify-content: flex-end; transform: translateY(100%); transition: transform var(--dur-m) var(--ease); }
        .video-overlay-pane.active { transform: translateY(0); }
        .video-exercise-panel { padding: 20px 16px; background: var(--surface); border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); box-shadow: 0 -4px 16px rgba(0,0,0,0.15); max-height: 90%; overflow-y: auto; }
        .exercise-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--accent-soft); color: var(--accent-strong); font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-pill); margin-bottom: 12px; }
        .cloze-sentence { font-size: 1.25rem; font-weight: 600; line-height: 1.5; margin-bottom: 20px; color: var(--text); }
        .cloze-blank { display: inline-block; min-width: 60px; border-bottom: 2px solid var(--text-muted); color: var(--text-muted); text-align: center; padding: 0 4px; transition: all var(--dur-s); }
        .cloze-blank.filled { border-bottom-color: var(--good); color: var(--good); font-weight: 700; }
        .cloze-blank.wrong { border-bottom-color: var(--bad); color: var(--bad); }
        .cloze-options { display: flex; flex-wrap: wrap; gap: 10px; }
        .cloze-chip { flex: 1; min-width: 100px; padding: 12px; border: 2px solid var(--line); background: var(--surface); border-radius: var(--radius-md); font-size: 1rem; font-weight: 600; color: var(--text); cursor: pointer; transition: all var(--dur-s); }
        .cloze-chip:hover { border-color: var(--accent); background: var(--accent-soft); }
        .cloze-chip:disabled { opacity: 0.6; cursor: not-allowed; }
        .grammar-choice-options { display: flex; flex-direction: column; gap: 10px; }
        .video-player-container.is-fallback { padding-top: 0; background: transparent; margin-bottom: 16px; }
        .fallback-card { padding: 20px 16px; text-align: center; background: var(--panel-soft); border: 1px solid var(--line-soft); border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; box-sizing: border-box; color: var(--text); }
      `;
      document.head.appendChild(style);
    }

    state.video = null;
    state.currentLoop = 1;
    state.isPausedForExercise = false;

    // Fallback jika tidak ada URL video: tampilkan konteks subtitle dialog yang kaya
    if (!config.videoUrl) {
      container.classList.add('is-fallback');
      container.innerHTML = `
        <div class="fallback-card">
          <i data-lucide="book-open" style="width: 44px; height: 44px; margin-bottom: 8px; opacity: 0.85; color: var(--accent);"></i>
          <p style="font-weight:700;margin-bottom:4px">${esc(config.exercise?.grammarPoint || 'Video Grammar Lab')}</p>
          <p class="muted" style="margin-bottom:12px;font-size:0.85rem">${FiezelI18n.t('grammar.video.no-video', 'Video tidak tersedia, beralih ke teks.')}</p>
          ${config.subtitles && config.subtitles.length ? `
            <div class="video-subtitle-dialog" style="display:flex;flex-direction:column;gap:6px;width:100%;max-width:440px;text-align:left">
              ${config.subtitles.map(s => `
                <div style="background:var(--panel);padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--line-soft);font-size:0.88rem">
                  <strong style="color:var(--accent-strong)">${esc(s.speaker || 'Dialogue')}:</strong> ${esc(s.text)}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
      if (typeof self.enhanceUI === 'function') self.enhanceUI();
      // Memicu latihan segera
      setTimeout(() => {
        if (state.onPauseReached) state.onPauseReached();
      }, 500);
      return container;
    }

    container.innerHTML = `
      <video playsinline preload="auto" ${config.posterUrl ? `poster="${esc(config.posterUrl)}"` : ''} aria-label="${FiezelI18n.t('grammar.video.player-aria', 'Pemutar video tata bahasa')}">
        ${config.videoUrl ? `<source src="${esc(config.videoUrl)}" type="video/mp4"><source src="${esc(config.videoUrl.replace(/\.mp4$/, '.webm'))}" type="video/webm">` : ''}
      </video>
      <button type="button" class="video-center-play" aria-label="${FiezelI18n.t('grammar.video.play-pause', 'Putar / Jeda')}">
        <i data-lucide="play" style="width: 26px; height: 26px; margin-left: 3px;"></i>
      </button>
      <div class="video-subtitle-overlay" aria-live="polite">
        <span class="video-subtitle-text" style="display:none;"></span>
      </div>
      <div class="video-loop-badge hidden" id="videoLoopBadge">
        <i data-lucide="rotate-ccw"></i> <span>1/${config.loopCount || 1}</span>
      </div>
      <div class="video-controls">
        <button class="video-play-btn" aria-label="${FiezelI18n.t('grammar.video.play-pause', 'Putar / Jeda')}">
          <i data-lucide="play" class="play-icon"></i>
          <i data-lucide="pause" class="pause-icon" style="display:none;"></i>
        </button>
        <div class="video-progress-wrap" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${FiezelI18n.t('grammar.video.progress', 'Kemajuan video')}">
          <div class="video-progress-bar">
            <div class="video-progress-fill"></div>
          </div>
        </div>
        <button class="video-speed-btn" aria-label="${FiezelI18n.t('grammar.video.speed', 'Kecepatan pemutaran')}">${config.speed?.toFixed(1) || '1.0'}x</button>
      </div>
    `;

    const video = container.querySelector('video');
    const centerPlayBtn = container.querySelector('.video-center-play');
    const playBtn = container.querySelector('.video-play-btn');
    const playIcon = container.querySelector('.play-icon');
    const pauseIcon = container.querySelector('.pause-icon');
    const progressWrap = container.querySelector('.video-progress-wrap');
    const progressFill = container.querySelector('.video-progress-fill');
    const speedBtn = container.querySelector('.video-speed-btn');
    const subtitleEl = container.querySelector('.video-subtitle-text');
    const loopBadge = container.querySelector('#videoLoopBadge');
    const loopText = loopBadge.querySelector('span');

    state.video = video;

    video.playbackRate = config.speed || 1.0;

    const togglePlay = () => {
      if (video.paused) {
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(e => {
            console.warn('Playback unmuted failed, retrying muted:', e);
            video.muted = true;
            video.play().catch(err => {
              console.warn('Playback failed completely', err);
              if (state.onError) state.onError(err);
            });
          });
        }
      } else {
        video.pause();
      }
    };

    if (centerPlayBtn) {
      centerPlayBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof self.haptic === 'function') self.haptic('tap');
        togglePlay();
      };
    }

    video.onclick = (e) => {
      e.stopPropagation();
      if (!state.isPausedForExercise) {
        if (typeof self.haptic === 'function') self.haptic('tap');
        togglePlay();
      }
    };

    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof self.haptic === 'function') self.haptic('tap');
      togglePlay();
    };

    video.onplay = () => {
      if (centerPlayBtn) centerPlayBtn.classList.add('hidden');
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    };

    video.onpause = () => {
      if (centerPlayBtn && !state.isPausedForExercise) centerPlayBtn.classList.remove('hidden');
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    };

    video.ontimeupdate = () => {
      if (!video.duration) return;
      const progress = (video.currentTime / video.duration) * 100;
      progressFill.style.width = `${progress}%`;
      progressWrap.setAttribute('aria-valuenow', Math.round(progress));

      // Update subtitle
      const currentTime = video.currentTime;
      const activeSub = config.subtitles?.find(sub => currentTime >= sub.start && currentTime <= sub.end);
      
      if (activeSub && !state.isPausedForExercise) {
        subtitleEl.textContent = activeSub.text;
        subtitleEl.style.display = 'inline-block';
        if (typeof self.prefersReducedMotion !== 'function' || !self.prefersReducedMotion()) {
          subtitleEl.classList.add('highlight');
          setTimeout(() => subtitleEl.classList.remove('highlight'), 200);
        }
      } else {
        subtitleEl.style.display = 'none';
      }

      // Cek titik pause (auto-pause)
      if (config.pauseAt && currentTime >= config.pauseAt && !state.isPausedForExercise && !state.exerciseCompleted) {
        video.pause();
        state.isPausedForExercise = true;
        if (state.onPauseReached) state.onPauseReached();
      }
    };

    video.onended = () => {
      if (config.loopCount && state.currentLoop < config.loopCount) {
        state.currentLoop++;
        loopBadge.classList.remove('hidden');
        loopText.textContent = `${state.currentLoop}/${config.loopCount}`;
        video.currentTime = 0;
        video.play();
      } else {
        if (state.onComplete) state.onComplete();
      }
    };

    video.onerror = () => {
      console.warn('Video load error');
      if (state.onError) state.onError();
    };

    progressWrap.onclick = (e) => {
      if (state.isPausedForExercise) return; // Kunci saat latihan
      const rect = progressWrap.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      video.currentTime = pos * video.duration;
    };

    const speeds = [0.75, 1.0, 1.25];
    speedBtn.onclick = () => {
      const current = video.playbackRate;
      let nextIdx = speeds.indexOf(current) + 1;
      if (nextIdx >= speeds.length) nextIdx = 0;
      video.playbackRate = speeds[nextIdx];
      speedBtn.textContent = `${speeds[nextIdx].toFixed(1)}x`;
      if (typeof self.haptic === 'function') self.haptic('tap');
    };

    if (config.loopCount > 1) {
      loopBadge.classList.remove('hidden');
    }

    if (typeof self.enhanceUI === 'function') self.enhanceUI();
    return container;
  };

  /**
   * Merender overlay cloze subtitle (mengisi rumpang).
   * @param {Object} config Konfigurasi
   * @param {Function} onSubmit Callback submit
   * @returns {HTMLElement} Elemen pane
   */
  FiezelGrammarVideo.renderSubtitleCloze = function(config, onSubmit) {
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;
    const ex = (config && config.exercise) ? config.exercise : {};

    const pane = document.createElement('div');
    pane.className = 'video-overlay-pane';
    
    // Pecah clozeText dengan blank (asumsi ___ menandakan blank)
    const parts = (ex.clozeText || '').split('___');
    const clozeHtml = parts.map((part, i) => {
      if (i === parts.length - 1) return esc(part);
      return `${esc(part)}<span class="cloze-blank" id="clozeBlank_${i}">___</span>`;
    }).join('');

    pane.innerHTML = `
      <div class="video-exercise-panel" role="dialog" aria-modal="true" aria-label="${FiezelI18n.t('grammar.video.exercise', 'Latihan tata bahasa')}">
        <div class="exercise-badge">
          <i data-lucide="pencil"></i> ${esc(ex.grammarPoint || FiezelI18n.t('grammar.video.point', 'Tata Bahasa'))}
        </div>
        <p class="muted" style="margin-bottom: 12px; font-size: 0.9rem;">${esc(ex.question)}</p>
        <div class="cloze-sentence">
          ${clozeHtml}
        </div>
        <div class="cloze-options">
          ${(ex.options || []).map((opt, idx) => `
            <button class="cloze-chip" data-idx="${idx}">${esc(opt)}</button>
          `).join('')}
        </div>
      </div>
    `;

    const chips = pane.querySelectorAll('.cloze-chip');
    chips.forEach(chip => {
      chip.onclick = () => {
        if (typeof self.haptic === 'function') self.haptic('tap');
        const idx = parseInt(chip.getAttribute('data-idx'), 10);
        const isCorrect = idx === ex.answerIndex;
        const optText = (ex.options && ex.options[idx]) || '';
        
        chips.forEach(c => c.disabled = true);
        
        const blank = pane.querySelector('#clozeBlank_0'); // Sederhananya tangani 1 blank
        if (blank) {
          blank.textContent = optText;
          blank.classList.add(isCorrect ? 'filled' : 'wrong');
        }

        chip.style.borderColor = isCorrect ? 'var(--good)' : 'var(--bad)';
        chip.style.backgroundColor = isCorrect ? 'var(--good-soft, rgba(0,200,83,0.1))' : 'var(--bad-soft, rgba(220,53,69,0.1))';

        if (typeof self.uiSfx === 'function') {
          self.uiSfx(isCorrect ? 'correct' : 'wrong');
        }

        if (typeof onSubmit === 'function') onSubmit(isCorrect, idx);
      };
    });

    if (typeof self.enhanceUI === 'function') self.enhanceUI();
    return pane;
  };

  /**
   * Merender overlay pilihan ganda tata bahasa konvensional.
   * @param {Object} [exercise] Objek exercise
   * @param {Function} [onAnswer] Callback
   * @returns {HTMLElement} Elemen pane
   */
  FiezelGrammarVideo.renderGrammarChoiceOverlay = function(exercise, onAnswer) {
    exercise = exercise || {};
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : str;

    const pane = document.createElement('div');
    pane.className = 'video-overlay-pane';

    pane.innerHTML = `
      <div class="video-exercise-panel" role="dialog" aria-modal="true">
        <div class="exercise-badge">
          <i data-lucide="book-open"></i> ${esc(exercise.grammarPoint || FiezelI18n.t('grammar.video.point', 'Tata Bahasa'))}
        </div>
        <h3 class="question" style="margin-bottom: 20px;">${esc(exercise.question)}</h3>
        <div class="grammar-choice-options">
          ${(exercise.options || []).map((opt, idx) => `
            <button class="option" data-idx="${idx}">${esc(opt)}</button>
          `).join('')}
        </div>
      </div>
    `;

    const btns = pane.querySelectorAll('.option');
    btns.forEach(btn => {
      btn.onclick = () => {
        if (typeof self.haptic === 'function') self.haptic('tap');
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const isCorrect = idx === exercise.answerIndex;
        
        btns.forEach(b => b.disabled = true);
        btn.classList.add(isCorrect ? 'correct' : 'wrong');

        if (typeof self.uiSfx === 'function') {
          self.uiSfx(isCorrect ? 'correct' : 'wrong');
        }

        if (typeof onAnswer === 'function') onAnswer(isCorrect, idx);
      };
    });

    if (typeof self.enhanceUI === 'function') self.enhanceUI();
    return pane;
  };

  /**
   * Merender pengalaman lengkap Video-First Grammar Exercise.
   * @param {Object} [config] Konfigurasi
   * @param {Object} [callbacks] Callbacks { onAnswer, onComplete, onSkip }
   * @returns {HTMLElement} Elemen root
   */
  FiezelGrammarVideo.renderVideoExercise = function(config, callbacks) {
    config = config || {};
    callbacks = callbacks || {};
    const root = document.createElement('div');
    root.className = 'video-exercise-wrap';

    const state = {
      isPausedForExercise: false,
      exerciseCompleted: false,
      video: null,
      onPauseReached: null,
      onComplete: callbacks.onComplete,
      onError: (e) => {
        // Fallback perilaku saat video gagal muat (misalnya offline)
        if (!state.exerciseCompleted && state.onPauseReached) {
          state.onPauseReached();
        }
      }
    };

    let overlayPane = null;

    state.onPauseReached = () => {
      const type = config.exercise?.type || 'subtitle-cloze';
      
      const handleAnswer = (isCorrect, chosenIndex) => {
        state.exerciseCompleted = true;
        if (callbacks.onAnswer) {
          callbacks.onAnswer(isCorrect, chosenIndex);
        }

        // Tampilkan umpan balik menggunakan FiezelGrammarUpgrade jika tersedia
        const feedbackHost = document.getElementById('feedback');
        if (feedbackHost && self.FiezelGrammarUpgrade?.buildFeedbackHTML) {
          const ex = config.exercise || {};
          const qObj = {
            type: 'grammar',
            options: ex.options || [],
            answerIndex: ex.answerIndex || 0,
            explain: ex.explain || {}
          };
          feedbackHost.innerHTML = self.FiezelGrammarUpgrade.buildFeedbackHTML(qObj, chosenIndex, isCorrect);
          feedbackHost.classList.remove('hidden', 'feedback-success', 'feedback-error');
          feedbackHost.classList.add(isCorrect ? 'feedback-success' : 'feedback-error');
          if (typeof self.enhanceUI === 'function') self.enhanceUI();
          
          try {
            feedbackHost.scrollIntoView({
              block: 'nearest',
              behavior: (typeof self.prefersReducedMotion === 'function' && self.prefersReducedMotion()) ? 'auto' : 'smooth'
            });
          } catch(e) {}
        }

        // Setelah jawab, sembunyikan overlay & lanjut putar sisa video
        setTimeout(() => {
          if (overlayPane) {
            overlayPane.classList.remove('active');
            setTimeout(() => { if (overlayPane.parentNode) overlayPane.remove(); }, 300);
          }
          if (state.video && config.videoUrl && !state.video.error) {
            state.isPausedForExercise = false;
            state.video.play().catch(console.warn);
          } else {
            // Bila tidak ada video, langsung onComplete
            if (state.onComplete) state.onComplete();
          }
        }, 1500);
      };

      if (type === 'subtitle-cloze') {
        overlayPane = this.renderSubtitleCloze(config, handleAnswer);
      } else {
        overlayPane = this.renderGrammarChoiceOverlay(config.exercise || {}, handleAnswer);
      }

      root.appendChild(overlayPane);
      
      // Animasi masuk
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          overlayPane.classList.add('active');
        });
      } else {
        overlayPane.classList.add('active');
      }
    };

    const playerEl = this.renderVideoPlayer(config, state);
    root.appendChild(playerEl);

    // Keyboard support: Space untuk play/pause
    root.tabIndex = 0;
    root.onkeydown = (e) => {
      if (e.key === ' ' && state.video && !state.isPausedForExercise) {
        e.preventDefault();
        if (state.video.paused) state.video.play();
        else state.video.pause();
      } else if (e.key === 'ArrowRight' && state.video) {
        state.video.currentTime += 5;
      } else if (e.key === 'ArrowLeft' && state.video) {
        state.video.currentTime -= 5;
      }
    };

    return root;
  };

  self.FiezelGrammarVideo = FiezelGrammarVideo;

})();
