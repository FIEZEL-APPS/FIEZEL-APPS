/**
 * Fiezel Video-First Grammar UI Module
 * File: fiezel-grammar-video.js
 * 
 * Modul ini menyediakan antarmuka latihan tata bahasa berbasis video (Video-First),
 * terinspirasi dari aplikasi Cake English. Modul ini mendukung pemutaran video
 * dengan subtitle ultra-sinkron, multi-checkpoint berurutan (1 video 5 soal),
 * auto-pause di titik grammar, overlay cloze/pilihan ganda, dan atribusi edukasi legal.
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
    let stemQuestion = ex.question || (typeof FiezelI18n !== 'undefined' && FiezelI18n.t ? FiezelI18n.t('grammar.video.question', 'Perhatikan video dan lengkapi bagian yang kosong.') : 'Perhatikan video dan lengkapi bagian yang kosong.');
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
        startTime: template.startTime || 0,
        checkpointIndex: Number.isInteger(template.checkpointIndex) ? template.checkpointIndex : 0,
        totalCheckpoints: Number.isInteger(template.totalCheckpoints) ? template.totalCheckpoints : 1,
        loopCount: template.loopCount || 3,
        speed: template.speed || 1.0,
        exercise: template.exercise,
        checkpoints: template.checkpoints || null,
        attribution: template.attribution || null
      },
      explain: ex.explain || {},
      skill: template.skill,
      lessonSkill: template.lessonSkill
    };
  };

  /**
   * Mengembangkan template video multi-checkpoint menjadi array soal berurutan.
   * @param {Object} template Data template video
   * @returns {Array} Daftar soal video-grammar berurutan
   */
  FiezelGrammarVideo.expandCheckpointsToQuestions = function(template) {
    if (!template) return [];
    if (!Array.isArray(template.checkpoints) || !template.checkpoints.length) {
      return [FiezelGrammarVideo.createVideoGrammarQuestion(template)];
    }
    return template.checkpoints.map((cp, idx) => {
      const prevPause = idx > 0 ? (template.checkpoints[idx - 1].pauseAt || 0) : 0;
      const cpTemplate = Object.assign({}, template, {
        id: `${template.id}-cp${idx + 1}`,
        pauseAt: cp.pauseAt,
        startTime: prevPause,
        exercise: cp.exercise,
        checkpointIndex: idx,
        totalCheckpoints: template.checkpoints.length
      });
      return FiezelGrammarVideo.createVideoGrammarQuestion(cpTemplate);
    });
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
    const esc = (str) => isEsc ? self.esc(str) : (str || '');
    const t = (k, f) => (typeof FiezelI18n !== 'undefined' && FiezelI18n.t) ? FiezelI18n.t(k, f) : f;
    
    const container = document.createElement('div');
    container.className = 'video-player-container';
    
    // Inject gaya CSS khusus jika belum ada
    if (!document.getElementById('fiezel-video-grammar-style')) {
      const style = document.createElement('style');
      style.id = 'fiezel-video-grammar-style';
      style.textContent = `
        .video-exercise-wrap { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; overflow: hidden; border-radius: var(--radius-lg, 16px); background: var(--surface, #1E293B); box-shadow: 0 4px 12px rgba(0,0,0,0.12); border: 1px solid var(--line, #334155); margin-bottom: 16px; }
        .video-player-container { position: relative; width: 100%; padding-top: 56.25%; background: #000; overflow: hidden; flex-shrink: 0; border-radius: var(--radius-lg, 16px); margin-bottom: 16px; }
        .video-player-container video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        .video-controls { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 14px; background: linear-gradient(transparent, rgba(0,0,0,0.85)); display: flex; align-items: center; gap: 10px; z-index: 10; }
        .video-controls button { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; display: grid; place-items: center; border-radius: var(--radius-sm, 8px); }
        .video-controls button:focus-visible { outline: 2px solid var(--focus-ring, #2563EB); }
        .video-progress-wrap { flex: 1; height: 14px; display: flex; align-items: center; cursor: pointer; position: relative; }
        .video-progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; position: relative; }
        .video-progress-fill { position: absolute; left: 0; top: 0; height: 100%; background: var(--sun, #F59E0B); width: 0%; border-radius: 2px; transition: width 0.08s linear; }
        .video-progress-markers { position: absolute; inset: 0; pointer-events: none; }
        .video-progress-marker { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 7px; height: 7px; border-radius: 50%; background: #F59E0B; box-shadow: 0 0 6px rgba(245, 158, 11, 0.9); z-index: 3; transition: all 0.2s; }
        .video-progress-marker.reached { background: #10B981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.9); }
        .video-speed-btn { font-size: 0.8rem; font-weight: 700; width: 42px; height: 30px; background: rgba(255,255,255,0.2) !important; border-radius: 15px !important; }
        .video-center-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(0,0,0,0.65); border: 2px solid rgba(255,255,255,0.85); border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 8; backdrop-filter: blur(4px); transition: transform 0.2s, opacity 0.2s; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
        .video-center-play:hover { transform: translate(-50%, -50%) scale(1.1); background: rgba(0,0,0,0.85); }
        .video-center-play.hidden { opacity: 0; pointer-events: none; }
        .video-subtitle-overlay { position: absolute; bottom: 48px; left: 0; right: 0; text-align: center; pointer-events: none; padding: 0 16px; z-index: 6; }
        .video-subtitle-text { display: inline-block; background: rgba(15, 23, 42, 0.85); color: #fff; padding: 6px 14px; border-radius: var(--radius-sm, 8px); font-size: 0.95rem; text-shadow: 0 1px 2px rgba(0,0,0,0.8); line-height: 1.4; transition: all 0.2s; backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.1); }
        .video-subtitle-text .sub-speaker { color: #F59E0B; font-weight: 800; margin-right: 5px; }
        .video-subtitle-text.highlight { color: #fff; border-color: rgba(245, 158, 11, 0.6); transform: scale(1.02); }
        .video-baked-mask { position: absolute; bottom: 0; left: 0; right: 0; height: 66px; background: #0B0F19; border-top: 1px solid rgba(255, 255, 255, 0.1); pointer-events: none; z-index: 4; transition: opacity 0.3s; }
        .sub-censored { display: inline-block; background: rgba(245, 158, 11, 0.25); color: #F59E0B; border: 1px dashed #F59E0B; border-radius: 6px; padding: 1px 8px; font-weight: 800; letter-spacing: 1px; animation: pulseCensor 1.5s infinite; margin: 0 4px; vertical-align: middle; }
        @keyframes pulseCensor { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 50% { box-shadow: 0 0 8px 2px rgba(245, 158, 11, 0.6); } }
        .sub-revealed { display: inline-block; background: rgba(16, 185, 129, 0.25); color: #10B981; border: 1px solid #10B981; border-radius: 6px; padding: 1px 8px; font-weight: 800; margin: 0 4px; vertical-align: middle; }
        .video-loop-badge { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.65); color: #fff; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-pill, 9999px); font-weight: 700; z-index: 5; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 4px; }
        .video-checkpoints-rail { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 14px; background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 100%; box-sizing: border-box; }
        .cp-indicator { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 8px; border-radius: var(--radius-pill, 9999px); background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94A3B8); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); cursor: default; }
        .cp-indicator.active { background: rgba(37, 99, 235, 0.25); border-color: #2563EB; color: #60A5FA; transform: scale(1.02); box-shadow: 0 0 8px rgba(37,99,235,0.3); }
        .cp-indicator.done { background: rgba(16, 185, 129, 0.2); border-color: #10B981; color: #34D399; }
        .cp-indicator.wrong { background: rgba(239, 68, 68, 0.2); border-color: #EF4444; color: #F87171; }
        .cp-dot { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-size: 0.7rem; background: rgba(255, 255, 255, 0.12); flex-shrink: 0; }
        .cp-indicator.active .cp-dot { background: #2563EB; color: #fff; }
        .cp-indicator.done .cp-dot { background: #10B981; color: #fff; }
        .cp-indicator.wrong .cp-dot { background: #EF4444; color: #fff; }
        .cp-label { white-space: nowrap; }
        @media (max-width: 440px) {
          .cp-label { display: none; }
          .cp-indicator { padding: 6px 0; justify-content: center; }
        }
        .video-attribution-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: rgba(0, 0, 0, 0.45); font-size: 0.75rem; color: var(--text-muted, #94A3B8); border-top: 1px solid rgba(255, 255, 255, 0.06); }
        .video-attribution-bar a { color: var(--accent-strong, #60A5FA); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
        .video-attribution-bar a:hover { text-decoration: underline; }
        .video-overlay-pane { position: absolute; inset: 0; background: rgba(0,0,0,0.75); z-index: 20; display: flex; flex-direction: column; justify-content: flex-end; transform: translateY(100%); transition: transform var(--dur-m, 0.3s) var(--ease, ease); }
        .video-overlay-pane.active { transform: translateY(0); }
        .video-exercise-panel { padding: 20px 16px; background: var(--surface, #1E293B); border-top-left-radius: var(--radius-lg, 16px); border-top-right-radius: var(--radius-lg, 16px); box-shadow: 0 -4px 20px rgba(0,0,0,0.3); max-height: 90%; overflow-y: auto; }
        .exercise-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(37, 99, 235, 0.2); color: #60A5FA; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-pill, 9999px); margin-bottom: 12px; }
        .cloze-sentence { font-size: 1.25rem; font-weight: 600; line-height: 1.5; margin-bottom: 20px; color: var(--text, #F8FAFC); }
        .cloze-blank { display: inline-block; min-width: 60px; border-bottom: 2px solid var(--text-muted, #94A3B8); color: var(--text-muted, #94A3B8); text-align: center; padding: 0 4px; transition: all var(--dur-s, 0.15s); }
        .cloze-blank.filled { border-bottom-color: var(--good, #10B981); color: var(--good, #10B981); font-weight: 700; }
        .cloze-blank.wrong { border-bottom-color: var(--bad, #EF4444); color: var(--bad, #EF4444); }
        .cloze-options { display: flex; flex-wrap: wrap; gap: 10px; }
        .cloze-chip { flex: 1; min-width: 100px; padding: 12px; border: 2px solid var(--line, #334155); background: var(--surface, #1E293B); border-radius: var(--radius-md, 12px); font-size: 1rem; font-weight: 600; color: var(--text, #F8FAFC); cursor: pointer; transition: all var(--dur-s, 0.15s); }
        .cloze-chip:hover { border-color: var(--accent, #2563EB); background: rgba(37, 99, 235, 0.15); }
        .cloze-chip:disabled { opacity: 0.6; cursor: not-allowed; }
        .grammar-choice-options { display: flex; flex-direction: column; gap: 10px; }
        .video-player-container.is-fallback { padding-top: 0; background: transparent; margin-bottom: 16px; }
        .fallback-card { padding: 20px 16px; text-align: center; background: var(--panel-soft, #1E293B); border: 1px solid var(--line-soft, #334155); border-radius: var(--radius-lg, 16px); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; box-sizing: border-box; color: var(--text, #F8FAFC); }
        .video-summary-card { padding: 24px 20px; text-align: center; background: var(--surface, #1E293B); border-radius: var(--radius-lg, 16px); border: 1px solid var(--line, #334155); display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 12px; animation: fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .summary-score-badge { font-size: 1.8rem; font-weight: 800; color: var(--good, #10B981); background: rgba(16, 185, 129, 0.15); padding: 8px 24px; border-radius: var(--radius-pill, 9999px); border: 2px solid var(--good, #10B981); }
      `;
      document.head.appendChild(style);
    }

    state.video = null;
    state.currentLoop = 1;
    state.isPausedForExercise = false;
    state.checkpoints = (Array.isArray(config.checkpoints) && config.checkpoints.length)
      ? config.checkpoints
      : (config.exercise ? [{ pauseAt: config.pauseAt || 0, exercise: config.exercise, id: config.id || 'cp-1' }] : []);
    state.currentCheckpointIndex = Number.isInteger(config.checkpointIndex) ? config.checkpointIndex : 0;

    // Tandai seluruh checkpoint sebelum indeks aktif sebagai selesai/terlewati
    if (Array.isArray(state.checkpoints)) {
      state.checkpoints.forEach((cp, idx) => {
        if (idx < state.currentCheckpointIndex) {
          cp.completed = true;
        }
      });
    }

    // Fallback jika tidak ada URL video: tampilkan konteks subtitle dialog yang kaya
    if (!config.videoUrl) {
      container.classList.add('is-fallback');
      container.innerHTML = `
        <div class="fallback-card">
          <i data-lucide="book-open" style="width: 44px; height: 44px; margin-bottom: 8px; opacity: 0.85; color: var(--accent, #2563EB);"></i>
          <p style="font-weight:700;margin-bottom:4px">${esc(config.exercise?.grammarPoint || 'Video Grammar Lab')}</p>
          <p class="muted" style="margin-bottom:12px;font-size:0.85rem">${t('grammar.video.no-video', 'Video tidak tersedia, beralih ke teks.')}</p>
          ${config.subtitles && config.subtitles.length ? `
            <div class="video-subtitle-dialog" style="display:flex;flex-direction:column;gap:6px;width:100%;max-width:440px;text-align:left">
              ${config.subtitles.map(s => `
                <div style="background:var(--panel, #0F172A);padding:6px 12px;border-radius:var(--radius-sm, 8px);border:1px solid var(--line-soft, #334155);font-size:0.88rem">
                  <strong style="color:var(--accent-strong, #60A5FA)">${esc(s.speaker || 'Dialogue')}:</strong> ${esc(s.text)}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
      if (typeof self.enhanceUI === 'function') self.enhanceUI();
      // Memicu latihan segera
      setTimeout(() => {
        if (state.onPauseReached) {
          const currentCp = state.checkpoints[state.currentCheckpointIndex] || { exercise: config.exercise };
          state.onPauseReached(currentCp, state.currentCheckpointIndex);
        }
      }, 500);
      return container;
    }

    container.innerHTML = `
      <video playsinline preload="auto" ${config.posterUrl ? `poster="${esc(config.posterUrl)}"` : ''} aria-label="${t('grammar.video.player-aria', 'Pemutar video tata bahasa')}">
        ${config.videoUrl ? `<source src="${esc(config.videoUrl)}" type="video/mp4"><source src="${esc(config.videoUrl.replace(/\.mp4$/, '.webm'))}" type="video/webm">` : ''}
      </video>
      ${config.maskLowerThirds !== false ? '<div class="video-baked-mask" id="videoBakedMask"></div>' : ''}
      <button type="button" class="video-center-play" aria-label="${t('grammar.video.play-pause', 'Putar / Jeda')}">
        <i data-lucide="play" style="width: 26px; height: 26px; margin-left: 3px;"></i>
      </button>
      <div class="video-subtitle-overlay" aria-live="polite">
        <span class="video-subtitle-text" style="display:none;"></span>
      </div>
      <div class="video-loop-badge hidden" id="videoLoopBadge">
        <i data-lucide="rotate-ccw"></i> <span>1/${config.loopCount || 1}</span>
      </div>
      <div class="video-controls">
        <button class="video-play-btn" aria-label="${t('grammar.video.play-pause', 'Putar / Jeda')}">
          <i data-lucide="play" class="play-icon"></i>
          <i data-lucide="pause" class="pause-icon" style="display:none;"></i>
        </button>
        <div class="video-progress-wrap" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${t('grammar.video.progress', 'Kemajuan video')}">
          <div class="video-progress-bar">
            <div class="video-progress-fill"></div>
            <div class="video-progress-markers" id="videoProgressMarkers"></div>
          </div>
        </div>
        <button class="video-speed-btn" aria-label="${t('grammar.video.speed', 'Kecepatan pemutaran')}">${config.speed?.toFixed(1) || '1.0'}x</button>
      </div>
    `;

    const video = container.querySelector('video');
    const centerPlayBtn = container.querySelector('.video-center-play');
    const playBtn = container.querySelector('.video-play-btn');
    const playIcon = container.querySelector('.play-icon');
    const pauseIcon = container.querySelector('.pause-icon');
    const progressWrap = container.querySelector('.video-progress-wrap');
    const progressFill = container.querySelector('.video-progress-fill');
    const markersWrap = container.querySelector('#videoProgressMarkers');
    const speedBtn = container.querySelector('.video-speed-btn');
    const subtitleEl = container.querySelector('.video-subtitle-text');
    const loopBadge = container.querySelector('#videoLoopBadge');
    const loopText = loopBadge.querySelector('span');

    state.video = video;
    if (video) video.playbackRate = config.speed || 1.0;

    const targetStartTime = Number(config.startTime) || 0;
    if (targetStartTime > 0 && video) {
      const applyStartTime = () => {
        if (video.currentTime < targetStartTime) {
          try { video.currentTime = targetStartTime; } catch(_) {}
        }
      };
      if (video.readyState >= 1) {
        applyStartTime();
      } else {
        video.addEventListener('loadedmetadata', applyStartTime, { once: true });
      }
    }

    const updateMarkers = () => {
      if (!video || !video.duration || !markersWrap || !state.checkpoints.length) return;
      markersWrap.innerHTML = '';
      state.checkpoints.forEach((cp, idx) => {
        if (!cp.pauseAt) return;
        const pct = Math.min(100, Math.max(0, (cp.pauseAt / video.duration) * 100));
        const marker = document.createElement('div');
        marker.className = `video-progress-marker ${idx < state.currentCheckpointIndex ? 'reached' : ''}`;
        marker.style.left = `${pct}%`;
        markersWrap.appendChild(marker);
      });
    };

    state.updateMarkers = updateMarkers;
    if (video) video.onloadedmetadata = updateMarkers;

    const togglePlay = () => {
      if (!video) return;
      if (targetStartTime > 0 && video.currentTime < targetStartTime) {
        try { video.currentTime = targetStartTime; } catch(_) {}
      }
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

    if (video) {
      video.onclick = (e) => {
        e.stopPropagation();
        if (!state.isPausedForExercise) {
          if (typeof self.haptic === 'function') self.haptic('tap');
          togglePlay();
        }
      };
    }

    if (playBtn) {
      playBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof self.haptic === 'function') self.haptic('tap');
        togglePlay();
      };
    }

    if (video) {
      video.onplay = () => {
        if (centerPlayBtn) centerPlayBtn.classList.add('hidden');
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'block';
      };

      video.onpause = () => {
        if (centerPlayBtn && !state.isPausedForExercise) centerPlayBtn.classList.remove('hidden');
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
      };

      video.ontimeupdate = () => {
        if (!video.duration) return;
        const progress = (video.currentTime / video.duration) * 100;
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressWrap) progressWrap.setAttribute('aria-valuenow', Math.round(progress));

        // Update subtitle dengan speaker tag
        const currentTime = video.currentTime;
        const activeSub = config.subtitles?.find(sub => currentTime >= sub.start && currentTime <= sub.end);
        
        if (subtitleEl) {
          if (activeSub && !state.isPausedForExercise) {
            const currentCp = state.checkpoints[state.currentCheckpointIndex];
            const isCompleted = state.exerciseCompleted || (currentCp ? currentCp.completed : false);

            let rawText = activeSub.text || '';
            let isCensored = false;
            let repAnswer = activeSub.censorAnswer || currentCp?.exercise?.clozeAnswer || '';
            const TOKEN = '___FZ_CLOZE_SLOT___';
            let replacedText = rawText;

            // Cloze censorship: sensor kata kunci agar tidak membocorkan kunci jawaban
            if (activeSub.censorPattern) {
              let pat = activeSub.censorPattern;
              if (typeof pat === 'string') {
                const m = pat.match(/^\/(.*)\/([a-z]*)$/i);
                const patSrc = m ? m[1].replace(/['’]/g, "['’]") : pat.replace(/['’]/g, "['’]");
                pat = new RegExp(patSrc, m ? m[2] : 'i');
              } else if (pat instanceof RegExp) {
                pat = new RegExp(pat.source.replace(/['’]/g, "['’]"), pat.flags || 'i');
              }
              if (pat.test(replacedText)) {
                replacedText = replacedText.replace(pat, TOKEN + (activeSub.censorSuffix || ''));
                isCensored = true;
              }
            }

            if (!isCensored) {
              const targetWord = activeSub.censorWord || currentCp?.exercise?.clozeAnswer;
              if (targetWord) {
                const rawWord = String(targetWord).trim();
                const escapedWord = rawWord.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/['’]/g, "['’]");
                const regex = new RegExp(`\\b(${escapedWord})\\b`, 'i');
                if (regex.test(replacedText)) {
                  replacedText = replacedText.replace(regex, TOKEN);
                  isCensored = true;
                  if (!repAnswer) repAnswer = targetWord;
                }
              }
            }

            let displayText = esc(replacedText);
            if (isCensored) {
              const repMarkup = isCompleted
                ? `<span class="sub-revealed">${esc(repAnswer)}</span>`
                : `<span class="sub-censored">[ ___ ]</span>`;
              displayText = displayText.replace(TOKEN, repMarkup);
            }

            if (activeSub.speaker) {
              subtitleEl.innerHTML = `<span class="sub-speaker">${esc(activeSub.speaker)}:</span> ${displayText}`;
            } else {
              subtitleEl.innerHTML = displayText;
            }
            subtitleEl.style.display = 'inline-block';
            if (typeof self.prefersReducedMotion !== 'function' || !self.prefersReducedMotion()) {
              subtitleEl.classList.add('highlight');
              setTimeout(() => subtitleEl.classList.remove('highlight'), 200);
            }
          } else {
            subtitleEl.style.display = 'none';
          }
        }

        // Cek titik auto-pause checkpoint aktif
        const currentCp = state.checkpoints[state.currentCheckpointIndex];
        if (currentCp && currentCp.pauseAt && currentTime >= currentCp.pauseAt && !state.isPausedForExercise && !currentCp.completed) {
          video.pause();
          try { video.currentTime = currentCp.pauseAt; } catch(_) {}
          state.isPausedForExercise = true;
          if (state.onPauseReached) {
            state.onPauseReached(currentCp, state.currentCheckpointIndex);
          }
        }
      };

      video.onended = () => {
        if (config.loopCount && state.currentLoop < config.loopCount) {
          state.currentLoop++;
          if (loopBadge) loopBadge.classList.remove('hidden');
          if (loopText) loopText.textContent = `${state.currentLoop}/${config.loopCount}`;
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
    }

    if (progressWrap) {
      progressWrap.onclick = (e) => {
        if (state.isPausedForExercise || !video) return; // Kunci saat latihan
        const rect = progressWrap.getBoundingClientRect ? progressWrap.getBoundingClientRect() : { left: 0, width: 100 };
        const pos = (e.clientX - rect.left) / (rect.width || 1);
        video.currentTime = pos * (video.duration || 0);
      };
    }

    const speeds = [0.75, 1.0, 1.25];
    if (speedBtn) {
      speedBtn.onclick = () => {
        if (!video) return;
        const current = video.playbackRate;
        let nextIdx = speeds.indexOf(current) + 1;
        if (nextIdx >= speeds.length) nextIdx = 0;
        video.playbackRate = speeds[nextIdx];
        speedBtn.textContent = `${speeds[nextIdx].toFixed(1)}x`;
        if (typeof self.haptic === 'function') self.haptic('tap');
      };
    }

    if (config.loopCount > 1 && loopBadge) {
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
    const esc = (str) => isEsc ? self.esc(str) : (str || '');
    const t = (k, f) => (typeof FiezelI18n !== 'undefined' && FiezelI18n.t) ? FiezelI18n.t(k, f) : f;
    const ex = (config && config.exercise) ? config.exercise : (config || {});
    const cpIdx = Number.isInteger(config?.checkpointIndex) ? config.checkpointIndex : 0;
    const cpTotal = Number.isInteger(config?.totalCheckpoints) ? config.totalCheckpoints : 1;

    const pane = document.createElement('div');
    pane.className = 'video-overlay-pane';
    
    // Pecah clozeText dengan blank (asumsi ___ menandakan blank)
    const parts = (ex.clozeText || '').split('___');
    const clozeHtml = parts.map((part, i) => {
      if (i === parts.length - 1) return esc(part);
      return `${esc(part)}<span class="cloze-blank" id="clozeBlank_${i}">___</span>`;
    }).join('');

    const qLabel = t('grammar.video.q-num', 'Soal');
    const ofLabel = t('grammar.video.of', 'dari');
    const badgeLabel = cpTotal > 1 
      ? `${qLabel} ${cpIdx + 1} ${ofLabel} ${cpTotal} • ${esc(ex.grammarPoint || t('grammar.video.point', 'Tata Bahasa'))}`
      : esc(ex.grammarPoint || t('grammar.video.point', 'Tata Bahasa'));

    pane.innerHTML = `
      <div class="video-exercise-panel" role="dialog" aria-modal="true" aria-label="${t('grammar.video.exercise', 'Latihan tata bahasa')}">
        <div class="exercise-badge">
          <i data-lucide="pencil"></i> ${badgeLabel}
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
        
        const blank = pane.querySelector('#clozeBlank_0');
        if (blank) {
          blank.textContent = optText;
          blank.classList.add(isCorrect ? 'filled' : 'wrong');
        }

        chip.style.borderColor = isCorrect ? 'var(--good, #10B981)' : 'var(--bad, #EF4444)';
        chip.style.backgroundColor = isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

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
    const esc = (str) => isEsc ? self.esc(str) : (str || '');
    const t = (k, f) => (typeof FiezelI18n !== 'undefined' && FiezelI18n.t) ? FiezelI18n.t(k, f) : f;

    const pane = document.createElement('div');
    pane.className = 'video-overlay-pane';

    pane.innerHTML = `
      <div class="video-exercise-panel" role="dialog" aria-modal="true">
        <div class="exercise-badge">
          <i data-lucide="book-open"></i> ${esc(exercise.grammarPoint || t('grammar.video.point', 'Tata Bahasa'))}
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
    const isEsc = typeof self.esc === 'function';
    const esc = (str) => isEsc ? self.esc(str) : (str || '');
    const t = (k, f) => (typeof FiezelI18n !== 'undefined' && FiezelI18n.t) ? FiezelI18n.t(k, f) : f;

    const root = document.createElement('div');
    root.className = 'video-exercise-wrap';

    const checkpoints = (Array.isArray(config.checkpoints) && config.checkpoints.length)
      ? config.checkpoints
      : (config.exercise ? [{ pauseAt: config.pauseAt || 0, exercise: config.exercise, id: config.id || 'cp-1' }] : []);

    const state = {
      isPausedForExercise: false,
      exerciseCompleted: false,
      video: null,
      checkpoints: checkpoints,
      currentCheckpointIndex: 0,
      score: 0,
      onPauseReached: null,
      onComplete: callbacks.onComplete,
      onError: (e) => {
        // Fallback perilaku saat video gagal muat
        if (!state.exerciseCompleted && state.onPauseReached) {
          const cp = state.checkpoints[state.currentCheckpointIndex] || { exercise: config.exercise };
          state.onPauseReached(cp, state.currentCheckpointIndex);
        }
      }
    };

    let overlayPane = null;

    // Render Rel Indikator Checkpoint jika terdapat lebih dari 1 soal
    if (state.checkpoints.length > 1) {
      const railEl = document.createElement('div');
      railEl.className = 'video-checkpoints-rail';
      railEl.id = 'videoCheckpointsRail';
      state.checkpoints.forEach((cp, idx) => {
        const ind = document.createElement('div');
        ind.className = `cp-indicator ${idx === 0 ? 'active' : ''}`;
        ind.id = `cpIndicator_${idx}`;
        ind.setAttribute('data-cp-idx', String(idx));
        const qWord = t('grammar.video.q-num', 'Soal');
        ind.title = `${qWord} ${idx + 1}`;
        ind.innerHTML = `
          <span class="cp-dot">${idx + 1}</span>
          <span class="cp-label">${qWord} ${idx + 1}</span>
        `;
        railEl.appendChild(ind);
      });
      root.appendChild(railEl);
    }

    const showCompletionSummary = () => {
      state.exerciseCompleted = true;
      const existingSummary = root.querySelector('.video-summary-card');
      if (existingSummary) return;

      const summaryPane = document.createElement('div');
      summaryPane.className = 'video-summary-card';
      const total = state.checkpoints.length;
      const score = state.score;
      summaryPane.innerHTML = `
        <div style="font-size:2.2rem;margin-bottom:-4px;">🎉</div>
        <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:var(--text, #F8FAFC);">${t('grammar.video.complete-title', 'Latihan 5 Checkpoint Selesai!')}</h3>
        <div class="summary-score-badge">${score} / ${total} Benar</div>
        <p class="muted" style="margin:0;font-size:0.85rem;">${t('grammar.video.complete-desc', 'Kamu berhasil menyelesaikan seluruh checkpoint tata bahasa dalam percakapan asli ini.')}</p>
        <button type="button" class="video-replay-all-btn" style="margin-top:6px;padding:10px 20px;border-radius:var(--radius-pill, 9999px);background:var(--accent,#2563EB);color:#fff;border:none;font-weight:700;font-size:0.9rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i> Ulangi Video & Kuis
        </button>
      `;

      const replayBtn = summaryPane.querySelector('.video-replay-all-btn');
      if (replayBtn) {
        replayBtn.onclick = () => {
          summaryPane.remove();
          state.currentCheckpointIndex = 0;
          state.score = 0;
          state.exerciseCompleted = false;
          state.checkpoints.forEach(c => { c.completed = false; });
          const allInd = root.querySelectorAll('.cp-indicator');
          allInd.forEach((ind, i) => {
            ind.className = `cp-indicator ${i === 0 ? 'active' : ''}`;
          });
          if (state.updateMarkers) state.updateMarkers();
          if (state.video) {
            state.video.currentTime = 0;
            state.video.play().catch(console.warn);
          }
        };
      }
      root.appendChild(summaryPane);
      if (typeof self.enhanceUI === 'function') self.enhanceUI();
      if (typeof callbacks.onComplete === 'function') {
        callbacks.onComplete({ score: state.score, total: total });
      }
    };

    state.onPauseReached = (checkpoint, checkpointIdx) => {
      const activeCp = checkpoint || state.checkpoints[state.currentCheckpointIndex] || {};
      const activeEx = activeCp.exercise || config.exercise || {};
      const type = activeEx.type || 'subtitle-cloze';
      
      const handleAnswer = (isCorrect, chosenIndex) => {
        activeCp.completed = true;
        activeCp.isCorrect = isCorrect;
        activeCp.chosenIndex = chosenIndex;
        if (isCorrect) state.score++;

        // Update indikator rel soal
        const ind = root.querySelector(`.cp-indicator[data-cp-idx="${checkpointIdx}"]`);
        if (ind) {
          ind.classList.remove('active');
          ind.classList.add(isCorrect ? 'done' : 'wrong');
        }

        if (callbacks.onAnswer) {
          callbacks.onAnswer(isCorrect, chosenIndex, activeCp, checkpointIdx);
        }

        // Tampilkan umpan balik menggunakan FiezelGrammarUpgrade jika tersedia
        const feedbackHost = document.getElementById('feedback');
        if (feedbackHost && self.FiezelGrammarUpgrade?.buildFeedbackHTML) {
          const qObj = {
            type: 'grammar',
            options: activeEx.options || [],
            answerIndex: activeEx.answerIndex || 0,
            explain: activeEx.explain || {}
          };
          feedbackHost.innerHTML = self.FiezelGrammarUpgrade.buildFeedbackHTML(qObj, chosenIndex, isCorrect);
          // Tombol AI dipasang di sini, bukan lewat onclick inline: atribut inline berjalan di
          // lingkup global, tempat `q`/`j` tidak pernah ada.
          const aiBtn = feedbackHost.querySelector('#aiExplainBtn');
          if (aiBtn) {
            if (typeof self.explainWithAI === 'function') aiBtn.onclick = () => self.explainWithAI(qObj, chosenIndex);
            else aiBtn.remove();
          }
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

        // Setelah jawab, tutup overlay dan lanjutkan pemutaran ke checkpoint berikutnya
        setTimeout(() => {
          if (overlayPane) {
            overlayPane.classList.remove('active');
            setTimeout(() => { if (overlayPane.parentNode) overlayPane.remove(); }, 300);
          }

          const hasMore = state.currentCheckpointIndex < state.checkpoints.length - 1;
          if (hasMore) {
            state.currentCheckpointIndex++;
            const nextInd = root.querySelector(`.cp-indicator[data-cp-idx="${state.currentCheckpointIndex}"]`);
            if (nextInd) nextInd.classList.add('active');
            if (state.updateMarkers) state.updateMarkers();

            state.isPausedForExercise = false;
            if (state.video && config.videoUrl && !state.video.error) {
              state.video.play().catch(console.warn);
            }
          } else {
            // Seluruh checkpoint selesai
            state.exerciseCompleted = true;
            state.isPausedForExercise = false;
            if (state.checkpoints.length > 1) {
              if (state.video && config.videoUrl && !state.video.error && state.video.currentTime < state.video.duration - 1.0) {
                state.video.play().catch(console.warn);
              } else {
                showCompletionSummary();
              }
            } else {
              if (state.video && config.videoUrl && !state.video.error) {
                state.video.play().catch(console.warn);
              } else {
                if (state.onComplete) state.onComplete();
              }
            }
          }
        }, 1300);
      };

      const clozeConf = {
        exercise: activeEx,
        checkpointIndex: checkpointIdx,
        totalCheckpoints: state.checkpoints.length
      };

      if (type === 'subtitle-cloze') {
        overlayPane = this.renderSubtitleCloze(clozeConf, handleAnswer);
      } else {
        overlayPane = this.renderGrammarChoiceOverlay(activeEx, handleAnswer);
      }

      root.appendChild(overlayPane);
      
      // Animasi masuk
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => overlayPane.classList.add('active'));
      } else {
        overlayPane.classList.add('active');
      }
    };

    const playerEl = this.renderVideoPlayer(config, state);
    root.appendChild(playerEl);

    // Render baris atribusi legal edukasi jika tersedia
    if (config.attribution) {
      const attrEl = document.createElement('div');
      attrEl.className = 'video-attribution-bar';
      attrEl.id = 'videoAttributionBar';
      attrEl.innerHTML = `
        <span>
          <i data-lucide="circle-play" style="width:13px;height:13px;margin-right:4px;vertical-align:-2px;"></i>
          ${esc(config.attribution.source || t('grammar.video.edu-material', 'Materi Edukasi'))}
        </span>
        ${config.attribution.url ? `
          <a href="${esc(config.attribution.url)}" target="_blank" rel="noopener noreferrer">
            <i data-lucide="arrow-up-right" style="width:12px;height:12px;"></i> ${esc(config.attribution.sourceLabel || t('grammar.video.open-source', 'Buka di YouTube'))}
          </a>
        ` : ''}
      `;
      root.appendChild(attrEl);
    }

    // Sambungkan onended untuk menampilkan ringkasan multi-checkpoint
    const origOnComplete = state.onComplete;
    state.onComplete = () => {
      if (state.checkpoints.length > 1 && state.exerciseCompleted) {
        showCompletionSummary();
      } else if (origOnComplete) {
        origOnComplete();
      }
    };

    // Keyboard support: Space untuk play/pause, panah untuk seek
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
