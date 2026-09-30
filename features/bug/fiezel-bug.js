/**
 * FIEZEL BUG — Sarang (Home baru) + Perburuan (arena) di atas engine asli app.js:
 * Misconception Ledger (bug apa yang hidup), BKT + stabilitas ingatan (HP & pulih semalam),
 * FiezelCoreBrain.successProbability lewat quizPredictedSuccess() (Beat Prediksi), dan
 * pipeline jawaban yang sama dengan kuis biasa: record → updateMastery → tutorObserve →
 * settleReviewScheduleSilently → save. Tanpa jaringan; species & taksonomi dari precache.
 */
(function (root) {
  'use strict';
  var doc = root.document, C = function () { return root.FiezelBugCore; };
  function t(k, fb, p) { try { var I = root.FiezelI18n, s = I && I.t ? I.t(k, p) : undefined; if (s === undefined || s === k) return fb == null ? k : fb; return s; } catch (_) { return fb == null ? k : fb; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function g(name) { try { var v = root[name]; return typeof v === 'function' ? v : null; } catch (_) { return null; } }
  function call(name) { var f = g(name); if (!f) return undefined; try { return f.apply(null, Array.prototype.slice.call(arguments, 1)); } catch (_) { return undefined; } }
  function appState() { try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; } }
  var REDUCED = false; try { REDUCED = root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  /* ---------------- data (precache) ---------------- */
  var SPECIES = null, TAX = null, loading = null;
  function load() {
    if (loading) return loading;
    loading = Promise.all([
      fetch('./features/bug/bug-species.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('./misconception-taxonomy-v1.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) { SPECIES = res[0] || { species: {}, taunts: { id: {} } }; TAX = (res[1] && res[1].map) || {}; if (appState() && appState().view === 'home') call('renderInner'); });
    return loading;
  }
  load();

  /* ---------------- engine bridge ---------------- */
  function masteryOf(lesson, now) {
    var B = root.FiezelMasteryBKT, st = call('bktRead'); if (!B || !st) return null;
    var s = appState(), row = s && s.grammar && s.grammar[lesson], hl = row && Number(row.stabilityDays) > 0 ? Number(row.stabilityDays) : 30;
    try { var m = B.mastery(st, lesson, now, hl), r = B.mastery(st, lesson); return { L: m.L, Lrested: r.L, n: m.n }; } catch (_) { return null; }
  }
  function bugs() {
    var led = call('misconceptionLedgerRead');
    return C() ? C().deriveBugs({ entries: led && led.entries, species: SPECIES, taxonomyMap: TAX, masteryOf: masteryOf, nowMs: Date.now() }) : [];
  }
  function alive(list) { return list.filter(function (b) { return !b.fosil; }); }

  /* ---------------- makhluk (SVG prosedural, 4 bentuk) ---------------- */
  function bugSVG(b, size) {
    var c = b.color || '#8A7F79', ink = '#1E1917', body = '', sh = b.shape || 'spike';
    var eyes = '<ellipse class="fzb-eye" cx="38" cy="44" rx="7" ry="8" fill="#FBF7F3"/><ellipse class="fzb-eye" cx="62" cy="44" rx="7" ry="8" fill="#FBF7F3"/><rect x="36" y="38" width="4" height="12" rx="2" fill="' + ink + '"/><rect x="60" y="38" width="4" height="12" rx="2" fill="' + ink + '"/>';
    if (sh === 'seg') body = '<g class="fzb-antena"><path d="M30 8c6 8 6 8 12 0M70 8c-6 8-6 8-12 0" stroke="' + c + '" stroke-width="4" fill="none" stroke-linecap="round"/></g><g class="fzb-legs"><path d="M26 74l-12 10M74 74l12 10M22 60l-14 2M78 60l14 2" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/></g><ellipse cx="50" cy="66" rx="30" ry="22" fill="' + c + '"/><ellipse cx="50" cy="42" rx="24" ry="20" fill="' + c + '"/>';
    else if (sh === 'cap') body = '<g class="fzb-legs"><path d="M22 40l-12-4M22 52l-12 4M78 40l12-4M78 52l12 4M30 84l-6 10M70 84l6 10" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/></g><rect x="22" y="18" width="56" height="66" rx="28" fill="' + c + '"/><path d="M24 60h52M26 72h48" stroke="' + ink + '" stroke-width="4" opacity=".5"/><g class="fzb-antena"><path d="M40 14c2-8 6-8 8-2M52 12c2-8 6-8 8-2" stroke="' + c + '" stroke-width="4" fill="none" stroke-linecap="round"/></g>';
    else if (sh === 'box') { body = '<g class="fzb-legs"><rect x="8" y="60" width="12" height="8" fill="' + c + '"/><rect x="80" y="60" width="12" height="8" fill="' + c + '"/><rect x="30" y="80" width="10" height="12" fill="' + c + '"/><rect x="60" y="80" width="10" height="12" fill="' + c + '"/></g><rect x="20" y="22" width="60" height="58" rx="10" fill="' + c + '"/><g class="fzb-antena"><rect x="46" y="8" width="8" height="14" fill="' + c + '"/></g><path d="M34 66h32" stroke="' + ink + '" stroke-width="4" stroke-dasharray="6 4"/>';
      eyes = '<rect class="fzb-eye" x="30" y="36" width="14" height="14" fill="#FBF7F3"/><rect class="fzb-eye" x="56" y="36" width="14" height="14" fill="#FBF7F3"/><rect x="35" y="40" width="5" height="8" fill="' + ink + '"/><rect x="61" y="40" width="5" height="8" fill="' + ink + '"/>'; }
    else body = '<g class="fzb-antena"><path d="M50 4l6 14H44zM20 22l14 6-8 10zM80 22l-14 6 8 10zM14 60l14-2-4 12zM86 60l-14-2 4 12z" fill="' + c + '" opacity=".85"/></g><g class="fzb-legs"><path d="M30 82l-6 12M70 82l6 12M50 88v10" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/></g><circle cx="50" cy="56" r="30" fill="' + c + '"/>';
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true">' + body + eyes + '</svg>';
  }
  function ringSVG(hp) { var Cc = 2 * Math.PI * 33; return '<svg class="fzb-hp" viewBox="0 0 72 72"><circle class="fzb-trk" cx="36" cy="36" r="33" fill="none" stroke-width="4"/><circle class="fzb-val" cx="36" cy="36" r="33" fill="none" stroke-width="4" stroke-dasharray="' + Cc.toFixed(1) + '" stroke-dashoffset="' + (Cc * (1 - Math.max(0, hp) / 100)).toFixed(1) + '"/></svg>'; }

  /* ---------------- audio: sinyal per spesies + juice ---------------- */
  var AC; function ac() { AC = AC || new (root.AudioContext || root.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; }
  function noise(dur, freq, q, gain, delay) { var c = ac(), tt = c.currentTime + (delay || 0), buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5); var s = c.createBufferSource(); s.buffer = buf; var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; var gn = c.createGain(); gn.gain.setValueAtTime(gain, tt); gn.gain.exponentialRampToValueAtTime(.0001, tt + dur); s.connect(f); f.connect(gn); gn.connect(c.destination); s.start(tt); }
  function tone(type, f0, f1, dur, gain, delay) { var c = ac(), tt = c.currentTime + (delay || 0), o = c.createOscillator(), gn = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, tt); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), tt + dur * .6); gn.gain.setValueAtTime(.0001, tt); gn.gain.exponentialRampToValueAtTime(gain, tt + .012); gn.gain.exponentialRampToValueAtTime(.0001, tt + dur); o.connect(gn); gn.connect(c.destination); o.start(tt); o.stop(tt + dur + .02); }
  var sfx = {
    crack: function () { noise(.14, 3200, .6, 1); noise(.3, 1400, 1, .5, .03); tone('triangle', 1400, 2300, .3, .35, .01); },
    bite: function () { noise(.24, 260, 1.2, .9); tone('sawtooth', 180, 50, .36, .4); },
    tick: function () { noise(.025, 3400, 3, .16); }, lock: function () { tone('sine', 210, 210, .4, .3); noise(.09, 900, 2, .32); tone('triangle', 420, 840, .2, .15, .05); },
    heart: function () { tone('sine', 70, 40, .16, .5); tone('sine', 60, 35, .14, .35, .14); }, arm: function () { tone('square', 330, 660, .12, .18); tone('square', 495, 990, .14, .18, .1); },
    buzz: function () { tone('sawtooth', 140, 100, .45, .35); noise(.4, 500, 1, .4); }, soft: function () { tone('sine', 523, 659, .25, .2); tone('sine', 784, 784, .3, .15, .12); }, stamp: function () { noise(.12, 600, 1.2, .8); tone('square', 150, 90, .15, .25); }
  };
  /* Tanda tangan suara per BENTUK spesies — supaya bug dikenali dengan mata tertutup. */
  var SIGNAL = {
    seg: function () { [0, .18, .36].forEach(function (d, i) { noise(.14, 5200 - i * 600, 4, .45, d); }); tone('sine', 240, 180, .5, .12, .05); },                    /* Es-Es: desisan "ss-ss-ss" */
    cap: function () { tone('triangle', 660, 880, .22, .25); tone('triangle', 880, 660, .22, .25, .24); tone('triangle', 660, 990, .3, .22, .48); },                /* Ing-Ing: dentingan "ing-ing" bergoyang */
    box: function () { [0, .09, .18, .3, .39].forEach(function (d) { noise(.03, 1800, 6, .5, d); tone('square', 220, 200, .05, .12, d); }); },                     /* Si Harfiah: ketukan mekanis kaku */
    spike: function () { tone('sine', 1760, 2640, .35, .18); tone('sine', 2200, 3300, .4, .14, .12); noise(.25, 7000, 2, .2, .05); }                              /* berduri: kilau kaca tajam */
  };
  function safe(fn) { try { fn(); } catch (_) {} }
  function vib(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (_) {} }
  function signal(b) { safe(function () { (SIGNAL[b && b.shape] || SIGNAL.spike)(); }); }

  /* ---------------- HOME: adegan Sarang ---------------- */
  var POS = [[20, 45], [80, 52], [27, 72]];
  function homeMarkup() {
    var list = bugs(), shown = alive(list).slice(0, 3), fosil = list.filter(function (b) { return b.fosil; }).length, tg = shown[0] || null, out = '';
    shown.forEach(function (b, i) {
      var isT = tg && tg.id === b.id;
      out += '<button type="button" class="fzb-bug' + (isT ? ' fzb-target' : '') + '" style="left:' + POS[i][0] + '%;top:' + POS[i][1] + '%;--c:' + b.color + '" onclick="FiezelBug.poke(\'' + esc(b.id) + '\')" aria-label="' + esc(b.name) + '">' +
        '<span class="fzb-ring">' + ringSVG(b.hp) + '<span class="fzb-body">' + bugSVG(b, 52) + '</span></span><span class="fzb-name">' + esc(b.name) + '</span>' +
        '<span class="fzb-hpv' + (isT ? ' warn' : b.hp <= 25 ? ' low' : '') + '">' + esc(t('bug.hp', 'HP {hp}%', { hp: b.hp })) + (isT ? ' · ' + esc(t('bug.mengincar', 'mengincar')) : '') + '</span></button>';
    });
    if (!shown.length) POS.forEach(function (p, i) { out += '<span class="fzb-bug fzb-ghost" style="left:' + p[0] + '%;top:' + p[1] + '%"><span class="fzb-ring"><span class="fzb-q">?</span></span><span class="fzb-name">' + esc(t('bug.belum-ketahuan', 'belum ketahuan')) + '</span></span>'; });
    var rec = shown.filter(function (b) { return b.recovered >= 2; }).sort(function (a, b) { return b.recovered - a.recovered; })[0];
    var whisper = rec ? t('bug.whisper-pulih', '{nama} pulih +{hp} HP selagi kamu absen', { nama: rec.name, hp: rec.recovered })
      : shown.length ? t('bug.whisper-siaga', 'Bug pulih secepat kamu lupa. Buru sebelum mereka gemuk.') : t('bug.whisper-kosong', 'Jawab 5 soal — bug pertamamu bakal ketahuan.');
    var sub = shown.length ? t('bug.sub', '{n} bug tinggal di kepalamu', { n: alive(list).length }) : t('bug.sub-kosong', 'Kepalamu belum terpetakan');
    var paw = call('pawFaceMarkup') || '';
    return '<section class="fzb-sarang" data-testid="bug-sarang" style="--tx:' + (tg ? POS[0][0] : 50) + ';--ty:' + (tg ? POS[0][1] : 52) + '">' +
      '<div class="fzb-fog"></div><div class="fzb-label">' + esc(t('bug.sarang', 'SARANG')) + '</div><div class="fzb-sub">' + esc(sub) + '</div>' +
      (fosil ? '<div class="fzb-fosil-chip">' + esc(t('bug.fosil-n', '{n} fosil', { n: fosil })) + '</div>' : '') +
      out + '<div class="fzb-whisper"><span class="fzb-spk"></span><span>' + esc(whisper) + '</span></div>' +
      '<div class="fzb-paw' + (tg ? ' hunting' : '') + '" aria-hidden="true">' + paw + '</div>' +
      '<button type="button" class="fzb-cta" data-testid="bug-cta" onclick="go(\'nujum\')"><span>' + esc(t('bug.cta', 'BURU 5 BUG HARI INI')) + '<small>' + esc(tg ? t('bug.cta-sub', '· 5 RONDE · 8 DETIK · {nama} MENGINCAR', { nama: tg.name.toUpperCase() }) : t('bug.cta-sub-kosong', '· 5 RONDE · TEMUKAN BUG PERTAMAMU')) + '</small></span><span class="fzb-arrow">→</span></button></section>';
  }
  function poke(id) { var b = bugs().filter(function (x) { return x.id === id; })[0]; if (!b) return; safe(ac); signal(b); vib(20); call('pawReact', 'wake'); var el = doc.querySelector('.fzb-bug[aria-label="' + b.name.replace(/"/g, '') + '"]'); if (el) { el.classList.remove('fzb-poke'); void el.offsetWidth; el.classList.add('fzb-poke'); } }

  /* ---------------- PERBURUAN ---------------- */
  var H = { qs: [], idx: 0, results: [], tutor: null, dd: false, start: 0, locked: false, T: { raf: 0, end: 0, total: 8000, panic: false, hb: 0 } };
  function pickQuestions(list) {
    var targets = alive(list).slice(0, 3), want = [], items = root.GRAMMAR_ITEMS || (function () { try { return GRAMMAR_ITEMS; } catch (_) { return []; } })();
    var open = function (skill) { var u = call('lessonUnlockState', skill); return !u || u.locked !== true; };
    targets.forEach(function (b) { b.lessons.forEach(function (l) { if (want.indexOf(l) === -1 && open(l)) want.push(l); }); });
    var lvl = call('grammarItemsForLevel') || [], skills = want.slice();
    lvl.forEach(function (e) { if (skills.length < 8 && skills.indexOf(e.skill) === -1 && open(e.skill)) skills.push(e.skill); });
    var qs = [], used = {};
    for (var i = 0; qs.length < 5 && i < 40 && skills.length; i++) {
      var skill = skills[qs.length % skills.length], pool = items.filter(function (e) { return e.skill === skill; }); if (!pool.length) { skills.splice(skills.indexOf(skill), 1); continue; }
      var e = pool[Math.floor(Math.random() * pool.length)], q = call('makeGrammarQuestion', skill, e.item, 0); if (!q || used[q.question]) continue;
      if (!q.optionMisconceptions && i < 25) continue; used[q.question] = 1; qs.push(q);
    }
    return qs.map(function (q, i) {
      var b = C().bugForQuestion(q, list, TAX, SPECIES) || targets[i % Math.max(1, targets.length)] || C().speciesOf('transfer.id_l1_pattern', SPECIES);
      if (!b.id) b = Object.assign({ id: 'transfer.id_l1_pattern', hp: 50, belief: C().PRIOR }, b);
      q.__predicted = call('quizPredictedSuccess', q); return { q: q, bug: b, bet: C().betPercent(q.__predicted, b) };
    });
  }
  function view() {
    var app = doc.getElementById('app'); if (!app) return;
    doc.body.classList.add('fz-view-nujum');
    try { var nav = doc.querySelector('.bottomnav'); if (nav) nav.style.setProperty('display', 'none', 'important'); var tb = doc.querySelector('.topbar'); if (tb) tb.style.setProperty('display', 'none', 'important'); } catch (_) {}
    app.innerHTML = '<div class="fzb-hunt"><div class="fzb-loading">' + esc(t('bug.memuat', 'Mengendus bug…')) + '</div></div>';
    load().then(function () {
      var list = bugs(); H.qs = pickQuestions(list); H.idx = 0; H.results = []; H.locked = false; H.tutor = call('tutorSession') || null;
      if (!H.qs.length) { app.innerHTML = '<div class="fzb-hunt"><div class="fzb-loading">' + esc(t('bug.kosong', 'Bank soal belum termuat. Coba lagi sebentar.')) + '</div><button class="fzb-next" onclick="FiezelBug.exit()">' + esc(t('bug.kembali', 'KEMBALI KE SARANG')) + '</button></div>'; return; }
      ensureFx(); beat(H.qs[0], function () { renderQ(0); });
    });
  }
  function exit() { stopTimer(); doc.body.classList.remove('fz-view-nujum'); try { var nav = doc.querySelector('.bottomnav'); if (nav) nav.style.removeProperty('display'); var tb = doc.querySelector('.topbar'); if (tb) tb.style.removeProperty('display'); } catch (_) {} var ov = doc.getElementById('fzbBeat'); if (ov) ov.remove(); call('go', 'home'); }

  /* Beat Prediksi */
  function beat(r, done) {
    var b = r.bug, ov = doc.getElementById('fzbBeat'); if (!ov) { ov = doc.createElement('div'); ov.id = 'fzbBeat'; doc.body.appendChild(ov); }
    ov.className = 'fzb-beat'; ov.style.setProperty('--eye', b.color);
    ov.innerHTML = '<div class="fzb-aura"></div><div class="fzb-eyes"><span class="fzb-beye l"></span><span class="fzb-beye r"></span></div><div class="fzb-who">' + esc(t('bug.beat-who', 'BUG MENGINCAR')) + '</div><div class="fzb-bname"><span>' + esc(b.name) + '</span> ' + esc(t('bug.beat-lock', 'mengunci target…')) + '</div><div class="fzb-pct" id="fzbPct">0<small>%</small></div><div class="fzb-hint">' + esc(t('bug.beat-hint', 'peluang kamu kegigit menurut {nama}', { nama: b.name })) + '</div>';
    requestAnimationFrame(function () { ov.classList.add('on'); }); safe(ac); setTimeout(function () { signal(b); }, 250);
    var t0 = null, D = REDUCED ? 400 : 1100, last = -1;
    function frame(ts) { if (!t0) t0 = ts; var k = Math.min((ts - t0) / D, 1), e = 1 - Math.pow(1 - k, 2.6), v = Math.round(r.bet * e), el = doc.getElementById('fzbPct'); if (!el) return;
      if (v !== last) { el.innerHTML = v + '<small>%</small>'; if (v % 3 === 0) safe(sfx.tick); last = v; }
      if (k < 1) requestAnimationFrame(frame); else { el.innerHTML = r.bet + '<small>%!</small>'; ov.querySelector('.fzb-bname').innerHTML = '<span>' + esc(b.name) + '</span> ' + esc(t('bug.mengincar', 'mengincar')); ov.classList.add('hold'); safe(sfx.lock); vib(40);
        setTimeout(function () { ov.classList.remove('on'); setTimeout(function () { ov.remove(); done(); }, 240); }, REDUCED ? 300 : 800); } }
    setTimeout(function () { requestAnimationFrame(frame); }, REDUCED ? 100 : 600);
  }

  /* Timer Crucible */
  function startTimer(ms, onEnd) { stopTimer(); var T = H.T; T.total = ms; T.end = performance.now() + ms; T.panic = false; T.onEnd = onEnd; T.raf = requestAnimationFrame(tick); }
  function tick() { var T = H.T, left = Math.max(0, T.end - performance.now()), bar = doc.getElementById('fzbBar'), txt = doc.getElementById('fzbTime'), wrap = doc.getElementById('fzbCru'), vg = doc.getElementById('fzbVig');
    if (bar) bar.style.transform = 'scaleX(' + (left / T.total) + ')'; if (txt) txt.textContent = (left / 1000).toFixed(1) + 's';
    if (left < 3000 && !T.panic) { T.panic = true; if (wrap) wrap.classList.add('panic'); if (vg) vg.classList.add('panic'); T.hb = setInterval(function () { safe(sfx.heart); vib(15); }, 600); }
    if (left <= 0) { var f = T.onEnd; stopTimer(); if (f) f(); return; } T.raf = requestAnimationFrame(tick); }
  function stopTimer() { var T = H.T; cancelAnimationFrame(T.raf); T.raf = 0; clearInterval(T.hb); T.hb = 0; var vg = doc.getElementById('fzbVig'); if (vg) vg.classList.remove('panic'); }

  function prog() { return '<div class="fzb-prog">' + H.qs.map(function (_, i) { var r = H.results[i]; return '<i class="' + (r === 'ok' ? 'ok' : r === 'ko' ? 'ko' : r === 'paw' ? 'paw' : i === H.idx ? 'now' : '') + '"></i>'; }).join('') + '</div>'; }
  function renderQ(i) {
    var r = H.qs[i], q = r.q, b = r.bug, app = doc.getElementById('app'); H.idx = i; H.dd = false; H.locked = false; H.start = Date.now();
    app.innerHTML = '<div class="fzb-hunt fzb-enter"><div class="fzb-vig" id="fzbVig"></div><div class="fzb-flash" id="fzbFlash"></div>' +
      '<div class="fzb-top"><div class="fzb-mini" id="fzbMini">' + bugSVG(b, 58) + '</div><div class="fzb-meta"><b>' + esc(b.name) + '</b><span>' + esc(b.tag) + ' · ' + esc(t('bug.hp', 'HP {hp}%', { hp: b.hp })) + '</span></div><div class="fzb-bet" id="fzbBet">' + r.bet + '% ' + esc(t('bug.kegigit', 'kegigit')) + '</div></div>' + prog() +
      '<div class="fzb-cru" id="fzbCru"><i id="fzbBar"></i></div><div class="fzb-cru-meta"><span>CRUCIBLE</span><b id="fzbTime">8.0s</b></div>' +
      '<div class="fzb-q"><div class="fzb-kicker">' + esc(t('bug.ronde', 'RONDE {n}', { n: i + 1 })) + ' · ' + esc(String(q.lessonSkill || q.skill || '').replace(/[-_]/g, ' ').toUpperCase()) + '</div><p class="fzb-stem">' + esc(q.question).replace(/_{2,}/, '<u>___</u>') + '</p></div>' +
      '<div class="fzb-opts" id="fzbOpts">' + q.options.map(function (o, k) { return '<button type="button" data-i="' + k + '" data-testid="bug-opt-' + k + '">' + esc(o) + '<i></i></button>'; }).join('') + '</div>' +
      '<div class="fzb-tools"><button type="button" class="fzb-dd" id="fzbDd" data-testid="bug-umpan">⚡ ' + esc(t('bug.umpan', 'UMPAN 2×')) + ' <small>· 5 ' + esc(t('bug.detik', 'detik')) + '</small></button><button type="button" class="fzb-help" id="fzbHelp" data-testid="bug-paw">' + esc(t('bug.paw-bantu', 'PAW, bantu!')) + '</button></div>' +
      '<div class="fzb-fb" id="fzbFb"></div><button type="button" class="fzb-next hidden" id="fzbNext" data-testid="bug-next"></button></div>';
    doc.getElementById('fzbOpts').addEventListener('click', function (e) { var btn = e.target.closest('button'); if (btn) answer(+btn.getAttribute('data-i'), 'pick'); });
    doc.getElementById('fzbDd').addEventListener('click', function () { if (H.dd || H.locked) return; H.dd = true; this.classList.add('armed'); this.textContent = t('bug.umpan-aktif', 'UMPAN AKTIF · DAMPAK 2×'); var bet = doc.getElementById('fzbBet'); bet.classList.add('dd'); bet.textContent = '2× · ' + r.bet + '%'; var left = Math.max(0, H.T.end - performance.now()); startTimer(Math.min(left, 5000), function () { answer(-1, 'timeout'); }); H.T.total = 5000; safe(sfx.arm); vib([20, 20, 20]); });
    doc.getElementById('fzbHelp').addEventListener('click', function () { answer(-1, 'paw'); });
    startTimer(8000, function () { answer(-1, 'timeout'); });
    root.scrollTo(0, 0);
  }
  function taunt(kind, b, opt) { var loc = (root.FiezelI18n && root.FiezelI18n.getLocale && root.FiezelI18n.getLocale()) || 'id', T = (SPECIES && SPECIES.taunts && (SPECIES.taunts[loc] || SPECIES.taunts.id)) || {}; var arr = kind === 'ko' ? ((T.family && T.family[b.family]) ? [T.family[b.family]] : (T.generic || [])) : (T[kind] || []); var s = arr[Math.floor(Math.random() * arr.length)] || ''; return s.replace(/\{opt\}/g, esc(opt || '')).replace(/\{bug\}/g, esc(b.name)); }
  function hpOf(id) { var b = bugs().filter(function (x) { return x.id === id; })[0]; return b ? b.hp : null; }
  function flash(gold) { var f = doc.getElementById('fzbFlash'); if (!f) return; f.className = 'fzb-flash' + (gold ? ' gold' : ''); void f.offsetWidth; f.classList.add('on'); }
  function shake(cls) { doc.body.classList.remove('fzb-shake', 'fzb-shake-hit'); void doc.body.offsetWidth; doc.body.classList.add(cls); }
  function answer(j, mode) {
    if (H.locked) return; H.locked = true; stopTimer();
    var r = H.qs[H.idx], q = r.q, b = r.bug, ok = mode === 'pick' && j === q.answerIndex, ms = Date.now() - H.start, before = hpOf(b.id), opts = doc.getElementById('fzbOpts').children, k;
    for (k = 0; k < opts.length; k++) { opts[k].disabled = true; if (k === q.answerIndex) { opts[k].classList.add('ok'); opts[k].lastChild.textContent = t('bug.benar', 'BENAR'); } else if (k === j) { opts[k].classList.add('ko'); opts[k].lastChild.textContent = t('bug.kamu', 'KAMU'); } else opts[k].classList.add('dim'); }
    doc.getElementById('fzbDd').disabled = true; doc.getElementById('fzbHelp').disabled = true;
    /* PIPELINE ASLI — jawaban PAW-bantu tidak dinilai (kejujuran kognitif bukan bukti salah). */
    if (mode !== 'paw') { try { call('record', q, ok, ms, j); var s = appState(), h = s && s.history && s.history[s.history.length - 1]; if (h) call('updateMastery', 'grammar', q.lessonSkill || q.skill, ok, h.ms, h.confidence, h.at); if (H.tutor) call('tutorObserve', H.tutor, q, j, ok, ms, { remaining: H.qs.length - H.idx - 1, scored: true }); call('settleReviewScheduleSilently'); call('save'); } catch (_) {} }
    var after = hpOf(b.id), fb = doc.getElementById('fzbFb'), mini = doc.getElementById('fzbMini'), why = (q.explain && (q.explain.why || q.explain.rule)) || '';
    var hpRow = function () { if (before == null && after == null) return ''; var a = before == null ? (b.hp || 50) : before, z = after == null ? a : after; return '<div class="fzb-hpline">' + esc(t('bug.hp-nama', 'HP {nama}', { nama: b.name })) + ' <span class="fzb-bar"><i style="width:' + a + '%" data-to="' + z + '"></i></span><span class="fzb-num">' + a + '% → <span class="fzb-drop">' + z + '%</span></span></div>'; };
    if (mode === 'paw') { H.results[H.idx] = 'paw'; safe(sfx.soft); call('pawReact', 'encouraging'); fb.className = 'fzb-fb help'; fb.innerHTML = '<div class="fzb-tag">' + esc(t('bug.paw-tag', 'PAW TURUN TANGAN · TANPA ROASTING')) + '</div><div class="fzb-say">' + taunt('paw', b) + '</div><div class="fzb-why">' + esc(t('bug.jawabannya', 'Jawabannya')) + ' <b>' + esc(q.options[q.answerIndex]) + '</b>. ' + esc(why) + '</div>'; }
    else if (ok) { H.results[H.idx] = 'ok'; var rc = mini.getBoundingClientRect(); safe(sfx.crack); vib(H.dd ? [30, 40, 90, 40, 60] : [25, 30, 70]); shatter(rc.left + rc.width / 2, rc.top + rc.height / 2, b.color, H.dd); mini.classList.add('pop'); flash(true); shake('fzb-shake-hit'); call('pawReact', 'correct');
      fb.className = 'fzb-fb win'; fb.innerHTML = '<div class="fzb-tag">' + esc(t('bug.pecah-tag', 'BUG PECAH · TEBAKAN {bet}% MELESET', { bet: r.bet })) + (H.dd ? ' · ' + esc(t('bug.umpan-berhasil', 'UMPAN 2× BERHASIL')) : '') + '</div><div class="fzb-say">' + taunt('win', b) + '</div>' + hpRow() + '<div class="fzb-why"><b>PAW:</b> ' + esc(why) + '</div>'; }
    else { H.results[H.idx] = 'ko'; safe(mode === 'timeout' ? sfx.buzz : sfx.bite); vib([90, 40, 140]); flash(false); shake('fzb-shake'); mini.classList.add('bite'); call('pawReact', 'wrong');
      fb.className = 'fzb-fb lose'; fb.innerHTML = '<div class="fzb-tag">' + esc(t('bug.digigit-tag', 'DIGIGIT · {nama} MENANG TARUHAN', { nama: b.name.toUpperCase() })) + '</div><div class="fzb-say">' + taunt(mode === 'timeout' ? 'timeout' : 'ko', b, j >= 0 ? q.options[j] : '') + '</div>' + hpRow() + '<div class="fzb-why"><b>PAW:</b> ' + esc(why) + '</div>'; }
    requestAnimationFrame(function () { fb.classList.add('on'); var bar = fb.querySelector('.fzb-bar i'); if (bar) setTimeout(function () { bar.style.width = bar.getAttribute('data-to') + '%'; }, 120); });
    var next = doc.getElementById('fzbNext'); next.textContent = H.idx < H.qs.length - 1 ? t('bug.berikutnya', 'BUG BERIKUTNYA →') : t('bug.lihat-laporan', 'LIHAT LAPORAN PERBURUAN →'); next.classList.remove('hidden');
    next.onclick = function () { H.idx + 1 < H.qs.length ? beat(H.qs[H.idx + 1], function () { renderQ(H.idx + 1); }) : report(); };
  }

  /* Laporan Perburuan + bagikan */
  function verdict(p) { return p >= H.qs.length ? [t('bug.v-sempurna', 'SEMPURNA'), 'gold'] : p >= 3 ? [t('bug.v-pemburu', 'PEMBURU'), 'mint'] : p >= 1 ? [t('bug.v-bertahan', 'BERTAHAN'), ''] : [t('bug.v-habis', 'DIGIGIT HABIS'), '']; }
  function report() {
    var app = doc.getElementById('app'), pecah = H.results.filter(function (x) { return x === 'ok'; }).length, gigit = H.results.filter(function (x) { return x === 'ko'; }).length, bantu = H.results.length - pecah - gigit;
    var acc = pecah + gigit ? Math.round(pecah / (pecah + gigit) * 100) : 0, v = verdict(pecah), date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), nama = call('learnerName') || '';
    app.innerHTML = '<div class="fzb-hunt"><div class="fzb-res"><div class="fzb-report" id="fzbReport"><div class="fzb-hd"><b>FIEZEL</b><span>' + esc(t('bug.laporan', 'LAPORAN PERBURUAN')) + ' · ' + esc(date.toUpperCase()) + '</span></div>' +
      '<h2>' + esc(t('bug.sarang-nama', 'Sarang {nama}', { nama: nama })) + '</h2><div class="fzb-rsub">' + esc(t('bug.rekap', '{p} bug pecah · {g} lolos', { p: pecah, g: gigit })) + (bantu ? ' · ' + esc(t('bug.rekap-bantu', '{n} dibantu PAW', { n: bantu })) : '') + '</div><div class="fzb-stamp ' + v[1] + '">' + esc(v[0]) + '</div>' +
      '<div class="fzb-stats"><div><b>' + acc + '%</b><small>' + esc(t('bug.akurasi', 'AKURASI')) + '</small></div><div><b>' + pecah + '/' + H.qs.length + '</b><small>' + esc(t('bug.pecah', 'PECAH')) + '</small></div><div><b>' + gigit + '</b><small>' + esc(t('bug.gigitan', 'GIGITAN')) + '</small></div></div>' +
      '<div class="fzb-list">' + H.qs.map(function (r, i) { var s = H.results[i]; return '<div class="' + (s === 'ok' ? 'pecah' : s === 'ko' ? 'gigit' : 'bantu') + '">' + bugSVG(r.bug, 30) + esc(r.bug.name) + ' <small>R' + (i + 1) + '</small><span>' + esc(s === 'ok' ? t('bug.pecah', 'PECAH') : s === 'ko' ? t('bug.menggigit', 'MENGGIGIT') : t('bug.dibantu', 'DIBANTU PAW')) + '</span></div>'; }).join('') + '</div>' +
      '<div class="fzb-ft"><span>fiezel.my.id · #BuruBug</span></div></div>' +
      '<div class="fzb-share"><button type="button" class="fzb-wa" id="fzbShare" data-testid="bug-share">' + esc(t('bug.bagikan', 'BAGIKAN KE WHATSAPP')) + '</button><button type="button" class="fzb-back" data-testid="bug-back" onclick="FiezelBug.exit()">' + esc(t('bug.sarang', 'SARANG')) + '</button></div></div></div>';
    setTimeout(function () { safe(sfx.stamp); vib(30); }, 350); call('pawReact', pecah >= 3 ? 'lesson-complete' : 'encouraging');
    doc.getElementById('fzbShare').onclick = function () { shareCard(pecah, gigit, bantu, acc, v, date, nama); };
  }
  function svgImage(svg) { return new Promise(function (res) { var img = new Image(); img.onload = function () { res(img); }; img.onerror = function () { res(null); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); }); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function shareCard(pecah, gigit, bantu, acc, v, date, nama) {
    var W = 1080, Hh = 1350, c = doc.createElement('canvas'); c.width = W; c.height = Hh; var x = c.getContext('2d'), F = function (n) { return '900 ' + n + 'px system-ui,sans-serif'; };
    Promise.all(H.qs.map(function (r) { return svgImage(bugSVG(r.bug, 120)); })).then(function (imgs) {
      x.fillStyle = '#2E2724'; x.fillRect(0, 0, W, Hh); var rg = x.createRadialGradient(540, 300, 50, 540, 300, 700); rg.addColorStop(0, 'rgba(155,58,74,.45)'); rg.addColorStop(1, 'rgba(155,58,74,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, Hh);
      x.fillStyle = '#FBF7F3'; rr(x, 70, 120, 940, 1110, 44); x.fill(); x.fillStyle = '#9B3A4A'; x.font = F(30); x.fillText('F I E Z E L', 120, 190); x.fillStyle = '#8A7F79'; x.font = F(22); x.textAlign = 'right'; x.fillText(t('bug.laporan', 'LAPORAN PERBURUAN') + ' · ' + date.toUpperCase(), 960, 190); x.textAlign = 'left';
      x.fillStyle = '#2E2724'; x.font = F(72); x.fillText(t('bug.sarang-nama', 'Sarang {nama}', { nama: nama }), 120, 300); x.fillStyle = '#8A7F79'; x.font = '800 30px system-ui,sans-serif'; x.fillText(t('bug.rekap', '{p} bug pecah · {g} lolos', { p: pecah, g: gigit }), 120, 350);
      x.save(); x.translate(800, 300); x.rotate(-.21); var col = v[1] === 'gold' ? '#B8860B' : v[1] === 'mint' ? '#3E8E75' : '#9B3A4A'; x.strokeStyle = col; x.lineWidth = 9; x.font = F(44); var tw = x.measureText(v[0]).width; rr(x, -tw / 2 - 28, -46, tw + 56, 84, 16); x.stroke(); x.fillStyle = col; x.textAlign = 'center'; x.fillText(v[0], 0, 16); x.restore(); x.textAlign = 'left';
      [[acc + '%', t('bug.akurasi', 'AKURASI')], [pecah + '/' + H.qs.length, t('bug.pecah', 'PECAH')], [String(gigit), t('bug.gigitan', 'GIGITAN')]].forEach(function (s, i) { var px = 120 + i * 300; x.fillStyle = '#F3ECE4'; rr(x, px, 400, 270, 150, 28); x.fill(); x.fillStyle = '#2E2724'; x.font = F(64); x.textAlign = 'center'; x.fillText(s[0], px + 135, 470); x.fillStyle = '#8A7F79'; x.font = F(22); x.fillText(s[1], px + 135, 520); x.textAlign = 'left'; });
      H.qs.forEach(function (r, i) { var y = 590 + i * 108, s = H.results[i]; x.fillStyle = 'rgba(46,39,36,.05)'; rr(x, 120, y, 840, 92, 22); x.fill(); if (imgs[i]) { x.save(); if (s === 'ok') x.globalAlpha = .45; x.drawImage(imgs[i], 140, y + 6, 80, 80); x.restore(); } x.fillStyle = '#2E2724'; x.font = F(34); x.fillText(r.bug.name, 240, y + 58); x.fillStyle = '#8A7F79'; x.font = '800 24px system-ui,sans-serif'; x.fillText(r.bug.tag, 240 + x.measureText(r.bug.name).width * 1.5 + 40, y + 58); var st = s === 'ok' ? [t('bug.pecah', 'PECAH'), '#3E8E75'] : s === 'ko' ? [t('bug.menggigit', 'MENGGIGIT'), '#9B3A4A'] : [t('bug.dibantu', 'DIBANTU PAW'), '#6E8FB0']; x.fillStyle = st[1]; x.font = F(24); x.textAlign = 'right'; x.fillText(st[0], 930, y + 58); x.textAlign = 'left'; });
      x.fillStyle = '#8A7F79'; x.font = F(24); x.fillText('fiezel.my.id  ·  #BuruBug', 120, 1185);
      c.toBlob(function (blob) { var file = new File([blob], 'fiezel-laporan-perburuan.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: t('bug.laporan', 'LAPORAN PERBURUAN'), text: t('bug.share-teks', 'Sarang gue hari ini: {p} bug pecah, {g} lolos. Berani buru bug lo sendiri? fiezel.my.id #BuruBug', { p: pecah, g: gigit }) }).catch(function () {});
        else { var a = doc.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fiezel-laporan-perburuan.png'; doc.body.appendChild(a); a.click(); a.remove(); call('showToast', t('bug.tersimpan', 'Gambar laporan tersimpan — kirim ke grup kelas!')); } }, 'image/png');
    });
  }

  /* Pecahan kristal (Canvas) */
  var cv, cx, parts = [], rings = [], raf = 0;
  function ensureFx() { if (cv) return; cv = doc.createElement('canvas'); cv.id = 'fzbFx'; doc.body.appendChild(cv); cx = cv.getContext('2d'); fit(); root.addEventListener('resize', fit); }
  function fit() { var d = root.devicePixelRatio || 1; cv.width = root.innerWidth * d; cv.height = root.innerHeight * d; cv.style.width = root.innerWidth + 'px'; cv.style.height = root.innerHeight + 'px'; cx.setTransform(d, 0, 0, d, 0, 0); }
  function shatter(px, py, color, big) { if (REDUCED) return; var n = big ? 70 : 52; for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, v = (big ? 7 : 5) + Math.random() * (big ? 12 : 9); parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, len: 8 + Math.random() * (big ? 26 : 18), w: 1.5 + Math.random() * 3, l: 1, rot: a, vr: (Math.random() - .5) * .5, c: Math.random() < .55 ? color : (Math.random() < .6 ? '#F7EACB' : '#FFFFFF'), d: .012 + Math.random() * .02 }); } rings.push({ x: px, y: py, r: 6, l: 1, c: color }); rings.push({ x: px, y: py, r: 2, l: 1, c: '#FBF7F3', s: 1.6 }); if (!raf) raf = requestAnimationFrame(step); }
  function step() { cx.clearRect(0, 0, root.innerWidth, root.innerHeight); parts = parts.filter(function (p) { return p.l > 0; }); rings = rings.filter(function (r) { return r.l > 0; });
    rings.forEach(function (r) { r.r += (r.s || 1) * 14; r.l -= .06; cx.save(); cx.globalAlpha = Math.max(r.l, 0) * .9; cx.strokeStyle = r.c; cx.lineWidth = 3 * r.l + 1; cx.beginPath(); cx.arc(r.x, r.y, r.r, 0, Math.PI * 2); cx.stroke(); cx.restore(); });
    parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += .28; p.vx *= .965; p.vy *= .985; p.l -= p.d; p.rot += p.vr; cx.save(); cx.globalAlpha = Math.max(p.l, 0); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c; cx.beginPath(); cx.moveTo(-p.len / 2, 0); cx.lineTo(0, -p.w); cx.lineTo(p.len / 2, 0); cx.lineTo(0, p.w); cx.closePath(); cx.fill(); cx.restore(); });
    raf = (parts.length || rings.length) ? requestAnimationFrame(step) : (cx.clearRect(0, 0, root.innerWidth, root.innerHeight), 0); }

  root.FiezelBug = { homeMarkup: homeMarkup, view: view, exit: exit, poke: poke, bugs: bugs, signal: signal, ready: function () { return !!SPECIES; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
