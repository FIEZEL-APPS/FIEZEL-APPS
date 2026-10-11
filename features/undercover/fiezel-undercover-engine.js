/**
 * FIEZEL · features/undercover/fiezel-undercover-engine.js — MESIN ATURAN UNDERCOVER (m025-561)
 *
 * Murni: tanpa DOM, tanpa waktu dinding, tanpa Math.random. Semua keacakan lewat RNG ber-seed
 * (mulberry32) sehingga satu seed = satu pertandingan yang bisa diputar ulang persis — itu
 * yang membuat probe Playwright dan gerbang tests/undercover-game-test.js bisa menguji
 * alurnya tanpa bergantung pada nasib.
 *
 * KONTRAK BUKTI BELAJAR (dibaca app.js lewat antrean localStorage, lihat
 * undercoverEvidenceDrain() di app.js). Mesin ini hanya MENULIS baris bukti untuk pemain
 * manusia, dan hanya untuk dua keputusan yang benar-benar menguji makna kata:
 *   kind 'clue'  — dua chip yang dipilih murid sama-sama menggambarkan kata rahasianya
 *                  (ok) atau salah satunya tidak (gagal). Giliran yang habis waktu BUKAN
 *                  bukti: tidak ada keputusan yang bisa dinilai. kappa 0,5 karena 3 dari 5
 *                  chip per dimensi memang cocok, jadi tebakan buta masih lolos 36%.
 *   kind 'guess' — tebakan sudden death atas kata warga dari empat pilihan. kappa 0,6.
 * Voting TIDAK dicatat ke Braincore: menebak siapa penyusup adalah deduksi sosial, bukan
 * bukti penguasaan kata. Ia tetap ditampilkan di debrief sebagai statistik permainan.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelUndercoverEngine = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LAYOUT = {
    agent: { 4: { civ: 3, spy: 1, white: 0 }, 6: { civ: 4, spy: 2, white: 0 } },
    white: { 4: { civ: 3, spy: 0, white: 1 }, 6: { civ: 4, spy: 1, white: 1 } }
  };

  var KAPPA = { clue: 0.5, guess: 0.6 };

  /* Bobot selera risiko petunjuk warga, per kepribadian bot. */
  var RISK_TASTE = {
    high: { low: 0.3, mid: 0.45, high: 0.25 },
    mid: { low: 0.45, mid: 0.45, high: 0.1 },
    low: { low: 0.65, mid: 0.3, high: 0.05 }
  };

  function createRng(seed) {
    var a = (Number(seed) >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  function pickWeighted(weights, rng) {
    var keys = Object.keys(weights);
    var total = 0;
    keys.forEach(function (k) { total += Math.max(0, weights[k]); });
    if (total <= 0) return keys[0];
    var r = rng() * total;
    for (var i = 0; i < keys.length; i++) {
      r -= Math.max(0, weights[keys[i]]);
      if (r <= 0) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function player(game, seat) {
    for (var i = 0; i < game.players.length; i++) if (game.players[i].seat === seat) return game.players[i];
    return null;
  }
  function alive(game) { return game.players.filter(function (p) { return p.alive; }); }
  function me(game) { return game.players[0]; }
  function botOf(game, p) {
    if (!p || !p.botId) return null;
    for (var i = 0; i < game.data.BOTS.length; i++) if (game.data.BOTS[i].id === p.botId) return game.data.BOTS[i];
    return null;
  }
  function isInfiltrator(p) { return p && (p.role === 'spy' || p.role === 'white'); }

  function chipIndex(game) {
    if (!game._chips) {
      game._chips = {};
      game.data.chipsOf(game.pair).forEach(function (c) { game._chips[c.id] = c; });
    }
    return game._chips;
  }
  function chip(game, id) { return chipIndex(game)[id] || null; }

  /** Pertandingan baru. opts: { mode:'agent'|'white', size:4|6, seed, bots:[id], pairId? } */
  function newGame(opts, data) {
    var mode = opts && opts.mode === 'white' ? 'white' : 'agent';
    var size = opts && Number(opts.size) === 6 ? 6 : 4;
    var seed = (Number(opts && opts.seed) >>> 0) || 1;
    var rng = createRng(seed);
    var pair = (opts && opts.pairId && data.pairById(opts.pairId)) || data.PAIRS[Math.floor(rng() * data.PAIRS.length)];
    var layout = LAYOUT[mode][size];
    var roles = [];
    var k;
    for (k = 0; k < layout.civ; k++) roles.push('civ');
    for (k = 0; k < layout.spy; k++) roles.push('spy');
    for (k = 0; k < layout.white; k++) roles.push('white');
    roles = shuffle(roles, rng);
    var botIds = (opts && Array.isArray(opts.bots) ? opts.bots : []).slice(0, size - 1);
    var players = [];
    for (var s = 1; s <= size; s++) {
      var role = roles[s - 1];
      players.push({
        seat: s,
        isMe: s === 1,
        botId: s === 1 ? null : (botIds[s - 2] || data.BOTS[(s - 2) % data.BOTS.length].id),
        role: role,
        word: role === 'civ' ? pair.civ.en : (role === 'spy' ? pair.spy.en : null),
        alive: true,
        clues: [],
        belief: {},
        social: 0,
        intel: 0,
        out: 0
      });
    }
    players.forEach(function (p) {
      if (p.isMe) return;
      players.forEach(function (q) { if (q.seat !== p.seat) p.belief[q.seat] = 28 + Math.round(rng() * 8); });
    });
    return {
      v: 1, seed: seed, mode: mode, size: size, pair: pair, data: data, rng: rng,
      players: players, round: 0, order: [], heard: [], ballots: [],
      evidence: [], clueStats: [], guess: null, winner: null, reason: null, eliminated: [], _n: 0
    };
  }

  /** Urutan bicara ronde berikutnya. Si Polos tidak pernah membuka ronde (aturan klasik). */
  function startRound(game) {
    game.round += 1;
    game.players.forEach(function (p) { p.social = Math.round(p.social * 0.7); });
    var seats = alive(game).map(function (p) { return p.seat; });
    if (!game._start) game._start = 1 + Math.floor(game.rng() * game.size);
    var startSeat = ((game._start - 1 + game.round - 1) % game.size) + 1;
    var idx = 0;
    for (var i = 0; i < seats.length; i++) if (seats[i] >= startSeat) { idx = i; break; }
    var order = seats.slice(idx).concat(seats.slice(0, idx));
    var guard = 0;
    while (player(game, order[0]).role === 'white' && guard++ < order.length) order.push(order.shift());
    game.order = order;
    return order.slice();
  }

  function ownList(game, role) {
    return role === 'spy' ? 'spy' : 'civ';
  }

  /** Chip yang ditawarkan ke satu pemain: 3 yang cocok dengan katanya + 2 yang tidak cocok
   *  dengan kata mana pun, per dimensi. Si Polos tidak punya kata, jadi ia mendapat chip
   *  bersama + satu condong-warga + satu condong-penyusup + 2 chip keliru: ia harus memilih
   *  berdasarkan apa yang ia DENGAR, bukan apa yang ia tahu. */
  function chipsFor(game, seat) {
    var p = player(game, seat);
    var out = {};
    ['a', 'b'].forEach(function (dim) {
      var d = game.pair[dim];
      var list = [chip(game, d.shared[0])];
      if (p.role === 'white') {
        list.push(chip(game, d.civ[0][0]));
        list.push(chip(game, d.spy[0][0]));
      } else {
        d[ownList(game, p.role)].forEach(function (c) { list.push(chip(game, c[0])); });
      }
      d.none.forEach(function (c) { list.push(chip(game, c[0])); });
      out[dim] = shuffle(list, game.rng);
    });
    return out;
  }

  function fits(c, role) {
    if (!c) return false;
    return c.owner === 'both' || (role !== 'white' && c.owner === role);
  }

  function evaluateChip(listener, c) {
    if (!c) return 18;
    if (listener.role === 'white') {
      if (c.owner === 'none') return 14;
      if (c.owner === 'both') return 2;
      return -2;
    }
    var own = listener.role === 'spy' ? 'spy' : 'civ';
    if (c.owner === 'both') return 5;
    if (c.owner === 'none') return 22;
    if (c.owner === own) return c.risk === 'high' ? -16 : -9;
    return c.risk === 'high' ? 30 : 20;
  }

  function nextId(game, kind) {
    game._n += 1;
    return 'uc-' + game.seed + '-' + game.round + '-' + kind + '-' + game._n;
  }

  /** Terapkan satu petunjuk. pick = {a, b} id chip, atau null bila waktunya habis.
   *  meta = { ms, at } dari UI (waktu dinding tidak pernah dibaca mesin sendiri). */
  function applyClue(game, seat, pick, meta) {
    var p = player(game, seat);
    var timedOut = !pick || !pick.a || !pick.b;
    var ca = timedOut ? null : chip(game, pick.a);
    var cb = timedOut ? null : chip(game, pick.b);
    p.clues.push({ round: game.round, a: ca && ca.id, b: cb && cb.id, timedOut: timedOut });
    game.heard.push({ seat: seat, round: game.round, a: ca, b: cb, timedOut: timedOut });

    game.players.forEach(function (L) {
      if (L.isMe || !L.alive || L.seat === seat) return;
      var bot = botOf(game, L);
      var delta = timedOut ? 18 : evaluateChip(L, ca) + evaluateChip(L, cb);
      delta += (game.rng() * 2 - 1) * (bot ? bot.noise : 0.15) * 12;
      L.belief[seat] = clamp(Math.round((L.belief[seat] || 30) + delta), 0, 100);
      if (!timedOut && (L.role === 'spy' || L.role === 'white')) {
        [ca, cb].forEach(function (c) {
          if (c.owner === 'civ') L.intel += c.risk === 'high' ? 1.5 : 0.5;
          else if (c.owner === 'both' && L.role === 'white') L.intel += 0.25;
        });
      }
    });

    var result = { seat: seat, timedOut: timedOut, a: ca, b: cb, fitOk: null, badChip: null, evidence: null };
    if (p.isMe && p.role !== 'white') {
      if (timedOut) {
        game.clueStats.push({ round: game.round, ok: null, timedOut: true });
      } else {
        var ok = fits(ca, p.role) && fits(cb, p.role);
        result.fitOk = ok;
        result.badChip = !fits(ca, p.role) ? ca : (!fits(cb, p.role) ? cb : null);
        game.clueStats.push({ round: game.round, ok: ok, timedOut: false });
        var word = p.role === 'spy' ? game.pair.spy : game.pair.civ;
        if (word.vocabId) {
          result.evidence = {
            id: nextId(game, 'clue'), at: Number(meta && meta.at) || 0, kind: 'clue', pair: game.pair.id,
            word: word.bank, vocabId: word.vocabId, ok: ok,
            ms: Math.max(300, Math.round(Number(meta && meta.ms) || 6000)), kappa: KAPPA.clue
          };
          game.evidence.push(result.evidence);
        }
      }
    }
    return result;
  }

  /** Petunjuk bot, ditentukan perannya dan kepribadiannya. */
  function botPickClue(game, seat) {
    var p = player(game, seat);
    var bot = botOf(game, p) || { risk: 'mid', bluff: 0.5 };
    var pick = {};
    ['a', 'b'].forEach(function (dim) {
      var d = game.pair[dim];
      var heard = [];
      game.heard.forEach(function (h) {
        if (h.timedOut || h.seat === seat) return;
        var c = h[dim];
        if (c && c.owner !== 'none') heard.push(c);
      });
      if (p.role === 'civ') {
        var r = pickWeighted(RISK_TASTE[bot.risk] || RISK_TASTE.mid, game.rng);
        if (r === 'low') pick[dim] = d.shared[0];
        else pick[dim] = (r === 'mid' ? d.civ[0] : d.civ[1])[0];
      } else if (p.role === 'spy') {
        var civHeard = heard.filter(function (c) { return c.owner === 'civ'; });
        var w = { shared: 0.55, mid: 0.2, high: 0.05, copy: civHeard.length ? bot.bluff * 0.6 : 0 };
        var choice = pickWeighted(w, game.rng);
        if (choice === 'copy') pick[dim] = civHeard[Math.floor(game.rng() * civHeard.length)].id;
        else if (choice === 'mid') pick[dim] = d.spy[0][0];
        else if (choice === 'high') pick[dim] = d.spy[1][0];
        else pick[dim] = d.shared[0];
      } else {
        if (heard.length && game.rng() < 0.75) pick[dim] = heard[Math.floor(game.rng() * heard.length)].id;
        else {
          var opts = chipsFor(game, seat)[dim];
          pick[dim] = opts[Math.floor(game.rng() * opts.length)].id;
        }
      }
    });
    return pick;
  }

  /** Meter kecurigaan publik 0..100: rata-rata keyakinan bot lain + tekanan sosial meja. */
  function publicSus(game, seat) {
    var p = player(game, seat);
    var vals = [];
    game.players.forEach(function (L) {
      if (L.isMe || !L.alive || L.seat === seat) return;
      if (typeof L.belief[seat] === 'number') vals.push(L.belief[seat]);
    });
    var avg = vals.length ? vals.reduce(function (s, v) { return s + v; }, 0) / vals.length : 30;
    return clamp(Math.round(avg + (p ? p.social : 0)), 0, 100);
  }

  function mood(game, seat) {
    var p = player(game, seat);
    if (!p.alive) return isInfiltrator(p) ? 'busted' : 'calm';
    var s = publicSus(game, seat);
    if (s >= 75) return 'busted';
    if (s >= 50) return 'nervous';
    return 'calm';
  }

  var SHOUTS = { vague: 9, sweat: 7, alibi: 6 };

  /** Seruan cepat. kind 'legit' membela diri sendiri dan tidak punya sasaran. */
  function shout(game, fromSeat, kind, targetSeat) {
    if (kind === 'legit') {
      var self = player(game, fromSeat);
      self.social -= 5;
      return { from: fromSeat, kind: kind, target: fromSeat, delta: -5 };
    }
    var t = player(game, targetSeat);
    if (!t || !t.alive || targetSeat === fromSeat) return null;
    var d = SHOUTS[kind] || 6;
    t.social += d;
    return { from: fromSeat, kind: kind, target: targetSeat, delta: d };
  }

  function itemById(game, id) {
    for (var i = 0; i < game.data.ITEMS.length; i++) if (game.data.ITEMS[i].id === id) return game.data.ITEMS[i];
    return null;
  }

  function throwItem(game, fromSeat, targetSeat, itemId) {
    var t = player(game, targetSeat);
    var it = itemById(game, itemId);
    if (!t || !t.alive || !it || targetSeat === fromSeat) return null;
    t.social += it.social;
    var res = { from: fromSeat, target: targetSeat, item: it.id, delta: it.social };
    if (it.id === 'radar') {
      res.clues = t.clues.map(function (c) { return { round: c.round, a: c.a && chip(game, c.a), b: c.b && chip(game, c.b), timedOut: c.timedOut }; });
    }
    return res;
  }

  function topSuspect(game, L, exclude) {
    var best = null; var bestScore = -1;
    alive(game).forEach(function (q) {
      if (q.seat === L.seat || (exclude && exclude.indexOf(q.seat) >= 0)) return;
      var score = L.role === 'civ' ? (L.belief[q.seat] || 30) + q.social * 0.5 : publicSus(game, q.seat);
      if (score > bestScore) { bestScore = score; best = q; }
    });
    return best;
  }

  /** Satu aksi bot di meja debat: menuduh, melempar barang, atau membela diri. */
  function botDebateAction(game) {
    var bots = alive(game).filter(function (p) { return !p.isMe; });
    if (!bots.length) return null;
    var weights = {};
    bots.forEach(function (b) { weights[b.seat] = (botOf(game, b) || { accuse: 0.5 }).accuse + 0.2; });
    var L = player(game, Number(pickWeighted(weights, game.rng)));
    var bot = botOf(game, L) || { accuse: 0.5, throws: ['tomato'] };
    if (publicSus(game, L.seat) >= 55 && game.rng() < 0.6) {
      L.social -= 4;
      return { from: L.seat, kind: 'defend', line: game.rng() < 0.5 ? 'swear' : 'defend', target: null };
    }
    var suspect = topSuspect(game, L);
    if (!suspect) return null;
    if (game.rng() < bot.accuse * 0.55) {
      var itemId = bot.throws[Math.floor(game.rng() * bot.throws.length)];
      var item = itemById(game, itemId);
      var target = suspect;
      if (item && item.social < 0) {
        var low = null; var lowScore = 101;
        alive(game).forEach(function (q) {
          if (q.seat === L.seat) return;
          var sc = L.role === 'civ' ? (L.belief[q.seat] || 30) : publicSus(game, q.seat);
          if (sc < lowScore) { lowScore = sc; low = q; }
        });
        target = low || suspect;
      }
      var res = throwItem(game, L.seat, target.seat, itemId);
      return res ? { from: L.seat, kind: 'throw', item: itemId, target: target.seat, delta: res.delta } : null;
    }
    var kinds = ['vague', 'sweat', 'alibi'];
    var kind = kinds[Math.floor(game.rng() * kinds.length)];
    var sh = shout(game, L.seat, kind, suspect.seat);
    return sh ? { from: L.seat, kind: 'shout', shout: kind, target: suspect.seat, line: 'accuse', delta: sh.delta } : null;
  }

  /** Bot menanggapi seruan/lemparan manusia: sasaran membela diri, bot lain setuju/ragu. */
  function botReaction(game, targetSeat) {
    var t = player(game, targetSeat);
    var out = [];
    if (t && !t.isMe && t.alive) out.push({ from: t.seat, line: 'defend', target: null });
    var others = alive(game).filter(function (q) { return !q.isMe && q.seat !== targetSeat; });
    if (others.length) {
      var o = others[Math.floor(game.rng() * others.length)];
      var b = o.role === 'civ' ? (o.belief[targetSeat] || 30) : publicSus(game, targetSeat);
      out.push({ from: o.seat, line: b >= 45 ? 'agree' : 'doubt', target: targetSeat });
    }
    return out;
  }

  function botVote(game, seat) {
    var L = player(game, seat);
    var bot = botOf(game, L) || { noise: 0.15 };
    var best = null; var bestScore = -Infinity;
    alive(game).forEach(function (q) {
      if (q.seat === seat) return;
      var base = L.role === 'civ' ? (L.belief[q.seat] || 30) + q.social * 0.5 : publicSus(game, q.seat);
      var score = base + (game.rng() * 2 - 1) * bot.noise * 20;
      if (score > bestScore) { bestScore = score; best = q.seat; }
    });
    return best;
  }

  /** Hitung suara. ballots = { pemilih: sasaran }. Seri dipecah oleh meter kecurigaan publik. */
  function tally(game, ballots) {
    var counts = {};
    Object.keys(ballots || {}).forEach(function (voter) {
      var target = Number(ballots[voter]);
      var v = player(game, Number(voter));
      var t = player(game, target);
      if (!v || !v.alive || !t || !t.alive || target === Number(voter)) return;
      counts[target] = (counts[target] || 0) + 1;
    });
    var max = 0;
    Object.keys(counts).forEach(function (k) { if (counts[k] > max) max = counts[k]; });
    var top = Object.keys(counts).filter(function (k) { return counts[k] === max && max > 0; }).map(Number);
    if (!top.length) top = alive(game).filter(function (p) { return true; }).map(function (p) { return p.seat; });
    var tie = top.length > 1;
    var chosen = top[0];
    if (tie) {
      var bestSus = -1; var tied = [];
      top.forEach(function (s) {
        var sus = publicSus(game, s);
        if (sus > bestSus) { bestSus = sus; tied = [s]; } else if (sus === bestSus) tied.push(s);
      });
      chosen = tied[Math.floor(game.rng() * tied.length)];
    }
    var meP = me(game);
    var myVote = meP.alive && ballots ? Number(ballots[meP.seat]) || null : null;
    game.ballots.push({ round: game.round, ballots: Object.assign({}, ballots), counts: counts, eliminated: chosen, tie: tie, myVote: myVote });
    return { counts: counts, eliminated: chosen, tie: tie };
  }

  function eliminate(game, seat) {
    var p = player(game, seat);
    p.alive = false;
    p.out = game.round;
    game.eliminated.push(seat);
    return { seat: seat, role: p.role, infiltrator: isInfiltrator(p) };
  }

  /** Empat pilihan kisi intel untuk tebakan sudden death. */
  function guessOptions(game, seat) {
    var p = player(game, seat);
    var d = game.pair.decoys;
    var list = p.role === 'white'
      ? [game.pair.civ.en, game.pair.spy.en, d[0], d[1]]
      : [game.pair.civ.en, d[0], d[1], d[2]];
    return shuffle(list, game.rng);
  }

  function botGuess(game, seat) {
    var p = player(game, seat);
    /* Intel jenuh di 4: sesudah beberapa petunjuk gamblang, petunjuk berikutnya tidak lagi
       menambah banyak. Tanpa batas ini meja 6 kursi (lebih banyak petunjuk warga per ronde)
       membuat tebakan penyusup nyaris pasti benar dan warga hampir tidak pernah menang. */
    var intel = Math.min(4, p.intel);
    var chance = p.role === 'white' ? clamp(0.06 + 0.065 * intel, 0.06, 0.32) : clamp(0.1 + 0.075 * intel, 0.1, 0.4);
    var options = guessOptions(game, seat);
    if (game.rng() < chance) return game.pair.civ.en;
    var wrong = options.filter(function (w) { return w !== game.pair.civ.en; });
    return wrong[Math.floor(game.rng() * wrong.length)];
  }

  /** word null = waktu habis. Tebakan benar = penyusup menang mutlak. */
  function resolveGuess(game, seat, word, meta) {
    var p = player(game, seat);
    var correct = !!word && word === game.pair.civ.en;
    if (p.isMe) {
      game.guess = { correct: word ? correct : null, timedOut: !word };
      if (word && game.pair.civ.vocabId) {
        game.evidence.push({
          id: nextId(game, 'guess'), at: Number(meta && meta.at) || 0, kind: 'guess', pair: game.pair.id,
          word: game.pair.civ.bank, vocabId: game.pair.civ.vocabId, ok: correct,
          ms: Math.max(300, Math.round(Number(meta && meta.ms) || 4000)), kappa: KAPPA.guess
        });
      }
    }
    if (correct) { game.winner = 'inf'; game.reason = 'stolen'; }
    return { seat: seat, word: word, correct: correct };
  }

  function checkWinner(game) {
    if (game.winner) return { winner: game.winner, reason: game.reason };
    var civ = 0; var inf = 0;
    alive(game).forEach(function (p) { if (isInfiltrator(p)) inf++; else civ++; });
    if (inf === 0) { game.winner = 'civ'; game.reason = 'all-caught'; }
    else if (inf >= civ) { game.winner = 'inf'; game.reason = 'outnumber'; }
    return game.winner ? { winner: game.winner, reason: game.reason } : null;
  }

  /** Ringkasan untuk debrief. Semua angka berasal dari kejadian pertandingan ini. */
  function summary(game) {
    var m = me(game);
    var team = isInfiltrator(m) ? 'inf' : 'civ';
    var clues = game.clueStats.filter(function (c) { return !c.timedOut; });
    var votes = game.ballots.filter(function (b) { return b.myVote; });
    var hits = votes.filter(function (b) { return isInfiltrator(player(game, b.myVote)); }).length;
    var survived = m.alive ? game.round : Math.max(0, m.out - 1);
    var won = game.winner === team;
    var score = 0;
    clues.forEach(function (c) { score += c.ok ? 30 : -10; });
    if (team === 'civ') score += hits * 25; else score += survived * 20;
    if (game.guess && game.guess.correct) score += 80;
    if (won) score += 100;
    return {
      team: team, won: won, winner: game.winner, reason: game.reason,
      clueOk: clues.filter(function (c) { return c.ok; }).length, clueTotal: clues.length,
      timeouts: game.clueStats.filter(function (c) { return c.timedOut; }).length,
      guess: game.guess, voteHits: hits, voteTotal: votes.length,
      survived: survived, rounds: game.round, score: Math.max(0, score),
      evidence: game.evidence.slice()
    };
  }

  return {
    LAYOUT: LAYOUT,
    KAPPA: KAPPA,
    createRng: createRng,
    newGame: newGame,
    startRound: startRound,
    chipsFor: chipsFor,
    fits: fits,
    applyClue: applyClue,
    botPickClue: botPickClue,
    publicSus: publicSus,
    mood: mood,
    shout: shout,
    throwItem: throwItem,
    botDebateAction: botDebateAction,
    botReaction: botReaction,
    botVote: botVote,
    tally: tally,
    eliminate: eliminate,
    guessOptions: guessOptions,
    botGuess: botGuess,
    resolveGuess: resolveGuess,
    checkWinner: checkWinner,
    summary: summary,
    player: player,
    alive: alive,
    isInfiltrator: isInfiltrator
  };
}));
