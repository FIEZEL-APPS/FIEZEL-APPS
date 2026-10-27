/* ==========================================================================
   FIEZEL KAKIJUN STUDIO (書き順 / Japanese Stroke Order Writing Canvas)
   Interactive handwriting engine with Genkō Yōshi grid, guided tracing,
   memory recall mode, real-time vector validation, audio pronunciation,
   and Braincore telemetry.
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
  var canvasEl = null;
  var ctx = null;
  var guideSvgEl = null;
  var overlayEl = null;

  var GOJUON_LIST = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'を', 'ん',
    // Katakana
    'ア', 'イ', 'ウ', 'エ', 'オ',
    'カ', 'シ', 'ス', 'セ', 'ソ',
    'タ', 'ツ', 'ン',
    // N5 Kanji
    '一', '二', '三', '人', '日'
  ];

  function T(key, fallback) {
    if (root.FiezelI18n && typeof root.FiezelI18n.t === 'function') {
      return root.FiezelI18n.t(key, fallback || key);
    }
    return fallback || key;
  }

  function getStrokeData(c) {
    if (root.FiezelKakijunData && typeof root.FiezelKakijunData.get === 'function') {
      return root.FiezelKakijunData.get(c);
    }
    return null;
  }

  function speakJapanese(charText, romaji) {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(charText);
        u.lang = 'ja-JP';
        u.rate = 0.88;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch (_) {}
  }

  function triggerHaptic(type) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (type === 'success') navigator.vibrate([16]);
        else if (type === 'complete') navigator.vibrate([20, 40, 20]);
        else if (type === 'error') navigator.vibrate([35, 45, 35]);
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

  function drawGrid(w, h) {
    if (!ctx) return;
    ctx.save();
    // Warm Genkō Yōshi paper base
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, w, h);

    // Dashed center grid crosshairs (slate/sand)
    ctx.strokeStyle = '#D9CEC3';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(14, h / 2);
    ctx.lineTo(w - 14, h / 2);
    ctx.stroke();

    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(w / 2, 14);
    ctx.lineTo(w / 2, h - 14);
    ctx.stroke();

    // Outer bounding grid square
    ctx.strokeStyle = '#C9BCB0';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.restore();
  }

  function drawPathFromPoints(points, color, width) {
    if (!ctx || points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
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

    // Draw completed strokes (deep rich obsidian ink with smooth tips)
    for (var i = 0; i < completedStrokes.length; i++) {
      var stroke = data.strokes[i];
      if (stroke) {
        var strokePoints = scaleNormalizedPoints(stroke.d, w, h);
        drawPathFromPoints(strokePoints, '#1E293B', Math.max(9, w * 0.032));
      }
    }

    // If currently drawing active stroke, render live trail
    if (userPoints.length > 1) {
      drawPathFromPoints(userPoints, '#7E2D3B', Math.max(8, w * 0.028));
    }

    updateGuideOverlay(w, h, data);
  }

  function scaleNormalizedPoints(svgD, w, h) {
    // Generate sample points from standard normalized 100x100 SVG path
    var points = [];
    var parts = svgD.split(' ');
    var cur = { x: 0, y: 0 };
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === 'M' || p === 'L') {
        var coords = parts[++i].split(',');
        cur = { x: (parseFloat(coords[0]) / 100) * w, y: (parseFloat(coords[1]) / 100) * h };
        points.push(cur);
      } else if (p === 'Q') {
        var cp = parts[++i].split(',');
        var ep = parts[++i].split(',');
        var cpx = (parseFloat(cp[0]) / 100) * w, cpy = (parseFloat(cp[1]) / 100) * h;
        var epx = (parseFloat(ep[0]) / 100) * w, epy = (parseFloat(ep[1]) / 100) * h;
        // Sample quadratic curve points
        for (var t = 0.25; t <= 1; t += 0.25) {
          var x = (1 - t) * (1 - t) * cur.x + 2 * (1 - t) * t * cpx + t * t * epx;
          var y = (1 - t) * (1 - t) * cur.y + 2 * (1 - t) * t * cpy + t * t * epy;
          points.push({ x: x, y: y });
        }
        cur = { x: epx, y: epy };
      } else if (p === 'C') {
        var cp1 = parts[++i].split(',');
        var cp2 = parts[++i].split(',');
        var ep2 = parts[++i].split(',');
        var cpx1 = (parseFloat(cp1[0]) / 100) * w, cpy1 = (parseFloat(cp1[1]) / 100) * h;
        var cpx2 = (parseFloat(cp2[0]) / 100) * w, cpy2 = (parseFloat(cp2[1]) / 100) * h;
        var epx2 = (parseFloat(ep2[0]) / 100) * w, epy2 = (parseFloat(ep2[1]) / 100) * h;
        for (var t2 = 0.2; t2 <= 1; t2 += 0.2) {
          var omt = 1 - t2;
          var cx = omt * omt * omt * cur.x + 3 * omt * omt * t2 * cpx1 + 3 * omt * t2 * t2 * cpx2 + t2 * t2 * t2 * epx2;
          var cy = omt * omt * omt * cur.y + 3 * omt * omt * t2 * cpy1 + 3 * omt * t2 * t2 * cpy2 + t2 * t2 * t2 * epy2;
          points.push({ x: cx, y: cy });
        }
        cur = { x: epx2, y: epy2 };
      }
    }
    return points;
  }

  function updateGuideOverlay(w, h, data) {
    if (!guideSvgEl) return;
    if (activeMode === 'recall') {
      guideSvgEl.innerHTML = '';
      return;
    }

    var html = '';
    // Draw ghost outlines of remaining strokes
    for (var i = activeStrokeIndex; i < data.strokes.length; i++) {
      var s = data.strokes[i];
      var isCurrent = (i === activeStrokeIndex);
      var strokeColor = isCurrent ? 'rgba(126, 45, 59, 0.38)' : 'rgba(180, 168, 156, 0.25)';
      var strokeWidth = isCurrent ? 8 : 6;
      html += '<path d="' + s.d + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />';
      if (isCurrent) {
        // Draw start number indicator bead
        var sx = s.start[0];
        var sy = s.start[1];
        html += '<circle cx="' + sx + '" cy="' + sy + '" r="5" fill="#7E2D3B" />';
        html += '<text x="' + sx + '" y="' + (sy + 1.8) + '" font-size="4.2" font-weight="bold" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">' + (i + 1) + '</text>';
        // Direction arrow bead near start pointing towards direction
        var ex = s.end[0];
        var ey = s.end[1];
        var dx = ex - sx;
        var dy = ey - sy;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var arrowX = sx + (dx / len) * 12;
        var arrowY = sy + (dy / len) * 12;
        html += '<circle cx="' + arrowX + '" cy="' + arrowY + '" r="2.2" fill="#D97706" opacity="0.88"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" /></circle>';
      }
    }
    guideSvgEl.innerHTML = html;
  }

  function getCanvasCoords(e) {
    if (!canvasEl) return { x: 0, y: 0, nx: 0, ny: 0 };
    var rect = canvasEl.getBoundingClientRect();
    var clientX = e.clientX;
    var clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var nx = Math.max(0, Math.min(100, (x / rect.width) * 100));
    var ny = Math.max(0, Math.min(100, (y / rect.height) * 100));
    return { x: x, y: y, nx: nx, ny: ny };
  }

  function handlePointerDown(e) {
    e.preventDefault();
    var data = getStrokeData(activeChar);
    if (!data || activeStrokeIndex >= data.strokes.length) return;

    var coords = getCanvasCoords(e);
    isDrawing = true;
    userPoints = [{ x: coords.x, y: coords.y, nx: coords.nx, ny: coords.ny }];

    // Start-point proximity check against current stroke
    var targetStroke = data.strokes[activeStrokeIndex];
    var dist = Math.sqrt(Math.pow(coords.nx - targetStroke.start[0], 2) + Math.pow(coords.ny - targetStroke.start[1], 2));

    // If starting too far away (> 28 units in 100-grid)
    if (dist > 28) {
      setFeedback('Urutan goresan belum tepat. Mulai dari titik goresan ke-' + (activeStrokeIndex + 1), 'error');
      triggerHaptic('error');
    } else {
      setFeedback('Goreskan ke arah yang dipandu...', 'normal');
    }
    redraw();
  }

  function handlePointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var coords = getCanvasCoords(e);
    userPoints.push({ x: coords.x, y: coords.y, nx: coords.nx, ny: coords.ny });
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

    var startP = userPoints[0];
    var endP = userPoints[userPoints.length - 1];

    var startDist = Math.sqrt(Math.pow(startP.nx - targetStroke.start[0], 2) + Math.pow(startP.ny - targetStroke.start[1], 2));
    var endDist = Math.sqrt(Math.pow(endP.nx - targetStroke.end[0], 2) + Math.pow(endP.ny - targetStroke.end[1], 2));

    // Vector direction alignment
    var targetDx = targetStroke.end[0] - targetStroke.start[0];
    var targetDy = targetStroke.end[1] - targetStroke.start[1];
    var userDx = endP.nx - startP.nx;
    var userDy = endP.ny - startP.ny;
    var dot = (targetDx * userDx + targetDy * userDy);

    // Validation thresholds: start <= 30, end <= 34, dot >= -0.2 (allowing curves/loops)
    var isValid = (startDist <= 30 && endDist <= 34 && (targetStroke.direction === 'loop' || dot >= -0.2));

    if (isValid) {
      // Stroke Succeeded!
      completedStrokes.push(activeStrokeIndex);
      activeStrokeIndex++;
      userPoints = [];
      triggerHaptic('success');

      if (activeStrokeIndex >= data.strokes.length) {
        // Character Completed!
        onCharacterCompleted(data);
      } else {
        setFeedback(T('jepang.kakijun-bagus', 'Bagus! Lanjut goresan ke-') + ' ' + (activeStrokeIndex + 1), 'success');
      }
    } else {
      // Stroke Failed
      triggerHaptic('error');
      setFeedback(T('jepang.kakijun-coba-lagi', 'Bentuk atau arah goresan belum sesuai. Coba lagi!'), 'error');
      userPoints = [];
    }

    updateStrokeListUI();
    redraw();
  }

  function onCharacterCompleted(data) {
    setFeedback('Sempurna! Karakter ' + data.char + ' berhasil ditulis!', 'success');
    triggerHaptic('complete');
    speakJapanese(data.char, data.romaji);

    // Emit Braincore Telemetry: genuine learner mastery update
    try {
      if (typeof root.updateMastery === 'function') {
        root.updateMastery('ja_kana_' + data.char, true);
      }
    } catch (_) {}

    // Show celebratory next button
    var actionBtn = overlayEl && overlayEl.querySelector('#kakijunNextActionBtn');
    if (actionBtn) {
      actionBtn.classList.remove('kakijun-btn-primary');
      actionBtn.classList.add('kakijun-btn-success');
      actionBtn.innerHTML = '<span>' + T('jepang.kakijun-lanjut', 'Lanjut ke Huruf Berikutnya →') + '</span>';
      actionBtn.onclick = function () {
        nextCharacter();
      };
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
      var isDone = (i < activeStrokeIndex);
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
    activeStrokeIndex = 0;
    completedStrokes = [];
    userPoints = [];
    setFeedback('Goreskan mengikuti nomor dan arah panah', 'normal');
    updateStrokeListUI();
    var actionBtn = overlayEl && overlayEl.querySelector('#kakijunNextActionBtn');
    if (actionBtn) {
      actionBtn.classList.remove('kakijun-btn-success');
      actionBtn.classList.add('kakijun-btn-primary');
      actionBtn.innerHTML = '<span>Ulangi dari Awal</span>';
      actionBtn.onclick = resetCanvas;
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

  function nextCharacter() {
    var idx = GOJUON_LIST.indexOf(activeChar);
    var nextIdx = (idx + 1) % GOJUON_LIST.length;
    setCharacter(GOJUON_LIST[nextIdx]);
  }

  function prevCharacter() {
    var idx = GOJUON_LIST.indexOf(activeChar);
    var prevIdx = (idx - 1 + GOJUON_LIST.length) % GOJUON_LIST.length;
    setCharacter(GOJUON_LIST[prevIdx]);
  }

  function setCharacter(c) {
    var data = getStrokeData(c);
    if (!data) return;
    activeChar = c;
    activeScript = data.script;
    activeStrokeIndex = 0;
    completedStrokes = [];
    userPoints = [];

    // Update UI headers
    if (overlayEl) {
      var glyphEl = overlayEl.querySelector('#kakijunCharGlyph');
      if (glyphEl) glyphEl.textContent = data.char;
      var romajiEl = overlayEl.querySelector('#kakijunCharRomaji');
      if (romajiEl) romajiEl.textContent = data.romaji;
      var countEl = overlayEl.querySelector('#kakijunStrokeTotal');
      if (countEl) countEl.textContent = data.strokeCount + ' goresan';
    }

    setFeedback('Goreskan mengikuti nomor dan arah panah', 'normal');
    updateStrokeListUI();
    redraw();
    speakJapanese(data.char, data.romaji);
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

  function renderMarkup(charData) {
    var c = charData.char;
    var r = charData.romaji;
    var s = charData.script;
    var totalStrokes = charData.strokeCount;

    return '<div class="kakijun-overlay" id="kakijunOverlay" role="dialog" aria-modal="true" aria-label="Studio Menulis Huruf Jepang">' +
      '<div class="kakijun-modal">' +
        '<div class="kakijun-header">' +
          '<div class="kakijun-header-left">' +
            '<span class="kakijun-badge">Kakijun Studio</span>' +
            '<h2 class="kakijun-title">Studio Menulis & Urutan Goresan</h2>' +
          '</div>' +
          '<button type="button" class="kakijun-close-btn" id="kakijunCloseBtn" aria-label="' + T('jepang.kakijun-tutup', 'Tutup Studio') + '">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
        '</div>' +
        '<div class="kakijun-body">' +
          // Left Panel: Character Profile & Breakdown
          '<div class="kakijun-info-panel">' +
            '<div class="kakijun-char-card">' +
              '<div class="kakijun-char-display">' +
                '<span class="kakijun-char-glyph" id="kakijunCharGlyph" lang="ja">' + c + '</span>' +
                '<span class="kakijun-char-romaji" id="kakijunCharRomaji">' + r + '</span>' +
              '</div>' +
              '<small id="kakijunStrokeTotal" style="color:#6E635C;font-weight:700;">' + totalStrokes + ' goresan</small>' +
              '<button type="button" class="kakijun-voice-btn" id="kakijunVoiceBtn" aria-label="Dengarkan pengucapan">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>' +
                '<span>' + T('jepang.kakijun-suara', 'Dengarkan Suara') + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="kakijun-mode-switcher">' +
              '<button type="button" class="kakijun-mode-btn ' + (activeMode === 'guided' ? 'is-active' : '') + '" data-kakijun-mode="guided">' +
                '<span>🎯 Dipandu</span>' +
              '</button>' +
              '<button type="button" class="kakijun-mode-btn ' + (activeMode === 'recall' ? 'is-active' : '') + '" data-kakijun-mode="recall">' +
                '<span>🧠 Ingatan</span>' +
              '</button>' +
            '</div>' +
            '<div class="kakijun-stroke-list" id="kakijunStrokeList"></div>' +
          '</div>' +
          // Right Panel: Genko Yoshi Canvas Workbench
          '<div class="kakijun-canvas-panel">' +
            '<div class="kakijun-feedback-bar" id="kakijunFeedback">Goreskan mengikuti nomor dan arah panah</div>' +
            '<div class="kakijun-canvas-wrapper" id="kakijunCanvasWrap">' +
              '<canvas class="kakijun-canvas" id="kakijunCanvas"></canvas>' +
              '<svg class="kakijun-guide-overlay" id="kakijunGuideSvg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>' +
            '</div>' +
            '<div class="kakijun-toolbar">' +
              '<button type="button" class="kakijun-btn kakijun-btn-ghost" id="kakijunUndoBtn" aria-label="Batalkan goresan terakhir">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>' +
                '<span>Urungkan</span>' +
              '</button>' +
              '<button type="button" class="kakijun-btn kakijun-btn-primary" id="kakijunNextActionBtn">' +
                '<span>Ulangi dari Awal</span>' +
              '</button>' +
            '</div>' +
            '<div class="kakijun-footer-nav">' +
              '<button type="button" class="kakijun-nav-btn" id="kakijunPrevBtn">' +
                '<span>← Karakter Sebelumnya</span>' +
              '</button>' +
              '<button type="button" class="kakijun-nav-btn" id="kakijunNextBtn">' +
                '<span>Karakter Berikutnya →</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
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
    activeStrokeIndex = 0;
    completedStrokes = [];
    userPoints = [];

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

    // Event Bindings
    var closeBtn = document.getElementById('kakijunCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);

    if (overlayEl) {
      overlayEl.addEventListener('click', function (e) {
        if (e.target === overlayEl) close();
      });
    }

    var voiceBtn = document.getElementById('kakijunVoiceBtn');
    if (voiceBtn) voiceBtn.addEventListener('click', function () {
      speakJapanese(activeChar, (data && data.romaji) || '');
    });

    var undoBtn = document.getElementById('kakijunUndoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoLastStroke);

    var nextActionBtn = document.getElementById('kakijunNextActionBtn');
    if (nextActionBtn) nextActionBtn.addEventListener('click', resetCanvas);

    var prevBtn = document.getElementById('kakijunPrevBtn');
    if (prevBtn) prevBtn.addEventListener('click', prevCharacter);

    var nextBtn = document.getElementById('kakijunNextBtn');
    if (nextBtn) nextBtn.addEventListener('click', nextCharacter);

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
    speakJapanese(activeChar, (data && data.romaji) || '');
  }

  function close() {
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
    speak: speakJapanese
  };

  root.FiezelKakijunStudio = FiezelKakijunStudio;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelKakijunStudio;
  }
})(typeof self !== 'undefined' ? self : globalThis);
