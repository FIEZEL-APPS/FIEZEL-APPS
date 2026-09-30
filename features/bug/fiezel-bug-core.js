/**
 * FIEZEL BUG — inti murni (tanpa DOM, tanpa storage, tanpa Date.now()).
 *
 * Bug = satu kode kanonik taksonomi miskonsepsi (misconception-taxonomy-v1.json) yang
 * punya bukti di Misconception Ledger murid. HP bug = 100 − penguasaan BKT lesson-lesson
 * tempat bug itu menggigit, dan penguasaan itu MELURUH mengikuti stabilitas ingatan
 * (paruh-waktu per lesson) — jadi bug "pulih" persis secepat murid lupa.
 *
 *   deriveBugs({entries, species, taxonomyMap, masteryOf, nowMs})
 *     entries     : ledger.entries (bentuk FiezelMisconceptionLedger, boleh mentah)
 *     species     : bug-species.json
 *     taxonomyMap : {label miskonsepsi -> kode kanonik}
 *     masteryOf   : (lesson, nowMs) -> {L, n, lastAt, L0}  (BKT terdecay, disuntik app.js)
 *   -> [{id, name, tag, color, shape, family, hp, hpRested, belief, hits, lessons, active, fosil, lastMs}]
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelBugCore = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAY = 86400000, PRIOR = 0.1, LEDGER_HALF_LIFE = 14, ACTIVE = 0.7, MIN_HITS = 3, MIN_SESS = 2;
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sigmoid(l) { return 1 / (1 + Math.exp(-l)); }
  var PRIOR_LOGIT = Math.log(PRIOR / (1 - PRIOR));

  function beliefAt(e, nowMs) {
    var lo = num(e.logOdds, PRIOR_LOGIT), dt = Math.max(0, num(nowMs, 0) - num(e.lastMs, 0)) / DAY;
    if (!(dt > 0)) return sigmoid(lo);
    return sigmoid(PRIOR_LOGIT + (lo - PRIOR_LOGIT) * Math.pow(2, -dt / LEDGER_HALF_LIFE));
  }
  function canonicalOf(e, taxonomyMap) {
    if (e.canonical) return String(e.canonical);
    var m = taxonomyMap && taxonomyMap[String(e.misconception || '')];
    if (m) return String(m);
    return e.family ? String(e.family) + '.other' : '';
  }
  function speciesOf(code, species) {
    var s = species && species.species && species.species[code];
    if (s) return s;
    var g = (species && species.generic) || { name: 'Bug', tag: '', color: '#8A7F79', shape: 'spike' };
    return { name: g.name, tag: g.tag, color: g.color, shape: g.shape, family: String(code).split('.')[0] };
  }

  function deriveBugs(opts) {
    var entries = (opts.entries && typeof opts.entries === 'object') ? opts.entries : {};
    var now = num(opts.nowMs, 0), groups = {}, key;
    for (key in entries) {
      if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
      var e = entries[key]; if (!e || typeof e !== 'object' || !e.concept) continue;
      var code = canonicalOf(e, opts.taxonomyMap); if (!code) continue;
      var g = groups[code] || (groups[code] = { id: code, lessons: [], hits: 0, belief: 0, sessions: [], lastMs: 0, active: false });
      if (g.lessons.indexOf(String(e.concept)) === -1) g.lessons.push(String(e.concept));
      g.hits += Math.max(0, num(e.hits, 0));
      var b = beliefAt(e, now); if (b > g.belief) g.belief = b;
      g.lastMs = Math.max(g.lastMs, num(e.lastMs, 0));
      (Array.isArray(e.sessions) ? e.sessions : []).forEach(function (s) { if (g.sessions.indexOf(s) === -1) g.sessions.push(s); });
      if (b >= ACTIVE && num(e.hits, 0) >= MIN_HITS && (e.sessions || []).length >= MIN_SESS) g.active = true;
    }
    var out = [];
    for (key in groups) {
      var gr = groups[key], sp = speciesOf(key, opts.species), sumL = 0, sumRest = 0, n = 0;
      gr.lessons.forEach(function (lesson) {
        var m = typeof opts.masteryOf === 'function' ? opts.masteryOf(lesson, now) : null;
        if (!m) return;
        sumL += clamp(num(m.L, 0.2), 0, 1); sumRest += clamp(num(m.Lrested, m.L), 0, 1); n++;
      });
      var L = n ? sumL / n : 0.2, Lr = n ? sumRest / n : L;
      var hp = Math.round(100 * (1 - L)), hpRested = Math.round(100 * (1 - Lr));
      out.push({ id: key, name: sp.name, tag: sp.tag, color: sp.color, shape: sp.shape, family: sp.family,
        hp: hp, hpRested: hpRested, recovered: Math.max(0, hp - hpRested), belief: Math.round(gr.belief * 100) / 100,
        hits: gr.hits, lessons: gr.lessons, active: gr.active, fosil: hp <= 10 && gr.belief < 0.3, lastMs: gr.lastMs });
    }
    out.sort(function (a, b) { return (b.hp - a.hp) || (b.belief - a.belief); });
    return out;
  }

  /** Bug yang mengincar sebuah soal: dari distraktor-distraktornya, pilih yang HP-nya tertinggi. */
  function bugForQuestion(q, bugs, taxonomyMap, species) {
    var om = q && q.optionMisconceptions, best = null, firstCode = '';
    if (!om) return null;
    var byId = {}; (bugs || []).forEach(function (b) { byId[b.id] = b; });
    (q.options || []).forEach(function (opt, i) {
      if (i === q.answerIndex) return;
      var label = om[String(opt)]; if (!label) return;
      var code = (taxonomyMap && taxonomyMap[String(label)]) || '';
      if (!code) return;
      if (!firstCode) firstCode = code;
      var b = byId[code]; if (b && (!best || b.hp > best.hp)) best = b;
    });
    if (best) return best;
    if (!firstCode) return null;
    var sp = speciesOf(firstCode, species);
    return { id: firstCode, name: sp.name, tag: sp.tag, color: sp.color, shape: sp.shape, family: sp.family, hp: 50, belief: PRIOR, hits: 0, lessons: [], active: false, fosil: false, fresh: true };
  }

  /** Persen "kegigit": peluang salah model kemampuan, dipertajam oleh keyakinan ledger pada bug itu. */
  function betPercent(pCorrect, bug) {
    var pWrong = 1 - clamp(num(pCorrect, 0.5), 0, 1);
    var belief = bug ? clamp(num(bug.belief, PRIOR), 0, 1) : PRIOR;
    return Math.round(clamp(100 * pWrong * (0.55 + 0.6 * belief) + 12, 8, 94));
  }

  function canonicalFor(label, taxonomyMap) { return (taxonomyMap && taxonomyMap[String(label || '')]) || ''; }

  return { deriveBugs: deriveBugs, bugForQuestion: bugForQuestion, betPercent: betPercent, beliefAt: beliefAt, canonicalFor: canonicalFor, speciesOf: speciesOf, PRIOR: PRIOR };
}));
