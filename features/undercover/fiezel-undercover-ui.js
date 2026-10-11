/**
 * FIEZEL · features/undercover/fiezel-undercover-ui.js — PANGGUNG UNDERCOVER (m025-561)
 *
 * Lapisan layar untuk undercover.html: alur 6 babak, meja bundar, animasi lempar barang,
 * synthesizer suara Web Audio (nol aset audio), dan ANTREAN BUKTI ke Braincore.
 *
 * Aturan main dan keputusan bot ada di fiezel-undercover-engine.js (murni, ber-seed); berkas
 * ini hanya menggambar dan mengatur waktu. Tidak ada kalimat yang ditulis langsung di sini:
 * semua teks lewat FiezelI18n.t() dengan kunci undercover.* (copy-(id|th)-undercover.js).
 *
 * JEMBATAN BRAINCORE. app.js tidak dimuat di halaman ini, jadi updateMastery()/bktRecord()
 * tidak bisa dipanggil langsung — dan memang tidak boleh: app.js satu-satunya penulis state
 * otak. Halaman ini hanya MENGANTRIKAN baris bukti ke localStorage
 * (fiezel-undercover-evidence-v1) begitu bukti itu lahir, lalu app.js mencatatnya lewat
 * undercoverEvidenceDrain() saat murid kembali. Tanda terima hasil pencatatan
 * (fiezel-undercover-receipt-v1) ditulis app.js dan dibaca lobi di sini — angka penguasaan
 * yang tampil di lobi adalah angka yang benar-benar dihitung app.js, bukan perkiraan.
 *
 * Parameter URL untuk pengujian: ?seed=N (pertandingan bisa diputar ulang), ?speed=N
 * (semua jeda dibagi N), ?lang=th|id, ?probe=1 (snapshot peran untuk probe Playwright).
 */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  var doc = root.document;
  var D = root.FiezelUndercoverData;
  var E = root.FiezelUndercoverEngine;
  var I = root.FiezelI18n;
  if (!doc || !D || !E || !I) return;

  var KEYS = {
    evidence: 'fiezel-undercover-evidence-v1',
    receipt: 'fiezel-undercover-receipt-v1',
    locale: 'fiezel-ui-locale-hint',
    stats: 'fz_undercover_stats',
    sfx: 'fz_undercover_sfx',
    lobby: 'fz_undercover_lobby'
  };
  var QUEUE_CAP = 60;
  /* Kunci lengkap, bukan prefiks + sambungan: gerbang kunci-hantu hanya bisa membuktikan kunci
     yang tertulis utuh, dan ketiga keluarga ini memakai tanda hubung, bukan titik. */
  var MISSION_KEY = { civ: 'undercover.reveal.mission-civ', spy: 'undercover.reveal.mission-spy', white: 'undercover.reveal.mission-white' };
  var LEAK_KEY = { low: 'undercover.clue.leak-low', mid: 'undercover.clue.leak-mid', high: 'undercover.clue.leak-high' };
  var FIT_KEY = { yes: 'undercover.debrief.fit-yes', no: 'undercover.debrief.fit-no', timeout: 'undercover.debrief.fit-timeout', white: 'undercover.debrief.fit-white' };
  var TURN_S = 15;
  var DEBATE_S = 25;
  var VOTE_S = 10;
  var GUESS_S = 8;

  var params;
  try { params = new URLSearchParams(root.location.search); } catch (_) { params = { get: function () { return null; } }; }
  var SPEED = Math.max(1, Math.min(20, Number(params.get('speed')) || 1));
  var PROBE = params.get('probe') === '1';
  var REDUCED = false;
  try { REDUCED = root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  function t(key, p) { return I.t(key, p); }
  function $(id) { return doc.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (_) {} }
  function lsJson(k, fb) { try { var v = JSON.parse(lsGet(k)); return v == null ? fb : v; } catch (_) { return fb; } }

  /* ------------------------------------------------------------------ waktu -------- */
  var phaseTimers = [];
  function later(fn, delay) {
    var id = setTimeout(function () {
      var i = phaseTimers.indexOf(id);
      if (i >= 0) phaseTimers.splice(i, 1);
      fn();
    }, Math.round(delay / SPEED));
    phaseTimers.push(id);
    return id;
  }
  function fxLater(fn, delay) { return setTimeout(fn, Math.round(delay / SPEED)); }
  /* Ketukan dramatis (stempel eliminasi, hasil tebakan) tidak boleh menyusut di bawah durasi
     animasi CSS-nya sendiri, termasuk saat ?speed dipakai probe: lantai 900 ms. */
  function beat(fn, delay) {
    var id = setTimeout(function () {
      var i = phaseTimers.indexOf(id);
      if (i >= 0) phaseTimers.splice(i, 1);
      fn();
    }, Math.max(900, Math.round(delay / SPEED)));
    phaseTimers.push(id);
    return id;
  }
  function clearPhaseTimers() {
    phaseTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    phaseTimers = [];
  }

  /* --------------------------------------------------- SYNTHESIZER WEB AUDIO -------- */
  var Sfx = (function () {
    var ctx = null;
    var master = null;
    var noiseBuf = null;
    var on = lsGet(KEYS.sfx) !== 'off';

    function ac() {
      if (!on) return null;
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        try {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.6;
          master.connect(ctx.destination);
        } catch (_) { ctx = null; return null; }
      }
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
      return ctx;
    }
    function env(g, t0, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    }
    function tone(type, f0, f1, dur, vol, delay) {
      var c = ac();
      if (!c) return;
      try {
        var t0 = c.currentTime + (delay || 0);
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t0);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        env(g, t0, 0.006, vol, dur);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + dur + 0.08);
      } catch (_) {}
    }
    function noise(dur, vol, type, f0, f1, q, delay) {
      var c = ac();
      if (!c) return;
      try {
        var t0 = c.currentTime + (delay || 0);
        if (!noiseBuf) {
          noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
          var d = noiseBuf.getChannelData(0);
          for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        var s = c.createBufferSource();
        s.buffer = noiseBuf; s.loop = true;
        var f = c.createBiquadFilter();
        f.type = type; f.Q.value = q || 1;
        f.frequency.setValueAtTime(f0, t0);
        if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        var g = c.createGain();
        env(g, t0, 0.01, vol, dur);
        s.connect(f); f.connect(g); g.connect(master);
        s.start(t0); s.stop(t0 + dur + 0.08);
      } catch (_) {}
    }

    /* Tujuh suara wajib brief + pelengkap. Semuanya disintesis; nol berkas .mp3/.wav. */
    function sfxTap() { tone('sine', 1500, 950, 0.06, 0.16); }
    function sfxScan() { noise(1.05, 0.12, 'bandpass', 450, 4200, 7); tone('triangle', 240, 980, 1.05, 0.05); }
    function sfxScanDone() { tone('triangle', 880, 880, 0.1, 0.16); tone('triangle', 1320, 1320, 0.18, 0.15, 0.09); }
    function sfxSpeech() { tone('square', 620, 840, 0.05, 0.045); tone('square', 920, 700, 0.05, 0.045, 0.07); tone('square', 760, 1000, 0.06, 0.045, 0.14); }
    function sfxThrow() { noise(0.3, 0.16, 'highpass', 3200, 700, 0.7); tone('sawtooth', 540, 170, 0.26, 0.035); }
    function sfxSplat() { noise(0.24, 0.32, 'lowpass', 1400, 110, 1); tone('sawtooth', 190, 52, 0.22, 0.12); }
    function sfxClang() { tone('triangle', 1250, 1190, 0.5, 0.14); tone('square', 1870, 1810, 0.32, 0.04); tone('sine', 2520, 2440, 0.42, 0.06); }
    function sfxSparkle() { [1318, 1760, 2093, 2637].forEach(function (f, i) { tone('sine', f, f, 0.14, 0.08, i * 0.06); }); }
    function sfxSteam() { noise(0.5, 0.07, 'highpass', 1800, 3600, 0.5); }
    function sfxHeartbeat() { tone('sine', 72, 42, 0.16, 0.55); tone('sine', 62, 38, 0.2, 0.4, 0.2); }
    function sfxGavel() {
      noise(0.08, 0.5, 'lowpass', 900, 260, 1); tone('sine', 160, 46, 0.3, 0.6);
      noise(0.06, 0.3, 'lowpass', 800, 260, 1, 0.34); tone('sine', 150, 46, 0.24, 0.4, 0.34);
    }
    function sfxFanfare() {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone('triangle', f, f, 0.3, 0.12, i * 0.11); });
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { tone('triangle', f, f, 0.8, 0.06, 0.5); tone('sine', f * 2, f * 2, 0.6, 0.02, 0.5); });
    }
    function sfxFail() { tone('sawtooth', 330, 110, 0.6, 0.09); tone('triangle', 220, 82, 0.7, 0.1, 0.05); }
    function sfxTick() { tone('square', 1100, 1100, 0.03, 0.05); }
    function sfxVote() { tone('triangle', 660, 990, 0.09, 0.12); }

    return {
      sfxTap: sfxTap, sfxScan: sfxScan, sfxScanDone: sfxScanDone, sfxSpeech: sfxSpeech, sfxThrow: sfxThrow,
      sfxSplat: sfxSplat, sfxClang: sfxClang, sfxSparkle: sfxSparkle, sfxSteam: sfxSteam, sfxHeartbeat: sfxHeartbeat,
      sfxGavel: sfxGavel, sfxFanfare: sfxFanfare, sfxFail: sfxFail, sfxTick: sfxTick, sfxVote: sfxVote,
      isOn: function () { return on; },
      setOn: function (v) {
        on = !!v;
        lsSet(KEYS.sfx, on ? 'on' : 'off');
        if (!on && ctx) { try { ctx.suspend(); } catch (_) {} }
      }
    };
  }());

  function buzz(pattern) {
    if (!Sfx.isOn()) return;
    try { if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(pattern); } catch (_) {}
  }

  /* ----------------------------------------------------------------- state -------- */
  var S = {
    phase: 'lobby',
    mode: 'agent',
    size: 4,
    seats: [],
    game: null,
    chips: null,
    dim: 'a',
    pick: { a: null, b: null },
    turnStart: 0,
    ballots: {},
    target: null,
    trayTarget: null,
    lastAct: 0,
    heartbeat: null,
    countdown: null,
    showdownStart: 0,
    receiptShown: false
  };

  /* -------------------------------------------------------------- i18n / boot -------- */
  function resolveLocale() {
    var q = params.get('lang');
    if (q === 'th' || q === 'id') return q;
    var h = lsGet(KEYS.locale);
    if (h === 'th' || h === 'id') return h;
    try { return /^th\b/i.test(String(root.navigator.language || '')) ? 'th' : 'id'; } catch (_) { return 'id'; }
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      doc.head.appendChild(s);
    });
  }
  function applyStaticText() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-t]'), function (n) { n.textContent = t(n.getAttribute('data-t')); });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-t-aria]'), function (n) {
      var v = t(n.getAttribute('data-t-aria'));
      n.setAttribute('aria-label', v);
      n.setAttribute('title', v);
    });
    doc.title = t('undercover.doc-title');
    try { doc.documentElement.lang = I.getBcp47(); } catch (_) {}
  }

  /* --------------------------------------------------------------- helpers -------- */
  function botById(id) {
    for (var i = 0; i < D.BOTS.length; i++) if (D.BOTS[i].id === id) return D.BOTS[i];
    return null;
  }
  function nameOf(p) {
    if (!p) return '';
    if (p.isMe) return t('undercover.lobby.you');
    var b = botById(p.botId);
    return b ? b.name : '#' + pad(p.seat);
  }
  function hueOf(p) {
    if (p.isMe) return 172;
    var b = botById(p.botId);
    return b ? b.hue : 260;
  }
  function gloss(en) { return en ? t(D.wordKey(en)) : ''; }
  function chipGloss(c) { return c ? t(D.clueKey(S.game.pair.id, c.id)) : ''; }
  function me() { return S.game ? S.game.players[0] : null; }
  function myWordEntry() {
    var m = me();
    if (!m || !S.game) return null;
    if (m.role === 'civ') return S.game.pair.civ;
    if (m.role === 'spy') return S.game.pair.spy;
    return null;
  }
  function roleName(role) { return t('undercover.role.' + role); }

  var toastTimer = null;
  function hideToast() { clearTimeout(toastTimer); $('uc-toast').className = 'uc-toast'; }
  function toast(text, tone) {
    var n = $('uc-toast');
    n.textContent = text;
    n.className = 'uc-toast is-on' + (tone ? ' is-' + tone : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { n.className = 'uc-toast'; }, Math.max(1400, Math.round(2600 / Math.sqrt(SPEED))));
  }

  /* -------------------------------------------------------------- antrean bukti ---- */
  function queueEvidence(row) {
    if (!row || !row.vocabId) return;
    var box = lsJson(KEYS.evidence, null);
    var rows = box && Array.isArray(box.rows) ? box.rows : [];
    rows.push(row);
    if (rows.length > QUEUE_CAP) rows = rows.slice(-QUEUE_CAP);
    lsSet(KEYS.evidence, JSON.stringify({ v: 1, rows: rows }));
  }
  function pendingEvidence() {
    var box = lsJson(KEYS.evidence, null);
    return box && Array.isArray(box.rows) ? box.rows.length : 0;
  }

  /* --------------------------------------------------------------- layar -------- */
  var SCREENS = { lobby: 'uc-lobby', reveal: 'uc-reveal', clue: 'uc-table', debate: 'uc-table', tribunal: 'uc-table', showdown: 'uc-showdown', debrief: 'uc-debrief' };
  function setPhase(phase) {
    S.phase = phase;
    $('uc-app').setAttribute('data-phase', phase);
    $('uc-phase-code').textContent = t('undercover.code.' + phase);
    $('uc-phase-name').textContent = t('undercover.phase.' + phase);
    var target = SCREENS[phase];
    ['uc-lobby', 'uc-reveal', 'uc-table', 'uc-showdown', 'uc-debrief'].forEach(function (id) {
      var n = $(id);
      var show = id === target;
      if (show && n.hidden) { n.hidden = false; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; }
      else if (!show) n.hidden = true;
    });
    $('uc-peek').hidden = !(phase === 'clue' || phase === 'debate' || phase === 'tribunal' || phase === 'showdown');
    if (phase !== 'debate') closeTray();
    if (phase === 'showdown' || phase === 'debrief' || phase === 'lobby') hideToast();
  }

  /* ========================================================== BABAK 1 · LOBI ===== */
  function loadLobbyPrefs() {
    var p = lsJson(KEYS.lobby, null);
    if (p && (p.mode === 'agent' || p.mode === 'white')) S.mode = p.mode;
    if (p && (p.size === 4 || p.size === 6)) S.size = p.size;
    var seats = p && Array.isArray(p.seats) ? p.seats.filter(function (id) { return !!botById(id); }) : [];
    S.seats = seats.slice(0, S.size - 1);
  }
  function saveLobbyPrefs() { lsSet(KEYS.lobby, JSON.stringify({ mode: S.mode, size: S.size, seats: S.seats })); }

  function renderLobby() {
    Array.prototype.forEach.call(doc.querySelectorAll('#uc-modes .uc-mode'), function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-mode') === S.mode)); });
    Array.prototype.forEach.call(doc.querySelectorAll('#uc-sizes button'), function (b) { b.setAttribute('aria-checked', String(Number(b.getAttribute('data-size')) === S.size)); });
    var filled = 1 + S.seats.filter(Boolean).length;
    $('uc-seat-count').textContent = t('undercover.lobby.seats-label', { filled: filled, total: S.size });
    $('uc-fill').hidden = filled >= S.size;
    var box = $('uc-dossiers');
    box.textContent = '';
    for (var s = 1; s <= S.size; s++) box.appendChild(dossier(s));
    $('uc-start').textContent = t('undercover.lobby.start');
    renderReceipt();
    renderPreviewTable(filled);
  }

  function renderPreviewTable(filled) {
    var ring = $('uc-ptable');
    Array.prototype.forEach.call(ring.querySelectorAll('.uc-pdot'), function (n) { n.remove(); });
    $('uc-ptable-code').textContent = t(S.mode === 'white' ? 'undercover.lobby.mode-white' : 'undercover.lobby.mode-agent').toUpperCase();
    $('uc-ptable-main').textContent = filled + ' / ' + S.size;
    for (var i = 0; i < S.size; i++) {
      var a = seatAngle(i, S.size);
      var d = el('span', 'uc-pdot');
      d.style.left = (50 + 50 * Math.cos(a)).toFixed(1) + '%';
      d.style.top = (50 + 50 * Math.sin(a)).toFixed(1) + '%';
      if (i === 0) { d.classList.add('is-on'); d.style.setProperty('--hue', '172'); d.textContent = '\u2605'; }
      else {
        var bot = botById(S.seats[i - 1]);
        if (bot) { d.classList.add('is-on'); d.style.setProperty('--hue', String(bot.hue)); d.textContent = bot.name.charAt(0); }
      }
      ring.appendChild(d);
    }
  }

  function dossier(seat) {
    var card = el('div', 'uc-dossier uc-glass');
    card.setAttribute('data-seat', String(seat));
    if (seat === 1) {
      card.style.setProperty('--hue', '172');
      var av = el('span', 'uc-mini-av', '★');
      var meta = el('span', 'uc-meta');
      meta.appendChild(el('span', 'uc-mono', '#' + pad(1) + ' · ' + t('undercover.tag.agent')));
      meta.appendChild(el('b', '', t('undercover.lobby.you')));
      meta.appendChild(el('small', '', t('undercover.lobby.you-tag')));
      card.appendChild(av); card.appendChild(meta);
      card.appendChild(el('span', 'uc-ready', t('undercover.lobby.ready')));
      return card;
    }
    var id = S.seats[seat - 2];
    var bot = id && botById(id);
    if (!bot) {
      card.className = 'uc-dossier uc-glass is-empty';
      var add = el('button', 'uc-add', t('undercover.lobby.add-bot'));
      add.type = 'button';
      add.setAttribute('aria-label', t('undercover.lobby.add-bot') + ' #' + pad(seat));
      add.addEventListener('click', function () { addBot(seat); });
      card.appendChild(add);
      return card;
    }
    card.style.setProperty('--hue', String(bot.hue));
    var av2 = el('span', 'uc-mini-av', bot.name.charAt(0));
    var meta2 = el('span', 'uc-meta');
    meta2.appendChild(el('span', 'uc-mono', '#' + pad(seat) + ' · ' + t('undercover.tag.bot')));
    meta2.appendChild(el('b', '', bot.name));
    meta2.appendChild(el('small', '', t('undercover.bot.' + bot.id)));
    card.appendChild(av2); card.appendChild(meta2);
    card.appendChild(el('span', 'uc-ready', t('undercover.lobby.ready')));
    var kick = el('button', 'uc-kick', '×');
    kick.type = 'button';
    kick.setAttribute('aria-label', t('undercover.lobby.remove-bot-aria', { name: bot.name }));
    kick.addEventListener('click', function () { S.seats[seat - 2] = null; Sfx.sfxTap(); saveLobbyPrefs(); renderLobby(); });
    card.appendChild(kick);
    return card;
  }

  function freeBot() {
    for (var i = 0; i < D.BOTS.length; i++) if (S.seats.indexOf(D.BOTS[i].id) < 0) return D.BOTS[i].id;
    return null;
  }
  function addBot(seat) {
    var id = freeBot();
    if (!id) return;
    while (S.seats.length < seat - 1) S.seats.push(null);
    S.seats[seat - 2] = id;
    Sfx.sfxTap(); buzz(8);
    saveLobbyPrefs();
    renderLobby();
    var card = doc.querySelector('.uc-dossier[data-seat="' + seat + '"]');
    if (card) card.classList.add('is-matching');
  }
  function fillAll() { for (var s = 2; s <= S.size; s++) if (!S.seats[s - 2]) addBot(s); }

  function renderReceipt() {
    var box = $('uc-receipt');
    var lines = [];
    var rc = lsJson(KEYS.receipt, null);
    if (rc && Array.isArray(rc.items) && rc.items.length && Date.now() - Number(rc.at || 0) < 14 * 864e5) {
      var rows = rc.items.slice(0, 3).map(function (it) {
        return t('undercover.lobby.receipt-row', { word: String(it.word || '').toUpperCase(), before: Math.round(Number(it.before) || 0), after: Math.round(Number(it.after) || 0) });
      });
      lines.push('<b>' + escapeHtml(t('undercover.lobby.receipt-title')) + '</b><br>' + rows.map(escapeHtml).join('<br>'));
    }
    var pending = pendingEvidence();
    if (pending) lines.push(escapeHtml(t('undercover.lobby.receipt-pending', { n: pending })));
    box.hidden = !lines.length;
    box.innerHTML = lines.join('<br>');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function startMatchmaking(sameSettings) {
    var btn = $('uc-start');
    btn.disabled = true;
    $('uc-matching').hidden = false;
    Sfx.sfxTap(); buzz([10, 40, 10]);
    var empties = [];
    for (var s = 2; s <= S.size; s++) if (!S.seats[s - 2]) empties.push(s);
    var step = 0;
    function next() {
      if (step < empties.length) { addBot(empties[step]); step++; later(next, 260); return; }
      Array.prototype.forEach.call(doc.querySelectorAll('.uc-dossier'), function (c, i) {
        c.classList.remove('is-matching');
        fxLater(function () { c.classList.add('is-matching'); }, i * 90);
      });
      Sfx.sfxScanDone();
      later(function () { beginGame(); }, sameSettings ? 200 : 900);
    }
    next();
  }

  function beginGame() {
    clearPhaseTimers();
    $('uc-start').disabled = false;
    $('uc-matching').hidden = true;
    var seedParam = params.get('seed');
    S.gameIndex = (S.gameIndex || 0) + 1;
    var seed = seedParam ? ((Number(seedParam) + S.gameIndex - 1) >>> 0) : ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    S.game = E.newGame({ mode: S.mode, size: S.size, seed: seed, bots: S.seats.slice(0, S.size - 1), pairId: params.get('pair') || null }, D);
    S.ballots = {};
    openReveal();
  }

  /* ================================================= BABAK 2 · DOSSIER BIOMETRIK ===== */
  var scan = { raf: 0, start: 0, done: false, holding: false };
  var SCAN_MS = 1100;

  function openReveal() {
    setPhase('reveal');
    var m = me();
    $('uc-reveal-title').textContent = t('undercover.reveal.title', { seat: pad(1) });
    $('uc-front-seat').textContent = t('undercover.tag.agent') + ' #' + pad(1) + ' · ' + S.game.seed.toString(16).toUpperCase().slice(-6);
    $('uc-card').classList.remove('is-flipped');
    $('uc-enter').disabled = true;
    $('uc-scanner').classList.remove('is-scanning', 'is-done');
    setScanProgress(0);
    scan.done = false;
    var back = $('uc-card-back');
    back.className = 'uc-face uc-face-back' + (m.role === 'spy' ? ' is-spy' : (m.role === 'white' ? ' is-white' : ''));
    fillRoleBadge($('uc-role-badge'), m.role);
    var w = myWordEntry();
    $('uc-word-label').textContent = t('undercover.reveal.word-label');
    $('uc-word').textContent = w ? w.en : '???';
    $('uc-gloss').textContent = w ? '(' + gloss(w.en) + ')' : t('undercover.reveal.no-word');
    $('uc-mission').textContent = t(MISSION_KEY[m.role]);
    $('uc-scan-label').textContent = t('undercover.reveal.scan');
  }
  function fillRoleBadge(n, role) {
    n.className = 'uc-role-badge ' + role;
    n.textContent = t('undercover.role-tag.' + role);
  }
  function setScanProgress(f) {
    var ring = $('uc-scan-ring');
    ring.setAttribute('stroke-dashoffset', String(276.5 * (1 - clamp(f, 0, 1))));
  }
  function scanStart() {
    if (scan.done || S.phase !== 'reveal') return;
    scan.holding = true;
    scan.start = performance.now();
    $('uc-scanner').classList.add('is-scanning');
    $('uc-scan-label').textContent = t('undercover.reveal.scanning');
    Sfx.sfxScan(); buzz(15);
    var dur = Math.max(160, SCAN_MS / SPEED);
    var tick = function (now) {
      if (!scan.holding || scan.done) return;
      var f = (now - scan.start) / dur;
      setScanProgress(f);
      if (f >= 1) { scanComplete(); return; }
      scan.raf = root.requestAnimationFrame(tick);
    };
    scan.raf = root.requestAnimationFrame(tick);
  }
  function scanCancel() {
    if (scan.done || !scan.holding) return;
    scan.holding = false;
    root.cancelAnimationFrame(scan.raf);
    $('uc-scanner').classList.remove('is-scanning');
    $('uc-scan-label').textContent = t('undercover.reveal.scan');
    setScanProgress(0);
  }
  function scanComplete() {
    scan.done = true;
    scan.holding = false;
    setScanProgress(1);
    var sc = $('uc-scanner');
    sc.classList.remove('is-scanning');
    sc.classList.add('is-done');
    Sfx.sfxScanDone(); buzz([20, 30, 40]);
    $('uc-card').classList.add('is-flipped');
    var enter = $('uc-enter');
    fxLater(function () { enter.disabled = false; try { enter.focus({ preventScroll: true }); } catch (_) {} }, 650);
  }
  /* Keyboard: tombol fisik tidak bisa "ditahan" dengan nyaman, jadi Enter/Spasi menjalankan
     pemindaian penuh secara otomatis. Klik penunjuk (detail > 0) diabaikan — penunjuk wajib
     menahan, itu inti ritual biometriknya. */
  function scanKeyboard() {
    if (scan.done) return;
    scanStart();
  }

  /* ===================================================== BABAK 3-5 · MEJA ===== */
  /* Kursi di atas elips yang dihitung dari ukuran meja sesungguhnya, bukan persen tetap:
     kursi #01 (murid) selalu di bawah menghadap meja, lalu searah jarum jam. */
  function seatAngle(i, n) { return Math.PI / 2 + (2 * Math.PI * i) / n; }
  function layoutSeats() {
    if (!S.game) return;
    var arena = $('uc-arena');
    var W = arena.clientWidth;
    var H = arena.clientHeight;
    if (!W || !H) return;
    var rx = W * 0.355;
    var ry = Math.min(H * 0.36, rx * 1.5);
    S.game.players.forEach(function (p, i) {
      var b = $('uc-seat-' + p.seat);
      if (!b) return;
      var a = seatAngle(i, S.game.size);
      b.style.setProperty('--x', (W / 2 + rx * Math.cos(a)).toFixed(1) + 'px');
      b.style.setProperty('--y', (H / 2 + ry * Math.sin(a)).toFixed(1) + 'px');
    });
    arena.style.setProperty('--fw', (rx * 1.42).toFixed(1) + 'px');
    arena.style.setProperty('--fh', (ry * 1.25).toFixed(1) + 'px');
  }

  function enterTable() {
    Sfx.sfxTap();
    setPhase('clue');
    renderSeats();
    updateMeters();
    later(startRound, 450);
  }

  function renderSeats() {
    var host = $('uc-seats');
    host.textContent = '';
    S.game.players.forEach(function (p) {
      var b = el('button', 'uc-seat' + (p.isMe ? ' is-me' : ''));
      b.type = 'button';
      b.id = 'uc-seat-' + p.seat;
      b.setAttribute('data-seat', String(p.seat));
      b.style.setProperty('--hue', String(hueOf(p)));
      var av = el('span', 'uc-av');
      av.appendChild(el('span', 'uc-av-face', p.isMe ? '★' : nameOf(p).charAt(0)));
      av.appendChild(el('span', 'uc-av-no', '#' + pad(p.seat)));
      av.appendChild(el('span', 'uc-av-mood', MOOD_GLYPH.calm));
      av.appendChild(el('span', 'uc-tally'));
      b.appendChild(av);
      b.appendChild(el('span', 'uc-seat-name', nameOf(p)));
      var wave = el('span', 'uc-wave');
      for (var i = 0; i < 5; i++) wave.appendChild(el('i'));
      b.appendChild(wave);
      var sus = el('span', 'uc-sus');
      sus.appendChild(el('span', 'uc-sus-fill'));
      b.appendChild(sus);
      b.appendChild(el('span', 'uc-sus-num', t('undercover.seat.sus') + ' 30'));
      var vote = el('span', 'uc-vote-pill', t('undercover.seat.vote'));
      vote.hidden = true;
      b.appendChild(vote);
      var stamp = el('span', 'uc-stamp');
      stamp.appendChild(doc.createTextNode(t('undercover.seat.exiled')));
      stamp.appendChild(el('br'));
      stamp.appendChild(doc.createTextNode(t('undercover.seat.exiled-en')));
      b.appendChild(stamp);
      b.addEventListener('click', function () { onSeatClick(p.seat); });
      host.appendChild(b);
    });
    layoutSeats();
  }

  var MOOD_GLYPH = { calm: '😎', nervous: '😅', accusing: '😠', busted: '😱' };
  var moodOverride = {};

  function updateMeters() {
    if (!S.game) return;
    S.game.players.forEach(function (p) {
      var b = $('uc-seat-' + p.seat);
      if (!b) return;
      var sus = E.publicSus(S.game, p.seat);
      b.querySelector('.uc-sus-fill').style.setProperty('--sus', sus + '%');
      var num = b.querySelector('.uc-sus-num');
      num.textContent = t('undercover.seat.sus') + ' ' + sus;
      num.classList.toggle('is-hot', sus >= 60);
      var mood = moodOverride[p.seat] || E.mood(S.game, p.seat);
      var mg = b.querySelector('.uc-av-mood');
      if (mg.getAttribute('data-mood') !== mood) {
        mg.setAttribute('data-mood', mood);
        mg.textContent = MOOD_GLYPH[mood];
        mg.setAttribute('title', t('undercover.mood.' + mood));
        mg.classList.remove('is-bump'); void mg.offsetWidth; mg.classList.add('is-bump');
        fxLater(function () { mg.classList.remove('is-bump'); }, 320);
      }
      b.classList.toggle('is-out', !p.alive);
      var label = '#' + pad(p.seat) + ' ' + nameOf(p) + ' — ' + t('undercover.mood.' + mood) + ' — ' + t('undercover.seat.sus-aria', { n: sus });
      if (S.phase === 'tribunal' && p.alive && !p.isMe && me().alive && !S.ballots[1]) label += ' — ' + t('undercover.seat.vote');
      b.setAttribute('aria-label', label);
      b.disabled = !seatInteractive(p);
    });
  }
  function flashMood(seat, mood, dur) {
    moodOverride[seat] = mood;
    updateMeters();
    fxLater(function () { delete moodOverride[seat]; updateMeters(); }, dur || 2200);
  }
  function seatInteractive(p) {
    if (!p.alive || p.isMe || !me().alive) return false;
    if (S.phase === 'debate') return true;
    if (S.phase === 'tribunal') return !S.ballots[1];
    return false;
  }

  function seatCenter(seat, part) {
    var arena = $('uc-arena').getBoundingClientRect();
    var b = $('uc-seat-' + seat);
    var r = (part === 'av' ? b.querySelector('.uc-av') : b).getBoundingClientRect();
    return { x: r.left + r.width / 2 - arena.left, y: r.top + r.height / 2 - arena.top, top: r.top - arena.top, bottom: r.bottom - arena.top, w: arena.width, h: arena.height };
  }

  function setSpeaker(seat) {
    Array.prototype.forEach.call(doc.querySelectorAll('.uc-seat'), function (b) { b.classList.toggle('is-speaking', Number(b.getAttribute('data-seat')) === seat); });
    var spot = $('uc-spot');
    if (!seat) { spot.classList.add('is-off'); return; }
    var c = seatCenter(seat, 'av');
    var ang = Math.atan2(c.y - c.h / 2, c.x - c.w / 2) * 180 / Math.PI;
    spot.classList.remove('is-off', 'is-busted');
    spot.style.setProperty('--spot', ang.toFixed(1) + 'deg');
    spot.style.setProperty('--spot-len', Math.max(40, Math.hypot(c.x - c.w / 2, c.y - c.h / 2) - 26).toFixed(0) + 'px');
  }

  var bubbles = {};
  /* Balon dialog menempel ke kepala pembicara: di atas kursi untuk kursi bagian bawah/tengah,
     di bawah kursi untuk kursi baris atas (supaya tidak terpotong tepi meja). Bila posisinya
     digeser agar tetap di dalam meja, ekornya ikut digeser sehingga tetap menunjuk kepala. */
  function bubble(seat, main, sub, chat, life) {
    var arenaEl = $('uc-arena');
    if (bubbles[seat]) { bubbles[seat].remove(); delete bubbles[seat]; }
    var c = seatCenter(seat, 'av');
    var below = c.y < c.h * 0.4;
    var n = el('div', 'uc-bubble' + (below ? ' is-below' : '') + (chat ? ' is-chat' : ''));
    n.appendChild(el('b', '', main));
    if (sub) n.appendChild(el('small', '', sub));
    var half = Math.min(84, c.w * 0.24);
    var x = clamp(c.x, half + 4, c.w - half - 4);
    var ar = arenaEl.getBoundingClientRect();
    var sb = $('uc-seat-' + seat).getBoundingClientRect();
    var y = below ? (sb.bottom - ar.top + 6) : (c.top - 6);
    n.style.setProperty('--x', x.toFixed(1) + 'px');
    n.style.setProperty('--y', y.toFixed(1) + 'px');
    n.style.setProperty('--tail', (c.x - x).toFixed(1) + 'px');
    arenaEl.appendChild(n);
    bubbles[seat] = n;
    var keep = life || 3200;
    fxLater(function () {
      if (bubbles[seat] !== n) return;
      n.classList.add('is-out');
      setTimeout(function () { if (n.parentNode) n.remove(); if (bubbles[seat] === n) delete bubbles[seat]; }, 260);
    }, keep);
  }
  function clearBubbles() {
    Object.keys(bubbles).forEach(function (k) { if (bubbles[k]) bubbles[k].remove(); });
    bubbles = {};
  }

  /* -------------------------------------------------------- penghitung waktu ---- */
  function countdown(seconds, onDone, opts) {
    stopCountdown();
    var big = opts && opts.big;
    var bar = big ? $('uc-sd-bar') : $('uc-timer-bar');
    var num = big ? $('uc-sd-num') : $('uc-timer-num');
    var wrap = big ? null : $('uc-timer');
    var full = big ? 263.9 : 75.4;
    var left = seconds;
    function paint() {
      num.textContent = String(left);
      bar.setAttribute('stroke-dashoffset', String(full * (1 - left / seconds)));
      if (wrap) {
        wrap.classList.toggle('is-urgent', left <= 5);
        wrap.classList.remove('is-pulse'); void wrap.offsetWidth; wrap.classList.add('is-pulse');
      }
      if (left <= 3 && left > 0 && opts && opts.tick) Sfx.sfxTick();
    }
    paint();
    var id = setInterval(function () {
      left -= 1;
      paint();
      if (left <= 0) { stopCountdown(); onDone(); }
    }, Math.round(1000 / SPEED));
    S.countdown = id;
    phaseTimers.push(id);
  }
  function stopCountdown() {
    if (S.countdown) { clearInterval(S.countdown); S.countdown = null; }
  }

  /* ------------------------------------------------------------ BABAK 3 ----------- */
  function startRound() {
    clearBubbles();
    var order = E.startRound(S.game);
    setPhase('clue');
    $('uc-round').textContent = t('undercover.table.round', { n: S.game.round });
    setHolo('undercover.code.clue', t('undercover.table.round', { n: S.game.round }));
    renderRoundLog('uc-log');
    renderMyCard();
    showPanel(me().alive ? 'listen' : 'spectator');
    updateMeters();
    runTurns(order, 0);
  }

  function showPanel(name) {
    ['listen', 'synth', 'debate', 'tribunal', 'spectator'].forEach(function (p) { $('uc-p-' + p).hidden = p !== name; });
  }
  /* Log petunjuk ronde berjalan: dipakai saat menyimak, saat debat, dan saat tribunal —
     keputusan voting harus bisa dibuat dari bukti yang terlihat, bukan dari ingatan. */
  function renderRoundLog(id) {
    var log = $(id);
    if (!log || !S.game) return;
    log.textContent = '';
    var rows = S.game.heard.filter(function (h) { return h.round === S.game.round; });
    if (!rows.length) { log.appendChild(el('div', 'uc-log-empty', t('undercover.clue.log-empty'))); return; }
    rows.forEach(function (h) {
      var row = el('div', 'uc-log-row');
      row.appendChild(el('span', 'uc-mono', '#' + pad(h.seat)));
      var body = el('span');
      if (h.timedOut) body.appendChild(el('b', '', '…'));
      else {
        body.appendChild(el('b', '', h.a.en + ' · ' + h.b.en));
        body.appendChild(el('small', '', chipGloss(h.a) + ' · ' + chipGloss(h.b)));
      }
      row.appendChild(body);
      row.setAttribute('title', nameOf(E.player(S.game, h.seat)));
      log.appendChild(row);
    });
    while (log.children.length > 1 && log.scrollHeight > log.clientHeight + 1) log.removeChild(log.firstChild);
  }
  function logClue() { renderRoundLog('uc-log'); }
  function renderMyCard() {
    var m = me();
    fillRoleBadge($('uc-my-role'), m.role);
    var w = myWordEntry();
    $('uc-my-word').textContent = w ? w.en : '???';
    $('uc-my-tip').textContent = t('undercover.tip.' + m.role);
  }

  function runTurns(order, i) {
    if (i >= order.length) { setSpeaker(null); later(startDebate, 700); return; }
    var seat = order[i];
    var p = E.player(S.game, seat);
    if (!p.alive) { runTurns(order, i + 1); return; }
    setSpeaker(seat);
    var next = function () { runTurns(order, i + 1); };
    if (p.isMe) userTurn(next);
    else botTurn(seat, next);
  }

  function setStatus(text) {
    $('uc-status-text').textContent = text;
  }
  function setHolo(codeKey, main, sub) {
    $('uc-holo-code').textContent = t(codeKey);
    $('uc-holo-main').textContent = main;
    $('uc-holo-sub').textContent = sub || t('undercover.table.alive', { n: E.alive(S.game).length });
  }

  function botTurn(seat, done) {
    var p = E.player(S.game, seat);
    setStatus(t('undercover.table.speaking', { seat: pad(seat), name: nameOf(p) }));
    if (me().alive) showPanel('listen');
    $('uc-listen-text').textContent = t('undercover.clue.listening', { seat: pad(seat), name: nameOf(p) });
    countdown(TURN_S, function () {});
    later(function () {
      var pick = E.botPickClue(S.game, seat);
      var res = E.applyClue(S.game, seat, pick, {});
      Sfx.sfxSpeech();
      bubble(seat, res.a.en + ' · ' + res.b.en, chipGloss(res.a) + ' · ' + chipGloss(res.b), false, 3000);
      logClue(seat, res);
      updateMeters();
      later(function () { stopCountdown(); done(); }, 1700);
    }, rand(1500, 2900));
  }

  function userTurn(done) {
    S.turnDone = done;
    setStatus(t('undercover.table.your-turn'));
    showPanel('synth');
    S.chips = E.chipsFor(S.game, 1);
    S.pick = { a: null, b: null };
    S.dim = 'a';
    S.turnStart = performance.now();
    if (me().role === 'white') toast(t('undercover.clue.white-note'));
    renderSynth();
    Sfx.sfxVote(); buzz([12, 30, 12]);
    countdown(TURN_S, function () { submitClue(true); }, { tick: true });
  }

  function chipById(id) {
    var all = (S.chips && S.chips.a.concat(S.chips.b)) || [];
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function renderSynth() {
    ['a', 'b'].forEach(function (d) {
      var tab = $('uc-tab-' + d);
      tab.setAttribute('aria-selected', String(S.dim === d));
      tab.classList.toggle('is-set', !!S.pick[d]);
      var c = chipById(S.pick[d]);
      $('uc-tab-' + d + '-val').textContent = c ? c.en : '—';
    });
    var box = $('uc-chips');
    box.textContent = '';
    box.setAttribute('aria-labelledby', 'uc-tab-' + S.dim);
    S.chips[S.dim].forEach(function (c) {
      var b = el('button', 'uc-chip');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(S.pick[S.dim] === c.id));
      b.setAttribute('data-chip', c.id);
      b.appendChild(el('b', '', c.en));
      b.appendChild(el('small', '', chipGloss(c)));
      var risk = el('i', 'uc-risk ' + c.risk);
      risk.setAttribute('title', t(LEAK_KEY[c.risk]));
      b.appendChild(risk);
      b.setAttribute('aria-label', c.en + ' — ' + chipGloss(c) + ' — ' + t(LEAK_KEY[c.risk]));
      b.addEventListener('click', function () { pickChip(c); });
      box.appendChild(b);
    });
    var a = chipById(S.pick.a);
    var bb = chipById(S.pick.b);
    $('uc-preview').textContent = (a || bb) ? '“' + (a ? a.en : '…') + ' · ' + (bb ? bb.en : '…') + '”' : t('undercover.clue.preview-empty');
    var leak = 0;
    [a, bb].forEach(function (c) { if (c) leak += c.risk === 'high' ? 50 : (c.risk === 'mid' ? 28 : 8); });
    $('uc-leakbar').style.width = leak + '%';
    $('uc-transmit').disabled = !(a && bb);
  }

  function pickChip(c) {
    if (S.phase !== 'clue' || !S.turnDone) return;
    S.pick[c.dim] = c.id;
    Sfx.sfxTap(); buzz(6);
    if (c.dim === 'a' && !S.pick.b) S.dim = 'b';
    renderSynth();
  }

  function submitClue(timedOut) {
    var done = S.turnDone;
    if (!done) return;
    S.turnDone = null;
    stopCountdown();
    var pick = timedOut ? (S.pick.a && S.pick.b ? S.pick : null) : S.pick;
    var res = E.applyClue(S.game, 1, pick, { ms: performance.now() - S.turnStart, at: Date.now() });
    if (res.evidence) queueEvidence(res.evidence);
    Sfx.sfxSpeech(); buzz(10);
    var w = myWordEntry();
    if (res.timedOut) {
      bubble(1, '…', null, false, 2600);
      toast(t('undercover.clue.timeout'), 'bad');
    } else {
      bubble(1, res.a.en + ' · ' + res.b.en, chipGloss(res.a) + ' · ' + chipGloss(res.b), false, 3000);
      if (me().role === 'white') toast(t('undercover.clue.white-sent'));
      else if (res.fitOk) toast(t('undercover.clue.fit-ok', { word: w.en }), 'good');
      else toast(t('undercover.clue.fit-bad', { chip: res.badChip.en, word: w.en }), 'bad');
    }
    logClue(1, res);
    showPanel('listen');
    $('uc-listen-text').textContent = t('undercover.table.your-turn');
    updateMeters();
    later(done, 1800);
  }

  /* ------------------------------------------------------------ BABAK 4 ----------- */
  function startDebate() {
    setPhase('debate');
    setSpeaker(null);
    setStatus(me().alive ? t('undercover.debate.hint') : t('undercover.spectator'));
    setHolo('undercover.code.debate', t('undercover.table.round', { n: S.game.round }));
    showPanel(me().alive ? 'debate' : 'spectator');
    S.target = topSuspectForMe();
    renderDebateControls();
    renderRoundLog('uc-log-debate');
    updateMeters();
    Sfx.sfxSparkle();
    countdown(DEBATE_S, startTribunal, { tick: true });
    var loop = function () {
      if (S.phase !== 'debate') return;
      var act = E.botDebateAction(S.game);
      if (act) renderBotAction(act);
      later(loop, rand(2300, 3600));
    };
    later(loop, 900);
  }

  function topSuspectForMe() {
    var best = null; var bestSus = -1;
    E.alive(S.game).forEach(function (p) {
      if (p.isMe) return;
      var s = E.publicSus(S.game, p.seat);
      if (s > bestSus) { bestSus = s; best = p.seat; }
    });
    return best;
  }

  var SHOUT_KINDS = ['vague', 'sweat', 'alibi', 'legit'];
  function renderDebateControls() {
    var tg = $('uc-targets');
    tg.textContent = '';
    tg.appendChild(el('span', 'uc-label', t('undercover.debate.target')));
    E.alive(S.game).forEach(function (p) {
      if (p.isMe) return;
      var b = el('button', 'uc-target', '#' + pad(p.seat));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(S.target === p.seat));
      b.setAttribute('aria-label', '#' + pad(p.seat) + ' ' + nameOf(p));
      b.addEventListener('click', function () { S.target = p.seat; Sfx.sfxTap(); renderDebateControls(); });
      tg.appendChild(b);
    });
    var box = $('uc-shouts');
    box.textContent = '';
    SHOUT_KINDS.forEach(function (k) {
      var b = el('button', 'uc-shout ' + (k === 'legit' ? 'is-defend' : 'is-accuse'), t('undercover.shout.' + k, { seat: pad(S.target || 2) }));
      b.type = 'button';
      b.setAttribute('data-shout', k);
      b.addEventListener('click', function () { userShout(k, S.target); });
      box.appendChild(b);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('.uc-seat'), function (b) { b.classList.toggle('is-target', S.phase === 'debate' && Number(b.getAttribute('data-seat')) === S.target); });
  }

  function cooled() {
    var now = performance.now();
    if (now - S.lastAct < 900 / SPEED) return false;
    S.lastAct = now;
    return true;
  }

  function userShout(kind, target) {
    if (S.phase !== 'debate' || !me().alive || !cooled()) return;
    var res = E.shout(S.game, 1, kind, kind === 'legit' ? 1 : target);
    if (!res) return;
    Sfx.sfxSpeech(); buzz(10);
    bubble(1, t('undercover.shout.' + kind, { seat: pad(target || 1) }), null, true, 2600);
    if (kind !== 'legit') { flashMood(1, 'accusing'); floatDelta(target, res.delta); }
    var reactions = kind === 'legit' ? [] : E.botReaction(S.game, target);
    reactions.forEach(function (r, i) {
      later(function () {
        if (S.phase !== 'debate') return;
        bubble(r.from, t('undercover.banter.' + r.line, { seat: pad(r.target || r.from) }), null, true, 2400);
        if (r.line === 'agree') flashMood(r.from, 'accusing', 1800);
        updateMeters();
      }, 700 + i * 800);
    });
    updateMeters();
  }

  function renderBotAction(act) {
    if (act.kind === 'defend') {
      bubble(act.from, t('undercover.banter.' + act.line), null, true, 2400);
    } else if (act.kind === 'shout') {
      bubble(act.from, t('undercover.banter.accuse', { seat: pad(act.target) }), null, true, 2400);
      flashMood(act.from, 'accusing');
      floatDelta(act.target, act.delta);
      Sfx.sfxSpeech();
    } else if (act.kind === 'throw') {
      throwFx(act.from, act.target, act.item, function () {
        floatDelta(act.target, act.delta);
        var p = E.player(S.game, act.target);
        if (p && !p.isMe) bubble(act.target, t(act.delta < 0 ? 'undercover.banter.thanks' : 'undercover.banter.ouch'), null, true, 1800);
      });
      if (act.delta > 0) flashMood(act.from, 'accusing');
    }
    updateMeters();
  }

  function floatDelta(seat, delta) {
    if (!delta) return;
    var c = seatCenter(seat, 'av');
    var n = el('span', 'uc-float', (delta > 0 ? '+' : '') + delta + ' ' + t('undercover.seat.sus'));
    n.style.left = c.x + 'px';
    n.style.top = (c.y - 12) + 'px';
    n.style.color = delta > 0 ? '#ff6b9a' : '#00f5d4';
    $('uc-fx').appendChild(n);
    setTimeout(function () { n.remove(); }, 1200);
  }

  /* Fisika lempar: lintasan parabola (Bezier kuadrat) dari kursi pengirim ke kepala sasaran,
     berputar sepanjang jalan, lalu meledak sesuai jenis barang. */
  function throwFx(from, to, itemId, onHit) {
    var item = null;
    D.ITEMS.forEach(function (it) { if (it.id === itemId) item = it; });
    if (!item) return;
    var a = seatCenter(from, 'av');
    var b = seatCenter(to, 'av');
    var fx = $('uc-fx');
    var p = el('span', 'uc-proj', item.glyph);
    fx.appendChild(p);
    Sfx.sfxThrow(); buzz(8);
    var cx = (a.x + b.x) / 2;
    var cy = Math.min(a.y, b.y) - Math.max(60, Math.abs(a.x - b.x) * 0.35);
    var frames = [];
    for (var i = 0; i <= 12; i++) {
      var s = i / 12;
      var x = (1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * cx + s * s * b.x;
      var y = (1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * cy + s * s * b.y;
      frames.push({ transform: 'translate(' + (x - 13).toFixed(1) + 'px,' + (y - 13).toFixed(1) + 'px) rotate(' + Math.round(s * 540) + 'deg) scale(' + (1 + 0.45 * Math.sin(Math.PI * s)).toFixed(2) + ')' });
    }
    var dur = REDUCED ? 60 : Math.max(180, 700 / Math.sqrt(SPEED));
    var done = function () {
      p.remove();
      impactFx(to, item, b);
      if (onHit) onHit();
    };
    if (p.animate) {
      var anim = p.animate(frames, { duration: dur, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' });
      anim.onfinish = done;
    } else setTimeout(done, dur);
  }

  function impactFx(seat, item, c) {
    var fx = $('uc-fx');
    var seatEl = $('uc-seat-' + seat);
    seatEl.classList.remove('is-shake'); void seatEl.offsetWidth; seatEl.classList.add('is-shake');
    var colors = { splat: ['#ff3b3b', '#ff7a5c', '#c0161f'], clang: ['#ffbe0b', '#fff3b0', '#a0a0a0'], scan: ['#00f5d4', '#7ffff0'], steam: ['#d9d4ff', '#ffffff'], sparkle: ['#ff5c8f', '#ffbe0b', '#00f5d4'] }[item.fx] || ['#fff'];
    if (item.id === 'egg') colors = ['#ffe08a', '#fff7d6', '#ffc93c'];
    if (item.fx === 'splat') { Sfx.sfxSplat(); buzz([20, 20, 30]); }
    else if (item.fx === 'clang') { Sfx.sfxClang(); buzz(30); }
    else if (item.fx === 'scan') Sfx.sfxScanDone();
    else if (item.fx === 'steam') Sfx.sfxSteam();
    else Sfx.sfxSparkle();
    var count = item.fx === 'splat' ? 12 : 9;
    for (var i = 0; i < count; i++) {
      var d = el('span', 'uc-burst');
      var ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      var dist = 22 + Math.random() * 26;
      d.style.left = c.x + 'px';
      d.style.top = c.y + 'px';
      d.style.background = colors[i % colors.length];
      d.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      d.style.setProperty('--dy', (Math.sin(ang) * dist + (item.fx === 'splat' ? 10 : 0)).toFixed(1) + 'px');
      fx.appendChild(d);
      setTimeout(function (n) { n.remove(); }.bind(null, d), 700);
    }
    if (item.fx === 'splat') {
      var st = el('span', 'uc-stain');
      st.style.left = c.x + 'px';
      st.style.top = c.y + 'px';
      st.style.background = item.id === 'egg' ? 'radial-gradient(circle,#ffd23f 30%,#fff3c4 55%,transparent 70%)' : 'radial-gradient(circle,#e3262e 35%,#ff6b4a 55%,transparent 70%)';
      fx.appendChild(st);
      setTimeout(function () { st.remove(); }, 2700);
    } else {
      var ring = el('span', 'uc-ring-fx');
      ring.style.left = c.x + 'px';
      ring.style.top = c.y + 'px';
      ring.style.setProperty('--c', colors[0]);
      fx.appendChild(ring);
      setTimeout(function () { ring.remove(); }, 750);
    }
  }

  function onSeatClick(seat) {
    var p = E.player(S.game, seat);
    if (!p || !seatInteractive(p)) return;
    if (S.phase === 'debate') openTray(seat);
    else if (S.phase === 'tribunal') castVote(seat);
  }

  function openTray(seat) {
    var p = E.player(S.game, seat);
    S.trayTarget = seat;
    S.target = seat;
    renderDebateControls();
    $('uc-tray-title').textContent = t('undercover.tray.title', { seat: pad(seat), name: nameOf(p) });
    var items = $('uc-tray-items');
    items.textContent = '';
    D.ITEMS.forEach(function (it) {
      var b = el('button', 'uc-item ' + (it.social > 0 ? 'is-up' : 'is-down'));
      b.type = 'button';
      b.setAttribute('data-item', it.id);
      b.appendChild(el('span', '', it.glyph));
      b.appendChild(el('small', '', t('undercover.item.' + it.id)));
      b.setAttribute('aria-label', t('undercover.item.' + it.id) + ' — ' + t(it.social > 0 ? 'undercover.tray.up' : 'undercover.tray.down'));
      b.addEventListener('click', function () { userThrow(seat, it.id); });
      items.appendChild(b);
    });
    var sh = $('uc-tray-shouts');
    sh.textContent = '';
    ['vague', 'sweat'].forEach(function (k) {
      var b = el('button', 'uc-shout is-accuse', t('undercover.shout.' + k, { seat: pad(seat) }));
      b.type = 'button';
      b.addEventListener('click', function () { closeTray(); userShout(k, seat); });
      sh.appendChild(b);
    });
    $('uc-tray').hidden = false;
    Sfx.sfxTap();
  }
  function closeTray() {
    var tr = $('uc-tray');
    if (tr) tr.hidden = true;
    S.trayTarget = null;
  }

  function userThrow(seat, itemId) {
    if (S.phase !== 'debate' || !cooled()) return;
    var res = E.throwItem(S.game, 1, seat, itemId);
    closeTray();
    if (!res) return;
    if (res.delta > 0) flashMood(1, 'accusing');
    throwFx(1, seat, itemId, function () {
      floatDelta(seat, res.delta);
      bubble(seat, t(res.delta < 0 ? 'undercover.banter.thanks' : 'undercover.banter.ouch'), null, true, 1800);
      if (itemId === 'radar') {
        var lines = (res.clues || []).filter(function (c) { return !c.timedOut && c.a && c.b; }).map(function (c) { return c.a.en + ' · ' + c.b.en; });
        toast(t('undercover.tray.radar', { seat: pad(seat), clues: lines.join(' / ') || '…' }));
      }
      updateMeters();
    });
  }

  /* ------------------------------------------------------------ BABAK 5 ----------- */
  function startTribunal() {
    if (S.phase === 'tribunal') return;
    clearPhaseTimers();
    stopCountdown();
    closeTray();
    setPhase('tribunal');
    clearBubbles();
    setSpeaker(null);
    S.ballots = {};
    setStatus(t('undercover.tribunal.title'));
    setHolo('undercover.code.tribunal', t('undercover.table.round', { n: S.game.round }));
    showPanel(me().alive ? 'tribunal' : 'spectator');
    $('uc-vote-status').textContent = '';
    renderRoundLog('uc-log-tribunal');
    Array.prototype.forEach.call(doc.querySelectorAll('.uc-seat'), function (b) {
      var p = E.player(S.game, Number(b.getAttribute('data-seat')));
      b.classList.remove('is-target', 'is-voted');
      b.querySelector('.uc-vote-pill').hidden = !(p.alive && !p.isMe && me().alive);
      var tl = b.querySelector('.uc-tally');
      tl.textContent = '';
      tl.classList.remove('is-on');
    });
    updateMeters();
    var beat = function () { if (S.phase !== 'tribunal') return; Sfx.sfxHeartbeat(); later(beat, 900); };
    beat();
    countdown(VOTE_S, concludeVote, { tick: true });
    E.alive(S.game).forEach(function (p) {
      if (p.isMe) return;
      later(function () {
        if (S.phase !== 'tribunal' || S.ballots[p.seat]) return;
        var target = E.botVote(S.game, p.seat);
        if (!target) return;
        S.ballots[p.seat] = target;
        ticketFx(target);
        maybeConclude();
      }, rand(1300, 6600));
    });
  }

  function castVote(seat) {
    if (S.phase !== 'tribunal' || S.ballots[1] || !me().alive) return;
    S.ballots[1] = seat;
    Sfx.sfxVote(); buzz([15, 40, 15]);
    var b = $('uc-seat-' + seat);
    b.classList.add('is-voted');
    Array.prototype.forEach.call(doc.querySelectorAll('.uc-seat'), function (n) { if (n !== b) n.querySelector('.uc-vote-pill').hidden = true; });
    $('uc-vote-status').textContent = t('undercover.tribunal.you-voted', { seat: pad(seat) });
    ticketFx(seat);
    updateMeters();
    maybeConclude();
  }

  function ticketFx(seat) {
    var c = seatCenter(seat, 'av');
    var tk = el('span', 'uc-ticket', '🎟️');
    tk.style.left = c.x + 'px';
    tk.style.top = c.y + 'px';
    $('uc-fx').appendChild(tk);
    fxLater(function () {
      tk.remove();
      var count = 0;
      Object.keys(S.ballots).forEach(function (k) { if (S.ballots[k] === seat) count++; });
      var tl = $('uc-seat-' + seat).querySelector('.uc-tally');
      tl.textContent = String(count);
      tl.classList.add('is-on');
      tl.classList.remove('is-bump'); void tl.offsetWidth; tl.classList.add('is-bump');
      Sfx.sfxVote();
    }, 700);
  }

  function maybeConclude() {
    var voters = E.alive(S.game).length;
    if (Object.keys(S.ballots).length >= voters) later(concludeVote, 1100);
  }

  function concludeVote() {
    if (S.phase !== 'tribunal' || S.concluding) return;
    S.concluding = true;
    clearPhaseTimers();
    stopCountdown();
    if (me().alive && !S.ballots[1]) $('uc-vote-status').textContent = t('undercover.tribunal.abstain');
    setStatus(t('undercover.tribunal.counting'));
    Array.prototype.forEach.call(doc.querySelectorAll('.uc-vote-pill'), function (n) { n.hidden = true; });
    updateMeters();
    later(function () {
      var res = E.tally(S.game, S.ballots);
      if (res.tie) toast(t('undercover.tribunal.tie'));
      bust(res.eliminated);
    }, 900);
  }

  function bust(seat) {
    var p = E.player(S.game, seat);
    var spot = $('uc-spot');
    setSpeaker(seat);
    spot.classList.add('is-busted');
    $('uc-seat-' + seat).classList.add('is-busted');
    beat(function () {
      var out = E.eliminate(S.game, seat);
      Sfx.sfxGavel(); buzz([40, 60, 80]);
      var b = $('uc-seat-' + seat);
      b.classList.add('is-slam');
      var arena = $('uc-arena');
      arena.classList.remove('is-quake'); void arena.offsetWidth; arena.classList.add('is-quake');
      var tag = el('span', 'uc-role-tag ' + p.role, t('undercover.role-tag.' + p.role));
      b.appendChild(tag);
      updateMeters();
      var msg = p.isMe
        ? t('undercover.tribunal.you-exiled', { role: roleName(p.role) })
        : t('undercover.tribunal.exiled', { seat: pad(seat), name: nameOf(p), role: roleName(p.role) });
      setStatus(msg);
      toast(msg, out.infiltrator ? 'good' : 'bad');
      S.concluding = false;
      beat(function () {
        spot.classList.remove('is-busted');
        b.classList.remove('is-busted');
        if (out.infiltrator) openShowdown(seat);
        else afterElimination();
      }, 2600);
    }, 1100);
  }

  function afterElimination() {
    var w = E.checkWinner(S.game);
    if (w) { later(openDebrief, 500); return; }
    if (S.phase !== 'clue' && S.phase !== 'debate' && S.phase !== 'tribunal') setPhase('clue');
    toast(t('undercover.tribunal.next-round'));
    later(function () {
      Array.prototype.forEach.call(doc.querySelectorAll('.uc-seat'), function (b) {
        b.classList.remove('is-voted', 'is-slam');
        var tl = b.querySelector('.uc-tally');
        tl.classList.remove('is-on');
      });
      startRound();
    }, 1500);
  }

  /* ----------------------------------------------------------- BABAK 6a ----------- */
  function openShowdown(seat) {
    clearPhaseTimers();
    setPhase('showdown');
    var p = E.player(S.game, seat);
    var opts = E.guessOptions(S.game, seat);
    $('uc-sd-who').textContent = p.isMe ? t('undercover.showdown.you') : t('undercover.showdown.bot', { seat: pad(seat), name: nameOf(p) });
    $('uc-sd-msg').textContent = '';
    var grid = $('uc-sd-grid');
    grid.textContent = '';
    opts.forEach(function (w) {
      var b = el('button', 'uc-intel', w);
      b.type = 'button';
      b.setAttribute('data-word', w);
      b.disabled = !p.isMe;
      b.addEventListener('click', function () { resolveShowdown(seat, w); });
      grid.appendChild(b);
    });
    S.showdownStart = performance.now();
    S.showdownSeat = seat;
    Sfx.sfxHeartbeat();
    countdown(GUESS_S, function () { resolveShowdown(seat, null); }, { big: true, tick: true });
    if (!p.isMe) {
      var buttons = grid.querySelectorAll('.uc-intel');
      var k = 0;
      var cycle = function () {
        if (S.phase !== 'showdown' || S.showdownSeat !== seat) return;
        Array.prototype.forEach.call(buttons, function (n, i) { n.classList.toggle('is-scan', i === k % buttons.length); });
        k++;
        later(cycle, 260);
      };
      cycle();
      later(function () { resolveShowdown(seat, E.botGuess(S.game, seat)); }, rand(2600, 3800));
    } else {
      try { grid.querySelector('.uc-intel').focus({ preventScroll: true }); } catch (_) {}
    }
  }

  function resolveShowdown(seat, word) {
    if (S.phase !== 'showdown' || S.showdownSeat !== seat) return;
    S.showdownSeat = null;
    clearPhaseTimers();
    stopCountdown();
    var p = E.player(S.game, seat);
    var before = S.game.evidence.length;
    var r = E.resolveGuess(S.game, seat, word, { ms: performance.now() - S.showdownStart, at: Date.now() });
    if (S.game.evidence.length > before) queueEvidence(S.game.evidence[S.game.evidence.length - 1]);
    Array.prototype.forEach.call(doc.querySelectorAll('#uc-sd-grid .uc-intel'), function (n) {
      var w = n.getAttribute('data-word');
      n.disabled = true;
      n.classList.remove('is-scan');
      if (w === S.game.pair.civ.en) n.classList.add('is-right');
      else if (w === word) n.classList.add('is-wrong');
    });
    var msg = !word ? t('undercover.showdown.timeout') : (r.correct ? t('undercover.showdown.right') : t('undercover.showdown.wrong'));
    $('uc-sd-msg').textContent = msg;
    var infWin = r.correct;
    var iAmInf = E.isInfiltrator(me());
    if (infWin === iAmInf) { Sfx.sfxFanfare(); buzz([20, 40, 20, 40, 60]); } else { Sfx.sfxFail(); buzz(80); }
    beat(function () {
      if (S.game.winner) { openDebrief(); return; }
      setPhase('clue');
      afterElimination();
    }, 2400);
    return p;
  }

  /* ----------------------------------------------------------- BABAK 6b ----------- */
  function openDebrief() {
    clearPhaseTimers();
    stopCountdown();
    setPhase('debrief');
    var g = S.game;
    var sm = E.summary(g);
    var stats = lsJson(KEYS.stats, null) || { games: 0, wins: 0, best: 0 };
    stats.games = (Number(stats.games) || 0) + 1;
    if (sm.won) stats.wins = (Number(stats.wins) || 0) + 1;
    stats.best = Math.max(Number(stats.best) || 0, sm.score);
    stats.last = { at: Date.now(), score: sm.score, won: sm.won, pair: g.pair.id, mode: g.mode, size: g.size };
    lsSet(KEYS.stats, JSON.stringify(stats));

    var banner = $('uc-banner');
    banner.className = 'uc-banner uc-glass' + (sm.winner === 'inf' ? ' is-inf' : '');
    $('uc-banner-code').textContent = t(sm.winner === 'civ' ? 'undercover.debrief.agent-victory' : 'undercover.debrief.infiltration');
    $('uc-banner-title').textContent = t(sm.won ? 'undercover.debrief.you-win' : 'undercover.debrief.you-lose');
    $('uc-banner-reason').textContent = t(sm.reason === 'all-caught' ? 'undercover.debrief.civ-won' : (sm.reason === 'stolen' ? 'undercover.debrief.inf-stole' : 'undercover.debrief.inf-won'));

    var roles = $('uc-roles');
    roles.textContent = '';
    g.players.forEach(function (p) {
      var c = el('span', 'uc-role-chip ' + p.role);
      c.appendChild(el('span', 'uc-mono', '#' + pad(p.seat) + ' '));
      c.appendChild(doc.createTextNode(nameOf(p) + ' · ' + roleName(p.role)));
      roles.appendChild(c);
    });

    var vs = $('uc-vs');
    vs.textContent = '';
    var civ = el('div', 'is-civ');
    civ.appendChild(el('div', 'uc-mono', g.pair.civ.en));
    civ.appendChild(el('small', '', gloss(g.pair.civ.en) + ' · ' + roleName('civ')));
    var spy = el('div', 'is-spy');
    spy.appendChild(el('div', 'uc-mono', g.pair.spy.en));
    spy.appendChild(el('small', '', gloss(g.pair.spy.en) + ' · ' + roleName('spy')));
    vs.appendChild(civ); vs.appendChild(el('i', '', t('undercover.debrief.vs'))); vs.appendChild(spy);
    $('uc-nuance').textContent = t(D.nuanceKey(g.pair.id));

    var recap = $('uc-recap');
    recap.textContent = '';
    var mine = g.players[0];
    if (!mine.clues.length) recap.appendChild(el('div', 'uc-log-empty', t('undercover.debrief.no-clues')));
    mine.clues.forEach(function (c) {
      var row = el('div', 'uc-recap-row');
      row.appendChild(el('span', 'uc-mono', 'R' + c.round));
      var body = el('span', 'uc-recap-clue');
      var ca = c.a && D.chipsOf(g.pair).filter(function (x) { return x.id === c.a; })[0];
      var cb = c.b && D.chipsOf(g.pair).filter(function (x) { return x.id === c.b; })[0];
      if (c.timedOut || !ca || !cb) body.appendChild(el('b', '', '…'));
      else {
        body.appendChild(el('b', '', ca.en + ' · ' + cb.en));
        body.appendChild(el('small', '', chipGloss(ca) + ' · ' + chipGloss(cb)));
      }
      var kind = c.timedOut ? 'timeout' : (mine.role === 'white' ? 'white' : (E.fits(ca, mine.role) && E.fits(cb, mine.role) ? 'yes' : 'no'));
      if (kind === 'no') {
        /* Umpan balik korektif: chip yang keliru diganti contoh yang memang cocok dengan kata
           murid pada dimensi yang sama — murid melihat makna yang benar, bukan hanya tanda salah. */
        var wrong = !E.fits(ca, mine.role) ? ca : cb;
        var own = g.pair[wrong.dim][mine.role === 'spy' ? 'spy' : 'civ'][0];
        body.appendChild(el('small', 'uc-fix', t('undercover.debrief.fit-example', { chip: own[1] })));
      }
      row.appendChild(body);
      row.appendChild(el('span', 'uc-fit ' + kind, t(FIT_KEY[kind])));
      recap.appendChild(row);
    });

    var st = $('uc-stats');
    st.textContent = '';
    var cells = [
      [sm.clueTotal ? sm.clueOk + '/' + sm.clueTotal : '—', t('undercover.debrief.clue-fit')],
      [sm.guess && sm.guess.correct !== null ? t(sm.guess.correct ? 'undercover.debrief.guess-right' : 'undercover.debrief.guess-wrong') : '—', t('undercover.debrief.guess')],
      sm.team === 'civ'
        ? [sm.voteTotal ? sm.voteHits + '/' + sm.voteTotal : '—', t('undercover.debrief.votes')]
        : [t('undercover.debrief.rounds', { n: sm.survived }), t('undercover.debrief.survived')],
      [String(sm.score), t('undercover.debrief.score') + ' · ' + t('undercover.debrief.best', { n: stats.best })]
    ];
    cells.forEach(function (c) {
      var n = el('div', 'uc-stat');
      n.appendChild(el('b', '', c[0]));
      n.appendChild(el('small', '', c[1]));
      st.appendChild(n);
    });

    var notes = [];
    var words = [];
    sm.evidence.forEach(function (r) { var w = String(r.word || '').toUpperCase(); if (words.indexOf(w) < 0) words.push(w); });
    notes.push(sm.evidence.length
      ? t('undercover.debrief.queued', { n: sm.evidence.length, words: words.join(', ') })
      : t('undercover.debrief.queued-none'));
    var mineWord = myWordEntry();
    if (mineWord && !mineWord.vocabId) notes.push(t('undercover.debrief.not-in-bank', { word: mineWord.en }));
    if (sm.timeouts) notes.push(t('undercover.debrief.timeout-note'));
    var ev = $('uc-evid');
    ev.textContent = '';
    notes.forEach(function (line, i) {
      if (i) ev.appendChild(el('br'));
      ev.appendChild(doc.createTextNode(line));
    });

    if (sm.won) { Sfx.sfxFanfare(); buzz([30, 50, 30, 50, 90]); } else Sfx.sfxFail();
    try { $('uc-again').focus({ preventScroll: true }); } catch (_) {}
  }

  /* ----------------------------------------------------------- modal ------------- */
  function openRules() { $('uc-rules').hidden = false; Sfx.sfxTap(); try { $('uc-rules-close').focus({ preventScroll: true }); } catch (_) {} }
  function closeRules() { $('uc-rules').hidden = true; Sfx.sfxTap(); }
  function openPeek() {
    var m = me();
    if (!m) return;
    fillRoleBadge($('uc-peek-role'), m.role);
    var w = myWordEntry();
    $('uc-peek-word').textContent = w ? w.en : '???';
    $('uc-peek-gloss').textContent = w ? gloss(w.en) : t('undercover.reveal.no-word');
    $('uc-peekbox').hidden = false;
    Sfx.sfxScanDone();
    try { $('uc-peek-close').focus({ preventScroll: true }); } catch (_) {}
  }
  function closePeek() { $('uc-peekbox').hidden = true; }

  function renderSfx() {
    var b = $('uc-sfx');
    var on = Sfx.isOn();
    b.setAttribute('aria-pressed', String(on));
    b.textContent = t(on ? 'undercover.sfx-on' : 'undercover.sfx-off');
  }

  /* ----------------------------------------------------------- pemasangan -------- */
  function wire() {
    Array.prototype.forEach.call(doc.querySelectorAll('#uc-modes .uc-mode'), function (b) {
      b.addEventListener('click', function () { S.mode = b.getAttribute('data-mode'); Sfx.sfxTap(); saveLobbyPrefs(); renderLobby(); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('#uc-sizes button'), function (b) {
      b.addEventListener('click', function () {
        S.size = Number(b.getAttribute('data-size'));
        S.seats = S.seats.slice(0, S.size - 1);
        Sfx.sfxTap(); saveLobbyPrefs(); renderLobby();
      });
    });
    $('uc-fill').addEventListener('click', fillAll);
    $('uc-start').addEventListener('click', function () { startMatchmaking(false); });

    var sc = $('uc-scanner');
    sc.addEventListener('pointerdown', function (e) { e.preventDefault(); try { sc.setPointerCapture(e.pointerId); } catch (_) {} scanStart(); });
    sc.addEventListener('pointerup', scanCancel);
    sc.addEventListener('pointercancel', scanCancel);
    sc.addEventListener('lostpointercapture', scanCancel);
    sc.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    sc.addEventListener('click', function (e) { if (e.detail === 0) scanKeyboard(); });
    $('uc-enter').addEventListener('click', enterTable);

    ['a', 'b'].forEach(function (d) {
      $('uc-tab-' + d).addEventListener('click', function () { S.dim = d; Sfx.sfxTap(); renderSynth(); });
    });
    $('uc-transmit').addEventListener('click', function () { if (S.pick.a && S.pick.b) submitClue(false); });
    $('uc-to-tribunal').addEventListener('click', function () { Sfx.sfxTap(); startTribunal(); });
    $('uc-tray-close').addEventListener('click', closeTray);

    $('uc-again').addEventListener('click', function () { Sfx.sfxTap(); setPhase('lobby'); renderLobby(); startMatchmaking(true); });
    $('uc-relobby').addEventListener('click', function () { Sfx.sfxTap(); clearPhaseTimers(); S.game = null; setPhase('lobby'); renderLobby(); });

    $('uc-rules-btn').addEventListener('click', openRules);
    $('uc-rules-close').addEventListener('click', closeRules);
    $('uc-peek').addEventListener('click', openPeek);
    $('uc-peek-close').addEventListener('click', closePeek);
    ['uc-rules', 'uc-peekbox'].forEach(function (id) {
      $(id).addEventListener('click', function (e) { if (e.target === e.currentTarget) { $(id).hidden = true; } });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('uc-rules').hidden) closeRules();
      else if (!$('uc-peekbox').hidden) closePeek();
      else if (!$('uc-tray').hidden) closeTray();
    });
    $('uc-sfx').addEventListener('click', function () { Sfx.setOn(!Sfx.isOn()); renderSfx(); Sfx.sfxTap(); });
    root.addEventListener('pageshow', function () { if (S.phase === 'lobby') renderReceipt(); });
    if (root.ResizeObserver) new root.ResizeObserver(function () { layoutSeats(); }).observe($('uc-arena'));
    else root.addEventListener('resize', layoutSeats);
  }

  function start() {
    applyStaticText();
    loadLobbyPrefs();
    renderSfx();
    wire();
    setPhase('lobby');
    renderLobby();
  }

  /* Snapshot untuk probe Playwright dan panel diagnostik. Peran pemain lain hanya keluar
     pada ?probe=1 — tanpa itu snapshot hanya memuat apa yang memang sudah diketahui murid. */
  root.FiezelUndercoverUI = {
    snapshot: function () {
      var g = S.game;
      var out = { phase: S.phase, round: g ? g.round : 0, winner: g ? g.winner : null, queued: pendingEvidence(), locale: I.getLocale() };
      if (g) {
        out.me = { role: me().role, word: me().word, alive: me().alive };
        out.alive = E.alive(g).length;
        out.evidence = g.evidence.length;
        if (PROBE) {
          out.players = g.players.map(function (p) { return { seat: p.seat, role: p.role, alive: p.alive, sus: E.publicSus(g, p.seat) }; });
          out.pair = { id: g.pair.id, civ: g.pair.civ.en, spy: g.pair.spy.en };
        }
      }
      return out;
    },
    sfx: Sfx
  };

  var loc = resolveLocale();
  if (loc === 'th') {
    loadScript('./features/i18n/copy-th-undercover.js')
      .then(function () { I.setLocale('th'); start(); }, function () { start(); });
  } else start();
}());
