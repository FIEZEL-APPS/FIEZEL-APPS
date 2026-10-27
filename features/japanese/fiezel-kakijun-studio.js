/* ==========================================================================
   FIEZEL KAKIJUN STUDIO (書き順 / Japanese Stroke Order Master Studio)
   Authentic MEXT-Standard Calligraphy Engine powered by KanjiVG.
   Features:
   - Genkō Yōshi (米字格) 8-division Japanese calligraphy grid
   - Authentic KanjiVG Bezier path rendering via native Path2D & SVG
   - Real-time animated stroke demonstration (書き順アニメーション)
   - Pedagogical trajectory validation & reverse-stroke detection
   - Complete 136-character library (46 Hiragana, 46 Katakana, 44 N5 Kanji)
   - Interactive character picker drawer with script tabs
   - Zero-Leak bilingual i18n (Indonesian & Thai)
   - Braincore telemetry integration
   ========================================================================== */
(function (root) {
  'use strict';

  var activeChar = 'あ';
  var activeScript = 'hiragana';
  var activeMode = 'guided'; // 'guided' | 'recall'
  var activeStrokeIndex = 0;
  var userPoints = [];
  var isDrawing = false;
  var completedStrokes = [];
  var isDemoPlaying = false;
  var demoTimer = null;
  var canvasEl = null;
  var ctx = null;
  var guideSvgEl = null;
  var overlayEl = null;
  var pickerOpen = false;
  var activePickerTab = 'hiragana';
  var isCharacterCompleted = false;

  function T(key, fallback) {
    if (root.FiezelI18n && typeof root.FiezelI18n.t === 'function') {
      var res = root.FiezelI18n.t(key);
      if (res && res !== key) return res;
    }
    return fallback || key;
  }

  function getStrokeData(c) {
    if (root.FiezelKakijunData && typeof root.FiezelKakijunData.get === 'function') {
      return root.FiezelKakijunData.get(c);
    }
    return null;
  }

  function getAllChars() {
    if (root.FiezelKakijunData && typeof root.FiezelKakijunData.listAll === 'function') {
      return root.FiezelKakijunData.listAll();
    }
    return ['あ', 'い', 'う', 'え', 'お'];
  }

  function getCharsByScript(script) {
    if (root.FiezelKakijunData && typeof root.FiezelKakijunData.filterByScript === 'function') {
      return root.FiezelKakijunData.filterByScript(script).map(function (item) {
        return item.char;
      });
    }
    return [];
  }

  function speakJapanese(charText) {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(charText);
        u.lang = 'ja-JP';
        u.rate = 0.86;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch (_) {}
  }

  function triggerHaptic(type) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (type === 'success') navigator.vibrate([18]);
        else if (type === 'complete') navigator.vibrate([24, 48, 24]);
        else if (type === 'error') navigator.vibrate([35, 50, 35]);
      }
    } catch (_) {}
  }

  function setupCanvas() {
    if (!canvasEl) return;
    var rect = canvasEl.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvasEl.width = Math.round(rect.width * dpr);
    canvasEl.height = Math.round(rect.height * dpr);
    ctx = canvasEl.getContext('2d');
    ctx.scale(dpr, dpr);
    redraw();
  }

  // Draw traditional Japanese Genko Yoshi / Kanji practice grid (米字格)
  function drawGrid(w, h) {
    if (!ctx) return;
    ctx.save();
    // Warm authentic washi paper base
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, w, h);

    var pad = 12;
    var gw = w - pad * 2;
    var gh = h - pad * 2;

    // Diagonal guidelines (subtle light stone for kanji balance)
    ctx.strokeStyle = '#E8E2D9';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.moveTo(w - pad, pad);
    ctx.lineTo(pad, h - pad);
    ctx.stroke();

    // Center crosshairs (horizontal & vertical)
    ctx.strokeStyle = '#DCD3C7';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(pad, h / 2);
    ctx.lineTo(w - pad, h / 2);
    ctx.moveTo(w / 2, pad);
    ctx.lineTo(w / 2, h - pad);
    ctx.stroke();

    // Outer bounding grid square
    ctx.strokeStyle = '#D1C7BA';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([]);
    ctx.strokeRect(pad, pad, gw, gh);

    ctx.restore();
  }

  function redraw() {
    if (!canvasEl || !ctx) return;
    var rect = canvasEl.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;

    drawGrid(w, h);

    var data = getStrokeData(activeChar);
    if (!data) return;

    var scaleX = w / 109;
    var scaleY = h / 109;

    // In Guided mode, draw authentic calligraphy shadow of full character (見本 / Mihon)
    if (activeMode === 'guided' && !isDemoPlaying) {
      ctx.save();
      ctx.scale(scaleX, scaleY);
      ctx.strokeStyle = '#94A3B8'; // Crisp, authentic slate-400 calligraphy shadow
      ctx.lineWidth = 6.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var k = 0; k < data.strokes.length; k++) {
        try {
          ctx.stroke(new Path2D(data.strokes[k].d));
        } catch (_) {}
      }
      ctx.restore();
    }

    // Draw completed strokes in deep obsidian Sumi black ink
    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 6.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = 0; i < completedStrokes.length; i++) {
      var strokeIdx = completedStrokes[i];
      var s = data.strokes[strokeIdx];
      if (s) {
        try {
          ctx.stroke(new Path2D(s.d));
        } catch (_) {}
      }
    }
    ctx.restore();

    // Draw active user drawing trail in deep obsidian Sumi ink
    if (userPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = Math.max(6.8, w * 0.046);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(userPoints[0].x, userPoints[0].y);
      for (var j = 1; j < userPoints.length; j++) {
        ctx.lineTo(userPoints[j].x, userPoints[j].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    updateGuideOverlay(data);
  }

  function updateGuideOverlay(data) {
    if (!guideSvgEl) return;
    if (activeMode === 'recall' || isDemoPlaying) {
      guideSvgEl.innerHTML = '';
      return;
    }

    if (!data || activeStrokeIndex >= data.strokes.length) {
      guideSvgEl.innerHTML = '';
      return;
    }

    var target = data.strokes[activeStrokeIndex];
    if (!target) {
      guideSvgEl.innerHTML = '';
      return;
    }

    var html = '';
    // Subtle dashed flow guideline indicating stroke trajectory (does NOT obscure shadow or drawing)
    html += '<path d="' + target.d + '" fill="none" stroke="#64748B" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 5" opacity="0.75" />';

    // Position of stroke order number badge
    var nx = (target.numPos && target.numPos[0]) || (target.start && target.start[0]) || 50;
    var ny = (target.numPos && target.numPos[1]) || (target.start && target.start[1]) || 50;
    var order = target.order || (activeStrokeIndex + 1);

    // Number badge circle with pulsating locator ring
    html += '<circle cx="' + nx + '" cy="' + ny + '" r="7.5" fill="none" stroke="#E11D48" stroke-width="1.8" opacity="0.8"><animate attributeName="r" values="5;11;5" dur="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.5s" repeatCount="indefinite" /></circle>';
    html += '<circle cx="' + nx + '" cy="' + ny + '" r="5.6" fill="#E11D48" />';
    html += '<text x="' + nx + '" y="' + ny + '" font-size="5.2" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">' + order + '</text>';

    guideSvgEl.innerHTML = html;
  }

  // Demonstration Animation Player (書き順アニメーション)
  function playDemoAnimation() {
    if (isDemoPlaying) {
      stopDemoAnimation();
      return;
    }

    var data = getStrokeData(activeChar);
    if (!data) return;

    isDemoPlaying = true;
    updateDemoButtonState(true);
    setFeedback(T('jepang.kakijun-sedang-animasi', 'Memperagakan urutan goresan baku...'), 'normal');

    // Build SVG animated strokes
    var svgHtml = '';
    var totalDelay = 0;
    var strokeDuration = 0.65; // seconds per stroke

    for (var i = 0; i < data.strokes.length; i++) {
      var s = data.strokes[i];
      var order = s.order || (i + 1);
      var numX = (s.numPos && s.numPos[0]) || s.start[0];
      var numY = (s.numPos && s.numPos[1]) || s.start[1];
      var delay = i * (strokeDuration + 0.35);

      svgHtml += '<g id="demoStrokeG_' + i + '">';
      // Static ghost track
      svgHtml += '<path d="' + s.d + '" fill="none" stroke="#E2D9CE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />';
      // Animated drawing path
      svgHtml += '<path class="kakijun-demo-anim-path" d="' + s.d + '" fill="none" stroke="#1E293B" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:' + delay + 's; animation-duration:' + strokeDuration + 's;" />';
      // Number badge
      svgHtml += '<circle cx="' + numX + '" cy="' + numY + '" r="4.6" fill="#BE123C" opacity="0" style="animation: fz-kakijun-badge-appear 0.2s ' + delay + 's forwards;" />';
      svgHtml += '<text x="' + numX + '" y="' + numY + '" font-size="4.6" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central" opacity="0" style="animation: fz-kakijun-badge-appear 0.2s ' + delay + 's forwards;">' + order + '</text>';
      svgHtml += '</g>';
      totalDelay = delay + strokeDuration;
    }

    if (guideSvgEl) {
      guideSvgEl.innerHTML = svgHtml;
    }

    demoTimer = setTimeout(function () {
      stopDemoAnimation();
      setFeedback(T('jepang.kakijun-giliran-anda', 'Sekarang giliran Anda! Goreskan mengikuti contoh.'), 'success');
      redraw();
    }, (totalDelay + 0.5) * 1000);
  }

  function stopDemoAnimation() {
    isDemoPlaying = false;
    if (demoTimer) {
      clearTimeout(demoTimer);
      demoTimer = null;
    }
    updateDemoButtonState(false);
    redraw();
  }

  function updateDemoButtonState(playing) {
    var btn = overlayEl && overlayEl.querySelector('#kakijunDemoBtn');
    if (!btn) return;
    if (playing) {
      btn.classList.add('is-playing');
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>' +
                      '<span class="kakijun-text-full">' + T('jepang.kakijun-berhenti', 'Hentikan') + '</span>' +
                      '<span class="kakijun-text-short">' + T('jepang.kakijun-stop-pendek', 'Stop') + '</span>';
    } else {
      btn.classList.remove('is-playing');
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' +
                      '<span class="kakijun-text-full">' + T('jepang.kakijun-animasi', 'Lihat Contoh') + '</span>' +
                      '<span class="kakijun-text-short">' + T('jepang.kakijun-animasi-pendek', 'Contoh') + '</span>';
    }
  }

  function getCanvasCoords(e) {
    if (!canvasEl) return { x: 0, y: 0, vx: 0, vy: 0 };
    var rect = canvasEl.getBoundingClientRect();
    var clientX = e.clientX;
    var clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var vx = Math.max(0, Math.min(109, (x / rect.width) * 109));
    var vy = Math.max(0, Math.min(109, (y / rect.height) * 109));
    return { x: x, y: y, vx: vx, vy: vy };
  }

  function handlePointerDown(e) {
    if (isDemoPlaying) {
      stopDemoAnimation();
    }
    e.preventDefault();
    var data = getStrokeData(activeChar);
    if (!data || activeStrokeIndex >= data.strokes.length) return;

    var coords = getCanvasCoords(e);
    isDrawing = true;
    userPoints = [{ x: coords.x, y: coords.y, vx: coords.vx, vy: coords.vy }];

    var targetStroke = data.strokes[activeStrokeIndex];
    if (targetStroke && targetStroke.start) {
      var dist = Math.hypot(coords.vx - targetStroke.start[0], coords.vy - targetStroke.start[1]);
      if (dist > 30) {
        setFeedback(T('jepang.kakijun-mulai-dari', 'Mulai dari titik goresan ke-') + ' ' + (activeStrokeIndex + 1), 'normal');
      } else {
        setFeedback(T('jepang.kakijun-tarik-garis', 'Goreskan mengikuti arah panduan...'), 'normal');
      }
    }
    redraw();
  }

  function handlePointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var coords = getCanvasCoords(e);
    userPoints.push({ x: coords.x, y: coords.y, vx: coords.vx, vy: coords.vy });
    redraw();
  }

  function handlePointerUp(e) {
    if (!isDrawing) return;
    e.preventDefault();
    isDrawing = false;

    var data = getStrokeData(activeChar);
    if (!data || activeStrokeIndex >= data.strokes.length) return;

    var targetStroke = data.strokes[activeStrokeIndex];
    if (userPoints.length < 3) {
      userPoints = [];
      redraw();
      return;
    }

    var result = validateStroke(userPoints, targetStroke);
    if (result.ok) {
      // Stroke Succeeded
      completedStrokes.push(activeStrokeIndex);
      activeStrokeIndex++;
      userPoints = [];
      triggerHaptic('success');

      if (activeStrokeIndex >= data.strokes.length) {
        onCharacterCompleted(data);
      } else {
        setFeedback(T('jepang.kakijun-bagus', 'Bagus! Lanjut goresan ke-') + ' ' + (activeStrokeIndex + 1), 'success');
      }
    } else {
      // Stroke Failed with precise pedagogical diagnostics
      triggerHaptic('error');
      if (result.reason === 'reversed') {
        setFeedback(T('jepang.kakijun-arah-terbalik', 'Arah goresan terbalik! Tarik dari titik goresan ke-') + ' ' + (activeStrokeIndex + 1), 'error');
      } else if (result.reason === 'bad_start') {
        setFeedback(T('jepang.kakijun-titik-awal-salah', 'Titik awal belum tepat. Mulai dari nomor') + ' ' + (activeStrokeIndex + 1), 'error');
      } else {
        setFeedback(T('jepang.kakijun-coba-lagi', 'Bentuk atau arah goresan belum sesuai. Coba lagi!'), 'error');
      }
      userPoints = [];
    }

    updateStrokeListUI();
    redraw();
  }

  // Pedagogical stroke evaluation against authentic KanjiVG path
  function validateStroke(points, targetStroke) {
    if (!points || points.length < 2) return { ok: false, reason: 'too_short' };

    var uStart = points[0];
    var uEnd = points[points.length - 1];

    // Measure target start and end from SVG path in memory
    var pStart = { x: targetStroke.start[0], y: targetStroke.start[1] };
    var pEnd = { x: targetStroke.start[0], y: targetStroke.start[1] };

    try {
      var pEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pEl.setAttribute('d', targetStroke.d);
      var totalLen = pEl.getTotalLength();
      if (totalLen > 0) {
        var sp = pEl.getPointAtLength(0);
        var ep = pEl.getPointAtLength(totalLen);
        pStart = { x: sp.x, y: sp.y };
        pEnd = { x: ep.x, y: ep.y };
      }
    } catch (_) {}

    var distStart = Math.hypot(uStart.vx - pStart.x, uStart.vy - pStart.y);
    var distEnd = Math.hypot(uEnd.vx - pEnd.x, uEnd.vy - pEnd.y);

    // Check Reverse Stroke (drew backwards)
    var distRevStart = Math.hypot(uStart.vx - pEnd.x, uStart.vy - pEnd.y);
    var distRevEnd = Math.hypot(uEnd.vx - pStart.x, uEnd.vy - pStart.y);
    if (distRevStart < 22 && distRevEnd < 22 && Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y) > 20) {
      return { ok: false, reason: 'reversed' };
    }

    // Proximity tolerances in 109-unit coordinate space
    if (distStart > 28) {
      return { ok: false, reason: 'bad_start' };
    }
    if (distEnd > 34) {
      return { ok: false, reason: 'bad_end' };
    }

    return { ok: true };
  }

  function onCharacterCompleted(data) {
    setFeedback(T('jepang.kakijun-sempurna', 'Sempurna! Karakter ') + data.char + T('jepang.kakijun-berhasil-ditulis', ' berhasil ditulis!'), 'success');
    triggerHaptic('complete');
    speakJapanese(data.char);

    // Emit Braincore Telemetry: genuine learner mastery update
    try {
      if (typeof root.updateMastery === 'function') {
        root.updateMastery('ja_kana_' + data.char, true);
      }
    } catch (_) {}

    // Show celebratory next button
    isCharacterCompleted = true;
    var actionBtn = overlayEl && overlayEl.querySelector('#kakijunNextActionBtn');
    if (actionBtn) {
      actionBtn.classList.remove('kakijun-btn-primary');
      actionBtn.classList.add('kakijun-btn-success');
      actionBtn.innerHTML = '<span class="kakijun-text-full">' + T('jepang.kakijun-lanjut', 'Lanjut ke Huruf Berikutnya →') + '</span>' +
                            '<span class="kakijun-text-short">' + T('jepang.kakijun-lanjut-pendek', 'Lanjut →') + '</span>';
    }
  }

  function handleNextActionClick() {
    if (isCharacterCompleted) {
      nextCharacter();
    } else {
      resetCanvas();
    }
  }

  function setFeedback(msg, kind) {
    var fb = overlayEl && overlayEl.querySelector('#kakijunFeedback');
    if (!fb) return;
    fb.textContent = msg;
    fb.className = 'kakijun-feedback-bar' + (kind === 'success' ? ' is-success' : kind === 'error' ? ' is-error' : '');
  }

  function updateStrokeListUI() {
    var data = getStrokeData(activeChar);
    var listEl = overlayEl && overlayEl.querySelector('#kakijunStrokeList');
    if (!listEl || !data) return;

    var html = '';
    for (var i = 0; i < data.strokes.length; i++) {
      var s = data.strokes[i];
      var isDone = completedStrokes.indexOf(i) !== -1;
      var isCurrent = (i === activeStrokeIndex);
      var cls = 'kakijun-stroke-item' + (isDone ? ' is-done' : isCurrent ? ' is-current' : '');
      var statusIcon = isDone ? '✓' : String(i + 1);
      html += '<div class="' + cls + '">';
      html += '<div class="kakijun-stroke-num">' + statusIcon + '</div>';
      html += '<div class="kakijun-stroke-hint">' + s.hint + '</div>';
      html += '</div>';
    }
    listEl.innerHTML = html;
  }

  function resetCanvas() {
    stopDemoAnimation();
    isCharacterCompleted = false;
    activeStrokeIndex = 0;
    completedStrokes = [];
    userPoints = [];
    setFeedback(T('jepang.kakijun-petunjuk-awal', 'Goreskan mengikuti nomor dan arah panah'), 'normal');
    updateStrokeListUI();
    var actionBtn = overlayEl && overlayEl.querySelector('#kakijunNextActionBtn');
    if (actionBtn) {
      actionBtn.classList.remove('kakijun-btn-success');
      actionBtn.classList.add('kakijun-btn-primary');
      actionBtn.innerHTML = '<span class="kakijun-text-full">' + T('jepang.kakijun-ulangi', 'Ulangi dari Awal') + '</span>' +
                            '<span class="kakijun-text-short">' + T('jepang.kakijun-ulangi-pendek', 'Ulangi') + '</span>';
    }
    redraw();
  }

  function undoLastStroke() {
    if (activeStrokeIndex > 0) {
      activeStrokeIndex--;
      completedStrokes.pop();
      userPoints = [];
      setFeedback(T('jepang.kakijun-batal', 'Goresan terakhir dibatalkan. Lanjut goresan ke-') + ' ' + (activeStrokeIndex + 1), 'normal');
      updateStrokeListUI();
      redraw();
    }
  }

  function getActiveScriptChars() {
    var chars = getCharsByScript(activeScript);
    if (!chars || chars.length === 0) {
      chars = getAllChars();
    }
    return chars;
  }

  function nextCharacter() {
    var all = getActiveScriptChars();
    var idx = all.indexOf(activeChar);
    var nextIdx = (idx + 1) % all.length;
    setCharacter(all[nextIdx]);
  }

  function prevCharacter() {
    var all = getActiveScriptChars();
    var idx = all.indexOf(activeChar);
    var prevIdx = (idx - 1 + all.length) % all.length;
    setCharacter(all[prevIdx]);
  }

  function setCharacter(c) {
    var data = getStrokeData(c);
    if (!data) return;
    stopDemoAnimation();
    activeChar = c;
    activeScript = data.script;
    activeStrokeIndex = 0;
    completedStrokes = [];
    userPoints = [];
    isCharacterCompleted = false;

    // Update UI headers
    if (overlayEl) {
      var glyphEl = overlayEl.querySelector('#kakijunCharGlyph');
      if (glyphEl) glyphEl.textContent = data.char;
      var romajiEl = overlayEl.querySelector('#kakijunCharRomaji');
      if (romajiEl) romajiEl.textContent = data.romaji;
      var meaningEl = overlayEl.querySelector('#kakijunCharMeaning');
      if (meaningEl) {
        meaningEl.textContent = data.meaning ? data.meaning : '';
        meaningEl.style.display = data.meaning ? 'block' : 'none';
      }
      var countEl = overlayEl.querySelector('#kakijunStrokeTotal');
      if (countEl) countEl.textContent = data.strokeCount + ' ' + T('jepang.kakijun-goresan', 'goresan');

      // Update mobile pill
      var mobileGlyphEl = overlayEl.querySelector('#kakijunMobileGlyph');
      if (mobileGlyphEl) mobileGlyphEl.textContent = data.char;
      var mobileRomajiEl = overlayEl.querySelector('#kakijunMobileRomaji');
      if (mobileRomajiEl) mobileRomajiEl.textContent = data.romaji;
    }

    setFeedback(T('jepang.kakijun-petunjuk-awal', 'Goreskan mengikuti nomor dan arah panah'), 'normal');
    updateStrokeListUI();
    var actionBtn = overlayEl && overlayEl.querySelector('#kakijunNextActionBtn');
    if (actionBtn) {
      actionBtn.classList.remove('kakijun-btn-success');
      actionBtn.classList.add('kakijun-btn-primary');
      actionBtn.innerHTML = '<span class="kakijun-text-full">' + T('jepang.kakijun-ulangi', 'Ulangi dari Awal') + '</span>' +
                            '<span class="kakijun-text-short">' + T('jepang.kakijun-ulangi-pendek', 'Ulangi') + '</span>';
    }
    redraw();
    speakJapanese(data.char);
  }

  function setMode(mode) {
    activeMode = mode;
    if (overlayEl) {
      var btns = overlayEl.querySelectorAll('[data-kakijun-mode]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('is-active', btns[i].getAttribute('data-kakijun-mode') === mode);
      }
    }
    resetCanvas();
  }

  // Character Grid Picker Drawer
  function togglePicker(openState) {
    pickerOpen = (typeof openState === 'boolean') ? openState : !pickerOpen;
    var drawer = overlayEl && overlayEl.querySelector('#kakijunPickerDrawer');
    if (!drawer) return;
    if (pickerOpen) {
      renderPickerContent();
      drawer.classList.add('is-open');
    } else {
      drawer.classList.remove('is-open');
    }
  }

  function setPickerTab(tab) {
    activePickerTab = tab;
    renderPickerContent();
  }

  function renderPickerContent() {
    var drawer = overlayEl && overlayEl.querySelector('#kakijunPickerDrawer');
    if (!drawer) return;

    var chars = getCharsByScript(activePickerTab);
    var html = '<div class="kakijun-picker-header">' +
      '<div class="kakijun-picker-tabs">' +
        '<button type="button" class="kakijun-picker-tab ' + (activePickerTab === 'hiragana' ? 'is-active' : '') + '" data-picker-tab="hiragana">Hiragana (46)</button>' +
        '<button type="button" class="kakijun-picker-tab ' + (activePickerTab === 'katakana' ? 'is-active' : '') + '" data-picker-tab="katakana">Katakana (46)</button>' +
        '<button type="button" class="kakijun-picker-tab ' + (activePickerTab === 'kanji' ? 'is-active' : '') + '" data-picker-tab="kanji">Kanji N5 (44)</button>' +
      '</div>' +
      '<button type="button" class="kakijun-picker-close-btn" id="kakijunPickerCloseBtn" aria-label="' + T('jepang.kakijun-tutup', 'Tutup') + '">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
      '</button>' +
    '</div>' +
    '<div class="kakijun-picker-grid">';

    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      var isCurrent = (ch === activeChar);
      html += '<button type="button" class="kakijun-picker-item ' + (isCurrent ? 'is-current' : '') + '" data-char-target="' + ch + '">' + ch + '</button>';
    }
    html += '</div>';
    drawer.innerHTML = html;

    // Attach picker events
    var closeBtn = drawer.querySelector('#kakijunPickerCloseBtn');
    if (closeBtn) closeBtn.onclick = function () { togglePicker(false); };

    var tabs = drawer.querySelectorAll('[data-picker-tab]');
    for (var t = 0; t < tabs.length; t++) {
      (function (btn) {
        btn.onclick = function () {
          setPickerTab(btn.getAttribute('data-picker-tab'));
        };
      })(tabs[t]);
    }

    var items = drawer.querySelectorAll('[data-char-target]');
    for (var m = 0; m < items.length; m++) {
      (function (btn) {
        btn.onclick = function () {
          var target = btn.getAttribute('data-char-target');
          setCharacter(target);
          togglePicker(false);
        };
      })(items[m]);
    }
  }

  function renderMarkup(charData) {
    var c = charData.char;
    var r = charData.romaji;
    var meaning = charData.meaning || '';
    var totalStrokes = charData.strokeCount;

    return '<div class="kakijun-overlay" id="kakijunOverlay" role="dialog" aria-modal="true" aria-label="Studio Menulis Huruf Jepang">' +
      '<div class="kakijun-modal">' +
        '<div class="kakijun-header">' +
          '<div class="kakijun-header-left">' +
            '<div class="kakijun-brand-wrap">' +
              '<span class="kakijun-badge">Kakijun Studio</span>' +
              '<h2 class="kakijun-title">' + T('jepang.kakijun-judul', 'Studio Menulis & Urutan Goresan') + '</h2>' +
            '</div>' +
            // Mobile character pill in top header (no vertical waste)
            '<div class="kakijun-mobile-char-pill" id="kakijunMobileCharPill">' +
              '<span class="kakijun-mobile-glyph" id="kakijunMobileGlyph" lang="ja">' + c + '</span>' +
              '<span class="kakijun-mobile-romaji" id="kakijunMobileRomaji">' + r + '</span>' +
              '<button type="button" class="kakijun-mobile-audio-btn" id="kakijunMobileAudioBtn" aria-label="Dengarkan pengucapan">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="kakijun-header-right">' +
            '<button type="button" class="kakijun-info-toggle-btn" id="kakijunInfoToggleBtn" aria-label="Lihat Informasi Huruf">' +
              '<span>📋 ' + T('jepang.kakijun-info', 'Info') + '</span>' +
            '</button>' +
            '<button type="button" class="kakijun-header-btn" id="kakijunOpenPickerBtn">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' +
              '<span class="kakijun-text-full">' + T('jepang.kakijun-pilih-huruf', 'Pilih Huruf') + '</span>' +
              '<span class="kakijun-text-short">' + T('jepang.kakijun-huruf', 'Huruf') + '</span>' +
            '</button>' +
            '<button type="button" class="kakijun-close-btn" id="kakijunCloseBtn" aria-label="' + T('jepang.kakijun-tutup', 'Tutup Studio') + '">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="kakijun-body">' +
          // Drawer backdrop for mobile bottom sheet
          '<div class="kakijun-drawer-backdrop" id="kakijunDrawerBackdrop"></div>' +
          // Left Panel: Character Profile & Breakdown (Desktop Side Column / Mobile Bottom Sheet)
          '<div class="kakijun-info-panel" id="kakijunInfoPanel">' +
            '<div class="kakijun-drawer-handle-bar">' +
              '<div class="kakijun-drawer-pill"></div>' +
              '<button type="button" class="kakijun-drawer-close-btn" id="kakijunDrawerCloseBtn" aria-label="' + T('jepang.kakijun-tutup-info', 'Tutup panel info') + '">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
              '</button>' +
            '</div>' +
            '<div class="kakijun-char-card">' +
              '<div class="kakijun-char-display">' +
                '<span class="kakijun-char-glyph" id="kakijunCharGlyph" lang="ja">' + c + '</span>' +
                '<div class="kakijun-char-meta">' +
                  '<span class="kakijun-char-romaji" id="kakijunCharRomaji">' + r + '</span>' +
                  '<span class="kakijun-char-meaning" id="kakijunCharMeaning" style="' + (meaning ? '' : 'display:none;') + '">' + meaning + '</span>' +
                '</div>' +
              '</div>' +
              '<small id="kakijunStrokeTotal" style="color:#6E635C;font-weight:700;">' + totalStrokes + ' ' + T('jepang.kakijun-goresan', 'goresan') + '</small>' +
              '<button type="button" class="kakijun-voice-btn" id="kakijunVoiceBtn" aria-label="Dengarkan pengucapan">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>' +
                '<span>' + T('jepang.kakijun-suara', 'Dengarkan Suara') + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="kakijun-mode-switcher">' +
              '<button type="button" class="kakijun-mode-btn ' + (activeMode === 'guided' ? 'is-active' : '') + '" data-kakijun-mode="guided">' +
                '<span>🎯 ' + T('jepang.kakijun-mode-dipandu', 'Dipandu') + '</span>' +
              '</button>' +
              '<button type="button" class="kakijun-mode-btn ' + (activeMode === 'recall' ? 'is-active' : '') + '" data-kakijun-mode="recall">' +
                '<span>🧠 ' + T('jepang.kakijun-mode-ingatan', 'Ingatan') + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="kakijun-stroke-list" id="kakijunStrokeList"></div>' +
          '</div>' +
          // Right Panel: Genko Yoshi Canvas Workbench
          '<div class="kakijun-canvas-panel">' +
            '<div class="kakijun-feedback-bar" id="kakijunFeedback">' + T('jepang.kakijun-petunjuk-awal', 'Goreskan mengikuti nomor dan arah panah') + '</div>' +
            '<div class="kakijun-canvas-wrapper" id="kakijunCanvasWrap">' +
              '<canvas class="kakijun-canvas" id="kakijunCanvas"></canvas>' +
              '<svg class="kakijun-guide-overlay" id="kakijunGuideSvg" viewBox="0 0 109 109" preserveAspectRatio="none"></svg>' +
            '</div>' +
            '<div class="kakijun-toolbar">' +
              '<button type="button" class="kakijun-mobile-nav-btn" id="kakijunMobilePrevBtn" aria-label="Huruf Sebelumnya">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
              '</button>' +
              '<button type="button" class="kakijun-btn kakijun-btn-demo" id="kakijunDemoBtn" aria-label="Lihat contoh animasi goresan">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' +
                '<span class="kakijun-text-full">' + T('jepang.kakijun-animasi', 'Lihat Contoh') + '</span>' +
                '<span class="kakijun-text-short">' + T('jepang.kakijun-animasi-pendek', 'Contoh') + '</span>' +
              '</button>' +
              '<button type="button" class="kakijun-btn kakijun-btn-ghost" id="kakijunUndoBtn" aria-label="Batalkan goresan terakhir">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>' +
                '<span class="kakijun-text-full">' + T('jepang.kakijun-urungkan', 'Urungkan') + '</span>' +
                '<span class="kakijun-text-short">' + T('jepang.kakijun-urungkan-pendek', 'Batal') + '</span>' +
              '</button>' +
              '<button type="button" class="kakijun-btn kakijun-btn-primary" id="kakijunNextActionBtn">' +
                '<span class="kakijun-text-full">' + T('jepang.kakijun-ulangi', 'Ulangi dari Awal') + '</span>' +
                '<span class="kakijun-text-short">' + T('jepang.kakijun-ulangi-pendek', 'Ulangi') + '</span>' +
              '</button>' +
              '<button type="button" class="kakijun-mobile-nav-btn" id="kakijunMobileNextBtn" aria-label="Huruf Berikutnya">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
              '</button>' +
            '</div>' +
            '<div class="kakijun-footer-nav">' +
              '<button type="button" class="kakijun-nav-btn" id="kakijunPrevBtn">' +
                '<span>' + T('jepang.kakijun-sebelumnya', '← Karakter Sebelumnya') + '</span>' +
              '</button>' +
              '<button type="button" class="kakijun-nav-btn" id="kakijunNextBtn">' +
                '<span>' + T('jepang.kakijun-berikutnya', 'Karakter Berikutnya →') + '</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        // Character Picker Drawer
        '<div class="kakijun-picker-drawer" id="kakijunPickerDrawer"></div>' +
      '</div>' +
    '</div>';
  }

  function open(char, romaji, script) {
    var c = char || 'あ';
    var data = getStrokeData(c);
    if (!data) {
      c = 'あ';
      data = getStrokeData(c);
    }
    activeChar = c;
    activeScript = (data && data.script) || script || 'hiragana';
    activePickerTab = activeScript;
    activeStrokeIndex = 0;
    completedStrokes = [];
    userPoints = [];
    isDemoPlaying = false;
    isCharacterCompleted = false;
    pickerOpen = false;

    // Remove existing if any
    close();

    var div = document.createElement('div');
    div.id = 'kakijunMountHost';
    div.innerHTML = renderMarkup(data);
    document.body.appendChild(div);
    overlayEl = document.getElementById('kakijunOverlay');

    canvasEl = document.getElementById('kakijunCanvas');
    guideSvgEl = document.getElementById('kakijunGuideSvg');

    setupCanvas();
    updateStrokeListUI();

    // Drawer toggle for mobile bottom sheet
    function toggleInfoDrawer(forceState) {
      var panel = overlayEl && overlayEl.querySelector('#kakijunInfoPanel');
      var backdrop = overlayEl && overlayEl.querySelector('#kakijunDrawerBackdrop');
      if (!panel || !backdrop) return;
      var shouldOpen = typeof forceState === 'boolean' ? forceState : !panel.classList.contains('is-open');
      if (shouldOpen) {
        panel.classList.add('is-open');
        backdrop.classList.add('is-open');
      } else {
        panel.classList.remove('is-open');
        backdrop.classList.remove('is-open');
      }
    }

    // Event Bindings
    var closeBtn = document.getElementById('kakijunCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);

    if (overlayEl) {
      overlayEl.addEventListener('click', function (e) {
        if (e.target === overlayEl) close();
      });

      // Strict mobile gesture / pinch-to-zoom locks
      overlayEl.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches.length > 1) {
          e.preventDefault();
        }
      }, { passive: false });

      overlayEl.addEventListener('gesturestart', function (e) { e.preventDefault(); });
      overlayEl.addEventListener('gesturechange', function (e) { e.preventDefault(); });
      overlayEl.addEventListener('gestureend', function (e) { e.preventDefault(); });
    }

    var infoToggleBtn = document.getElementById('kakijunInfoToggleBtn');
    if (infoToggleBtn) infoToggleBtn.addEventListener('click', function () {
      toggleInfoDrawer();
    });

    var drawerCloseBtn = document.getElementById('kakijunDrawerCloseBtn');
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', function () {
      toggleInfoDrawer(false);
    });

    var drawerBackdrop = document.getElementById('kakijunDrawerBackdrop');
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', function () {
      toggleInfoDrawer(false);
    });

    var mobileAudioBtn = document.getElementById('kakijunMobileAudioBtn');
    if (mobileAudioBtn) mobileAudioBtn.addEventListener('click', function () {
      speakJapanese(activeChar);
    });

    var pickerBtn = document.getElementById('kakijunOpenPickerBtn');
    if (pickerBtn) pickerBtn.addEventListener('click', function () {
      togglePicker();
    });

    var demoBtn = document.getElementById('kakijunDemoBtn');
    if (demoBtn) demoBtn.addEventListener('click', playDemoAnimation);

    var voiceBtn = document.getElementById('kakijunVoiceBtn');
    if (voiceBtn) voiceBtn.addEventListener('click', function () {
      speakJapanese(activeChar);
    });

    var undoBtn = document.getElementById('kakijunUndoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoLastStroke);

    // Single unified handler for next/reset action button
    var nextActionBtn = document.getElementById('kakijunNextActionBtn');
    if (nextActionBtn) nextActionBtn.addEventListener('click', handleNextActionClick);

    // Desktop footer navigation
    var prevBtn = document.getElementById('kakijunPrevBtn');
    if (prevBtn) prevBtn.addEventListener('click', prevCharacter);

    var nextBtn = document.getElementById('kakijunNextBtn');
    if (nextBtn) nextBtn.addEventListener('click', nextCharacter);

    // Mobile toolbar navigation
    var mobilePrevBtn = document.getElementById('kakijunMobilePrevBtn');
    if (mobilePrevBtn) mobilePrevBtn.addEventListener('click', prevCharacter);

    var mobileNextBtn = document.getElementById('kakijunMobileNextBtn');
    if (mobileNextBtn) mobileNextBtn.addEventListener('click', nextCharacter);

    var modeBtns = overlayEl.querySelectorAll('[data-kakijun-mode]');
    for (var m = 0; m < modeBtns.length; m++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          setMode(btn.getAttribute('data-kakijun-mode') || 'guided');
        });
      })(modeBtns[m]);
    }

    // Pointer events for Canvas
    if (canvasEl) {
      canvasEl.addEventListener('pointerdown', handlePointerDown);
      canvasEl.addEventListener('pointermove', handlePointerMove);
      canvasEl.addEventListener('pointerup', handlePointerUp);
      canvasEl.addEventListener('pointercancel', handlePointerUp);
    }

    window.addEventListener('resize', setupCanvas);
    speakJapanese(activeChar);
  }

  function close() {
    stopDemoAnimation();
    window.removeEventListener('resize', setupCanvas);
    var host = document.getElementById('kakijunMountHost');
    if (host) host.remove();
    overlayEl = null;
    canvasEl = null;
    ctx = null;
    guideSvgEl = null;
  }

  var FiezelKakijunStudio = {
    open: open,
    close: close,
    setCharacter: setCharacter,
    setMode: setMode,
    resetCanvas: resetCanvas,
    playDemo: playDemoAnimation,
    stopDemo: stopDemoAnimation,
    speak: speakJapanese
  };

  root.FiezelKakijunStudio = FiezelKakijunStudio;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelKakijunStudio;
  }
})(typeof self !== 'undefined' ? self : globalThis);
