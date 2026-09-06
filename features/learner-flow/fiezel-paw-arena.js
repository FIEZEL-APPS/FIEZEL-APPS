/**
 * FIEZEL · PAW ARENA — ruang permainan tersendiri (m025-277).
 *
 * NAMA MEREK "PAW ARENA" dikunci owner — tidak diterjemahkan, sama di id & th (§3). Kalimat
 * di sekelilingnya tetap dwibahasa lewat FiezelI18n.t.
 *
 * TIGA PERMAINAN berbeda rasa (§3.1), semua bisa SOLO lawan bot Braincore offline (§3.1.1),
 * nol server (§3.1.2), 3–7 menit (§3.1.4), tanpa ketik bebas (§3.1.5):
 *   - story  · STORY CHAIN — kerja sama membangun cerita; bahasa Inggris = harga tiket.
 *   - signal · SINYAL      — beri-petunjuk (dari kartu) & tebak; adu presisi kosakata.
 *   - stakes · TARUHAN     — bertaruh pada keyakinan sebelum menjawab; cepat & tegang.
 * Lawan = FiezelArenaBot (murni, deterministik dari seed). Soal = FiezelReviewBank. Bunyi =
 * uiSfx(); maskot = pawReact(); keduanya fail-soft & hormat reduced-motion.
 *
 * KARTU ATURAN PER-SESI (§3.3): visibilitas kartu adalah SIFAT SESI (phase==='rules' saat
 * lahir), BUKAN flag lintas-sesi. newSession() SELALU lahir 'rules'. SENGAJA TIDAK memakai
 * FiezelTour (sekali-seumur-hidup) — USES_TOUR=false; dibuktikan gerbang paw-arena-rules-card.
 * "Tidak pernah mengurung" (m025-88): semua jalan keluar kartu → satu dismissRules().
 * Petunjuk di tengah ronde (openHelp/closeHelp) tidak menyentuh ronde/giliran/skor.
 *
 * ?duel=KODE lama tetap hidup lewat readLegacyDuelCode (FiezelDuel.decode).
 *
 * BATAS: bukan modul brain — boleh DOM/localStorage; semua akses DOM dijaga (typeof document)
 * agar modul bisa di-require Node oleh gerbang. Keputusan lawan didelegasikan ke modul murni.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelPawArena = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var USES_TOUR = false; // kartu per-sesi tidak bergantung modul tur sekali-seumur-hidup.

  var STORY_TURNS = 4;   // 4 pertukaran (kamu↔bot) = 8 kalimat → selesai 3–7 menit.
  var SIGNAL_ROUNDS = 4;
  var STAKES_ROUNDS = 5;

  var GAMES = Object.freeze([
    Object.freeze({ id: 'story', rounds: STORY_TURNS, key: 'story', teaches: 'connectors_narrative_tense' }),
    Object.freeze({ id: 'signal', rounds: SIGNAL_ROUNDS, key: 'signal', teaches: 'vocab_definitions_synonyms' }),
    Object.freeze({ id: 'stakes', rounds: STAKES_ROUNDS, key: 'stakes', teaches: 'mixed_skill_recall' })
  ]);

  var SKILL_ROTATION = ['vocab_a2', 'past_tense', 'listening_detail', 'reading_inference', 'past_questions'];
  var WAGER_POINTS = { low: 1, mid: 2, high: 3 };

  // Tangga cerita STORY CHAIN: tiap posisi menawarkan 3 kalimat Inggris (konektor + tense
  // naratif). `fit` = kelayakan alur (dipakai bot chooseSentence). Semua kalimat English —
  // itu KONTEN BELAJAR (target), bukan chrome UI yang perlu dwibahasa.
  var STORY_STAGES = [
    [{ text: 'One quiet morning, a small fox opened the old library door.', fit: 0.9 }, { text: 'It was raining, so the children stayed inside the classroom.', fit: 0.8 }, { text: 'Nobody knew that the map on the wall was actually a door.', fit: 0.7 }],
    [{ text: 'Then it found a dusty map hidden behind a heavy book.', fit: 0.9 }, { text: 'Suddenly, a soft light started to glow under the table.', fit: 0.8 }, { text: 'After a while, a friendly cat walked in and sat down.', fit: 0.75 }],
    [{ text: 'Because the map was glowing, they decided to follow it.', fit: 0.9 }, { text: 'First, they packed some bread, water, and a small lamp.', fit: 0.8 }, { text: 'However, the door behind them slowly closed by itself.', fit: 0.7 }],
    [{ text: 'They walked carefully until they reached a bright river.', fit: 0.85 }, { text: 'Along the way, they met a turtle who spoke in riddles.', fit: 0.9 }, { text: 'Meanwhile, the sky turned a strange shade of purple.', fit: 0.7 }],
    [{ text: 'The turtle said the treasure was not gold, but a word.', fit: 0.9 }, { text: 'So they crossed the river on a bridge made of leaves.', fit: 0.8 }, { text: 'Later, they discovered a garden full of talking flowers.', fit: 0.75 }],
    [{ text: 'When they whispered the word, the garden opened a gate.', fit: 0.9 }, { text: 'Finally, they understood that kindness was the real key.', fit: 0.85 }, { text: 'At last, the fox realised the map led back home.', fit: 0.8 }],
    [{ text: 'They shared the secret with everyone in the village.', fit: 0.85 }, { text: 'In the end, the library became the happiest place in town.', fit: 0.9 }, { text: 'From that day on, the door only opened for curious minds.', fit: 0.8 }],
    [{ text: 'And so, a new adventure was already waiting for tomorrow.', fit: 0.9 }, { text: 'They closed the book, but the story never really ended.', fit: 0.85 }, { text: 'The fox smiled, knowing friends make every journey brighter.', fit: 0.8 }]
  ];

  // Bank SINYAL: konten permainan (kata + kartu petunjuk), semua English. `clarity` = seberapa
  // jelas petunjuk itu menuntun ke target (dipakai bot chooseClues/guessFromClues).
  var SIGNAL_BANK = [
    { word: 'library', options: ['library', 'kitchen', 'stadium', 'harbour'], clues: [{ text: 'A quiet place full of books you can borrow.', clarity: 0.95 }, { text: 'You must be silent here.', clarity: 0.7 }, { text: 'It has shelves and a reading room.', clarity: 0.85 }, { text: 'Students go here to study.', clarity: 0.6 }, { text: 'Synonym hint: a "book house".', clarity: 0.8 }] },
    { word: 'brave', options: ['brave', 'sleepy', 'angry', 'honest'], clues: [{ text: 'Not afraid of danger.', clarity: 0.95 }, { text: 'A hero is usually this.', clarity: 0.8 }, { text: 'Synonym: courageous.', clarity: 0.9 }, { text: 'Opposite of scared.', clarity: 0.75 }, { text: 'You need this to face a big challenge.', clarity: 0.6 }] },
    { word: 'harvest', options: ['harvest', 'whisper', 'balloon', 'engine'], clues: [{ text: 'The time when farmers collect the crops.', clarity: 0.95 }, { text: 'It happens after months of growing.', clarity: 0.7 }, { text: 'Rice and corn are ready for this.', clarity: 0.85 }, { text: 'A busy season on the farm.', clarity: 0.6 }, { text: 'Synonym: reaping.', clarity: 0.8 }] },
    { word: 'invent', options: ['invent', 'borrow', 'forget', 'repeat'], clues: [{ text: 'To create something completely new.', clarity: 0.95 }, { text: 'Edison did this with the light bulb.', clarity: 0.85 }, { text: 'Synonym: to design or devise.', clarity: 0.8 }, { text: 'You do this in a laboratory.', clarity: 0.6 }, { text: 'Opposite of copy.', clarity: 0.7 }] },
    { word: 'gentle', options: ['gentle', 'loud', 'rough', 'rapid'], clues: [{ text: 'Soft and kind in the way you act.', clarity: 0.95 }, { text: 'You touch a baby like this.', clarity: 0.85 }, { text: 'Synonym: tender.', clarity: 0.9 }, { text: 'Opposite of rough.', clarity: 0.8 }, { text: 'A calm breeze is this.', clarity: 0.6 }] },
    { word: 'journey', options: ['journey', 'silence', 'pocket', 'ceiling'], clues: [{ text: 'A long trip from one place to another.', clarity: 0.95 }, { text: 'It can take many days.', clarity: 0.65 }, { text: 'Synonym: voyage or trip.', clarity: 0.9 }, { text: 'Heroes go on this in stories.', clarity: 0.7 }, { text: 'You pack a bag before it.', clarity: 0.6 }] }
  ];

  function gameById(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return null; }

  function t(k, fb) {
    try { var I = root && root.FiezelI18n; return I && I.t ? I.t(k) : (fb == null ? k : fb); }
    catch (_) { return fb == null ? k : fb; }
  }

  // ---- SESI (murni; dipakai gerbang) --------------------------------------------------
  function newSession(gameId, opts) {
    var g = gameById(gameId) || GAMES[0];
    var o = opts || {};
    var seed = (o.seed >>> 0) || 20260601;
    var Bot = root && root.FiezelArenaBot;
    var persona = Bot ? Bot.pickPersona(seed) : { id: 'bumi', name: 'Bumi', skill: 0.62 };
    return {
      schema: 'fiezel-paw-arena-session-v1',
      game: g.id,
      mode: o.mode === 'friend' ? 'friend' : 'solo',
      seed: seed,
      phase: 'rules',        // SELALU 'rules' saat masuk (§3.3).
      rulesShown: false,
      helpOpen: false,
      round: 0,
      turn: 0,               // 0 = kamu, 1 = bot.
      scores: [0, 0],
      opponent: { name: persona.name, persona: persona.id, isBot: o.mode !== 'friend' },
      story: [],
      log: [],
      rt: null               // runtime ronde (disiapkan controller saat mulai main).
    };
  }

  function shouldShowRules(session) { return !!session && session.phase === 'rules'; }

  function rulesModel(gameId, tt) {
    var fn = typeof tt === 'function' ? tt : t;
    var g = gameById(gameId) || GAMES[0];
    var base = 'pawarena.game.' + g.key;
    var steps = [];
    for (var i = 1; i <= 3; i++) {
      var s = fn(base + '.rule-step' + i, '');
      if (s && s !== base + '.rule-step' + i) steps.push(s);
    }
    return {
      game: g.id, title: fn(base + '.name', g.id), goal: fn(base + '.rule-goal', ''),
      steps: steps, startLabel: fn('pawarena.start', 'Mulai'), skipLabel: fn('pawarena.skip', 'Lewati')
    };
  }

  // SATU jalur keluar dari kartu (m025-88 "tidak pernah mengurung").
  function dismissRules(session, reason) {
    if (!session) return session;
    session.rulesDismissReason = reason || 'start';
    return startRound(session);
  }
  function startRound(session) { if (session) { session.phase = 'playing'; session.rulesShown = true; } return session; }

  // Petunjuk mid-ronde: TIDAK mengubah ronde/giliran/skor/fase (§3.3.3).
  function openHelp(session) { if (session) session.helpOpen = true; return session; }
  function closeHelp(session) { if (session) session.helpOpen = false; return session; }

  function recordTurn(session, entry) { session.log.push(entry); if (entry && entry.correct) session.scores[entry.who] += (entry.points || 1); }
  function appendSentence(session, text, who) { session.story.push({ by: who === 1 ? 'opponent' : 'you', text: String(text || '') }); return session; }
  function storyText(session) { return (session.story || []).map(function (s) { return s.text; }).join(' '); }
  function isOver(session) { return session && session.round >= (gameById(session.game) || {}).rounds; }
  function advance(session) {
    if (!session) return session;
    if (session.game === 'story') { if (session.turn === 0) session.turn = 1; else { session.turn = 0; session.round += 1; } }
    else { session.round += 1; }
    if (isOver(session)) session.phase = 'done';
    return session;
  }
  function result(session) {
    var mine = session.scores[0], theirs = session.scores[1];
    return { outcome: mine > theirs ? 'win' : (mine < theirs ? 'lose' : 'tie'), mine: mine, theirs: theirs, story: storyText(session) };
  }
  function readLegacyDuelCode(str) { try { var D = root && root.FiezelDuel; return D && D.decode ? D.decode(str) : null; } catch (_) { return null; } }

  // ====================================================================================
  // CONTROLLER (DOM) — dijaga typeof document; gerbang Node berhenti sebelum sini.
  // ====================================================================================
  var mountEl = null, env = {}, S = null, timer = null;

  function bank() { return root && root.FiezelReviewBank; }
  function rng(n) { var Bot = root && root.FiezelArenaBot; return Bot ? Bot.makeRng((S.seed >>> 0) + (n || 0)) : function () { return 0.5; }; }
  function motionOk() { try { return !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return true; } }
  function sfx(name) { try { if (root && root.uiSfx) root.uiSfx(name); } catch (_) {} }
  function paw(evt) { try { if (root && root.pawReact) root.pawReact(evt); } catch (_) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]; }); }

  function mount(el, options) {
    if (typeof document === 'undefined' || !el) return;
    mountEl = el; env = options || {}; S = null;
    el.addEventListener('click', onClick);
    render();
  }
  function unmount() { if (timer) { clearTimeout(timer); timer = null; } }

  function botThink(fn) {
    // Jeda "berpikir" hanya kalau gerak diizinkan; kalau tidak, langsung — hormat reduced-motion.
    if (timer) { clearTimeout(timer); timer = null; }
    if (!motionOk()) { fn(); return; }
    timer = setTimeout(function () { timer = null; fn(); }, 650);
  }

  // ---- setup runtime per giliran/ronde ----
  function setupTurn() {
    var b = bank(); if (!b) { S.rt = { error: true }; return; }
    var seedBase = (S.seed >>> 0) + S.round * 97 + S.turn * 13;
    if (S.game === 'story') {
      var skill = SKILL_ROTATION[(S.round * 2 + S.turn) % SKILL_ROTATION.length];
      var q = b.pickFresh(skill, 1, { avoid: storyAvoid(), seed: seedBase })[0];
      var stage = STORY_STAGES[Math.min(S.story.length, STORY_STAGES.length - 1)];
      S.rt = { step: S.turn === 0 ? 'challenge' : 'bot', q: q, chosen: null, feedback: null, options: stage };
      if (S.turn === 1) runBotStory();
    } else if (S.game === 'signal') {
      var entry = SIGNAL_BANK[(S.round + (S.seed % SIGNAL_BANK.length)) % SIGNAL_BANK.length];
      var youGive = (S.round % 2) === 0; // ronde genap: kamu beri petunjuk; ganjil: bot beri petunjuk.
      S.rt = { step: youGive ? 'give' : 'botgive', entry: entry, picked: [], youGive: youGive, feedback: null };
      if (!youGive) runBotGive();
    } else { // stakes
      var sk = SKILL_ROTATION[S.round % SKILL_ROTATION.length];
      var qq = b.pickFresh(sk, 1, { avoid: [], seed: seedBase })[0];
      S.rt = { step: 'wager', q: qq, wager: null, chosen: null, feedback: null, botWager: null, botChoice: null, botCorrect: null };
    }
  }
  function storyAvoid() { return (S.log || []).map(function (e) { return e.qid; }).filter(Boolean); }

  // ---- STORY: bot menjawab tantangan lalu menyambung kalimat ----
  function runBotStory() {
    var Bot = root && root.FiezelArenaBot, item = S.rt.q, r = rng(S.round * 7 + 1);
    var ans = Bot.chooseAnswer({ correctIndex: item ? item.answer : 0, optionCount: item ? item.options.length : 4, difficulty: 3, persona: personaObj(), rng: r });
    var pick = Bot.chooseSentence({ options: S.rt.options, persona: personaObj(), rng: r });
    S.rt.botAnswer = ans; S.rt.botPick = pick; S.rt.step = 'bot-thinking'; render();
    botThink(function () {
      recordTurn(S, { who: 1, correct: ans.correct, points: 1, qid: item && item.id });
      appendSentence(S, S.rt.options[pick].text, 1);
      paw(ans.correct ? 'correct' : 'wrong'); sfx(ans.correct ? 'correct' : 'wrong');
      advance(S);
      if (S.phase === 'done') finishGame(); else { setupTurn(); render(); }
    });
  }
  function personaObj() {
    var Bot = root && root.FiezelArenaBot; if (!Bot) return { skill: 0.62, nerve: 0.4, haste: 0.4 };
    var list = Bot.PERSONAS; for (var i = 0; i < list.length; i++) if (list[i].id === S.opponent.persona) return list[i]; return list[0];
  }

  // ---- SIGNAL bot flows ----
  function runBotGive() {
    var Bot = root && root.FiezelArenaBot, e = S.rt.entry, r = rng(S.round * 5 + 3);
    var picks = Bot.chooseClues({ clueCards: e.clues, persona: personaObj(), rng: r, n: 2 + (r() > 0.5 ? 1 : 0) });
    S.rt.botPicked = picks; S.rt.step = 'guess'; render();
  }
  function signalStrength(entry, idxs) {
    if (!idxs.length) return 0; var s = 0; for (var i = 0; i < idxs.length; i++) s += (entry.clues[idxs[i]].clarity || 0.5); return s / idxs.length;
  }

  // ---- render ----
  function render() {
    if (typeof document === 'undefined' || !mountEl) return;
    var body;
    if (!S) body = lobbyHtml();
    else if (shouldShowRules(S)) body = rulesCardHtml();
    else if (S.phase === 'done') body = resultHtml();
    else body = roundHtml();
    mountEl.innerHTML = '<div class="paw-arena duel" data-testid="paw-arena">' +
      '<div class="paw-arena-top"><b class="paw-arena-brand">' + esc(t('pawarena.title', 'PAW ARENA')) + '</b>' +
      (S && !shouldShowRules(S) && S.phase !== 'done' ? '<button type="button" class="lf-mini" data-arena="help" data-testid="paw-arena-help" aria-label="' + esc(t('pawarena.help', 'Petunjuk')) + '">?</button>' : '') +
      '</div>' + body + (S && S.helpOpen ? helpOverlayHtml() : '') + '</div>';
    if (env.afterRender) try { env.afterRender(); } catch (_) {}
  }

  function lobbyHtml() {
    var cards = GAMES.map(function (g) {
      var base = 'pawarena.game.' + g.key;
      return '<button type="button" class="lf-card paw-lobby-card" data-arena="pick" data-game="' + g.id + '" data-testid="paw-pick-' + g.id + '">' +
        '<b>' + esc(t(base + '.name', g.id)) + '</b><small class="lf-muted">' + esc(t(base + '.tag', '')) + '</small>' +
        '<span class="lf-mini paw-lobby-cta">' + esc(t('pawarena.solo-vs-bot', 'Main sendiri lawan bot')) + '</span></button>';
    }).join('');
    return '<div class="lf-card duel-hero"><p class="lf-kicker">' + esc(t('pawarena.title', 'PAW ARENA')) + '</p>' +
      '<h2>' + esc(t('pawarena.pick-game', 'Pilih permainan')) + '</h2>' +
      '<p class="lf-muted">' + esc(t('pawarena.subtitle', '')) + '</p></div>' +
      '<div class="paw-lobby-grid">' + cards + '</div>';
  }

  function rulesCardHtml() {
    var m = rulesModel(S.game);
    var steps = m.steps.map(function (s, i) { return '<li><span>' + (i + 1) + '</span>' + esc(s) + '</li>'; }).join('');
    return '<div class="lf-card paw-rules-card" data-testid="paw-rules-card" role="dialog" aria-label="' + esc(m.title) + '">' +
      '<p class="lf-kicker">' + esc(m.title) + '</p><p class="paw-rules-goal">' + esc(m.goal) + '</p>' +
      '<ol class="paw-rules-steps">' + steps + '</ol>' +
      '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="start" autofocus data-testid="paw-rules-start">' + esc(m.startLabel) + '</button>' +
      '<button type="button" class="lf-ghost" data-arena="skip" data-testid="paw-rules-skip">' + esc(m.skipLabel) + '</button>' +
      '<button type="button" class="lf-ghost" data-arena="to-lobby">' + esc(t('pawarena.back', 'Kembali')) + '</button></div></div>';
  }

  function helpOverlayHtml() {
    var m = rulesModel(S.game);
    var steps = m.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    return '<div class="paw-help-overlay" data-testid="paw-help-overlay" role="dialog" aria-label="' + esc(t('pawarena.help', 'Petunjuk')) + '">' +
      '<div class="lf-card paw-help-inner"><p class="lf-kicker">' + esc(m.title) + '</p><p>' + esc(m.goal) + '</p><ul>' + steps + '</ul>' +
      '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="close-help" data-testid="paw-help-close">' + esc(t('pawarena.close', 'Tutup')) + '</button></div></div></div>';
  }

  function scoreBar() {
    return '<div class="duel-scores paw-scores"><span class="duel-p is-turn">' + esc(t('pawarena.you', 'Kamu')) + ' <b data-testid="paw-score-you">' + S.scores[0] + '</b></span>' +
      '<span class="duel-p">' + esc(S.opponent.name) + ' <b data-testid="paw-score-bot">' + S.scores[1] + '</b></span></div>';
  }
  function roundMeta() {
    var g = gameById(S.game) || GAMES[0];
    return '<div class="lf-q-meta"><span class="lf-chip">' + esc(t('pawarena.game.' + g.key + '.name', g.id)) + '</span>' +
      '<span class="lf-muted">' + esc(t('pawarena.round', 'Ronde {n}').replace('{n}', String(S.round + 1))) + ' / ' + g.rounds + '</span></div>';
  }

  function roundHtml() {
    if (S.rt && S.rt.error) return '<div class="lf-card"><p class="lf-muted">' + esc(t('pawarena.bank-missing', 'Bank soal belum termuat.')) + '</p></div>';
    if (S.game === 'story') return storyHtml();
    if (S.game === 'signal') return signalHtml();
    return stakesHtml();
  }

  function optionButtons(item, chosen, feedback) {
    return item.options.map(function (op, i) {
      var cls = 'lf-option'; if (feedback && i === item.answer) cls += ' is-correct'; if (feedback && feedback.chosen === i && i !== item.answer) cls += ' is-wrong';
      return '<button type="button" class="' + cls + '" data-arena="answer" data-choice="' + i + '"' + (feedback ? ' disabled' : '') + ' data-testid="paw-option-' + i + '">' + esc(op) + '</button>';
    }).join('');
  }
  function ctxHtml(item) {
    if (!item || !item.context) return '';
    return '<div class="lf-context"><div class="lf-context-head"><span>' + (item.contextKind === 'dialogue' ? esc(t('pawarena.dialogue', 'Dialog pendek')) : esc(t('pawarena.passage', 'Teks pendek'))) + '</span></div><pre class="lf-transcript">' + esc(item.context) + '</pre></div>';
  }

  // ---- STORY view ----
  function storyHtml() {
    var rt = S.rt, storyBlock = '<div class="lf-card paw-story-scroll" data-testid="paw-story"><h3>' + esc(t('pawarena.story.so-far', 'Cerita sejauh ini')) + '</h3>' +
      (S.story.length ? '<p class="paw-story-text">' + S.story.map(function (s) { return '<span class="paw-sent paw-sent-' + s.by + '">' + esc(s.text) + '</span>'; }).join(' ') + '</p>' : '<p class="lf-muted">' + esc(t('pawarena.story.empty', 'Belum ada kalimat. Giliran pertama milikmu.')) + '</p>') + '</div>';
    var panel;
    if (rt.step === 'bot-thinking') {
      panel = '<div class="lf-card"><p class="lf-muted" data-testid="paw-bot-thinking">' + esc(t('pawarena.thinking', '{name} sedang berpikir…').replace('{name}', S.opponent.name)) + '</p></div>';
    } else if (rt.step === 'challenge') {
      panel = '<div class="lf-card duel-play" data-testid="paw-story-challenge">' + roundMeta() + '<p class="lf-kicker">' + esc(t('pawarena.story.challenge', 'Lolos tantangan untuk membuka giliranmu')) + '</p>' +
        ctxHtml(rt.q) + '<p class="lf-prompt">' + esc(rt.q.prompt) + '</p><div class="lf-options">' + optionButtons(rt.q, rt.chosen, rt.feedback) + '</div>' +
        (rt.feedback ? '<div class="lf-feedback ' + (rt.feedback.correct ? 'is-correct' : 'is-wrong') + '">' + esc(rt.feedback.text) + '</div>' : '');
      panel += '</div>';
    } else if (rt.step === 'append') {
      panel = '<div class="lf-card" data-testid="paw-story-append"><p class="lf-kicker">' + esc(t('pawarena.story.pick-sentence', 'Pilih satu kalimat lanjutan')) + '</p><div class="paw-sentence-choices">' +
        rt.options.map(function (o, i) { return '<button type="button" class="lf-option paw-sentence" data-arena="pick-sentence" data-idx="' + i + '" data-testid="paw-sentence-' + i + '">' + esc(o.text) + '</button>'; }).join('') + '</div></div>';
    } else { panel = ''; }
    return scoreBar() + storyBlock + panel;
  }

  // ---- SIGNAL view ----
  function signalHtml() {
    var rt = S.rt, e = rt.entry;
    if (rt.step === 'give') {
      var cards = e.clues.map(function (c, i) { var on = rt.picked.indexOf(i) > -1; return '<button type="button" class="lf-option paw-clue' + (on ? ' is-picked' : '') + '" data-arena="clue-toggle" data-idx="' + i + '" data-testid="paw-clue-' + i + '">' + esc(c.text) + '</button>'; }).join('');
      return scoreBar() + roundMeta() + '<div class="lf-card" data-testid="paw-signal-give"><p class="lf-kicker">' + esc(t('pawarena.signal.your-word', 'Kata rahasiamu')) + '</p>' +
        '<p class="lf-prompt paw-secret-word">' + esc(e.word) + '</p><p class="lf-muted">' + esc(t('pawarena.signal.pick-clues', 'Pilih 2–3 kartu petunjuk untuk menuntun {name}.').replace('{name}', S.opponent.name)) + '</p>' +
        '<div class="paw-clue-set">' + cards + '</div>' +
        '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="clue-send"' + (rt.picked.length < 2 ? ' disabled' : '') + ' data-testid="paw-clue-send">' + esc(t('pawarena.signal.send', 'Kirim petunjuk')) + '</button></div></div>';
    }
    if (rt.step === 'give-result') {
      var g = rt.botGuess;
      return scoreBar() + '<div class="lf-card" data-testid="paw-signal-give-result"><div class="lf-feedback ' + (g.correct ? 'is-correct' : 'is-wrong') + '">' +
        esc((g.correct ? t('pawarena.signal.bot-got-it', '{name} menebak benar: {word}') : t('pawarena.signal.bot-missed', '{name} salah tebak — katanya {word}')).replace('{name}', S.opponent.name).replace('{word}', e.word)) + '</div>' +
        '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="next" data-testid="paw-next">' + esc(t('pawarena.next', 'Lanjut')) + '</button></div></div>';
    }
    if (rt.step === 'guess') {
      var clues = rt.botPicked.map(function (i) { return '<li>' + esc(e.clues[i].text) + '</li>'; }).join('');
      var opts = e.options.map(function (op, i) { var cls = 'lf-option'; if (rt.feedback) { if (op === e.word) cls += ' is-correct'; else if (rt.feedback.chosen === i) cls += ' is-wrong'; } return '<button type="button" class="' + cls + '" data-arena="signal-guess" data-choice="' + i + '"' + (rt.feedback ? ' disabled' : '') + ' data-testid="paw-guess-' + i + '">' + esc(op) + '</button>'; }).join('');
      return scoreBar() + roundMeta() + '<div class="lf-card" data-testid="paw-signal-guess"><p class="lf-kicker">' + esc(t('pawarena.signal.bot-clues', 'Petunjuk dari {name}').replace('{name}', S.opponent.name)) + '</p>' +
        '<ul class="paw-clue-list">' + clues + '</ul><p class="lf-muted">' + esc(t('pawarena.signal.guess-prompt', 'Tebak kata rahasianya')) + '</p><div class="lf-options">' + opts + '</div>' +
        (rt.feedback ? '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="next" data-testid="paw-next">' + esc(t('pawarena.next', 'Lanjut')) + '</button></div>' : '') + '</div>';
    }
    return scoreBar();
  }

  // ---- STAKES view ----
  function stakesHtml() {
    var rt = S.rt;
    var wager = '<div class="paw-wager-row">' + ['low', 'mid', 'high'].map(function (w) { var on = rt.wager === w; return '<button type="button" class="lf-option paw-wager' + (on ? ' is-picked' : '') + '" data-arena="wager" data-w="' + w + '"' + (rt.step !== 'wager' ? ' disabled' : '') + ' data-testid="paw-wager-' + w + '">' + esc(t('pawarena.wager.' + w, w)) + ' <b>+' + WAGER_POINTS[w] + '</b></button>'; }).join('') + '</div>';
    var head = scoreBar() + roundMeta() + '<div class="lf-card duel-play" data-testid="paw-stakes">' +
      '<p class="lf-kicker">' + esc(t('pawarena.wager.prompt', 'Pasang taruhanmu sebelum menjawab')) + '</p>' + wager;
    if (rt.step === 'wager') return head + '</div>';
    // answer / result
    head += ctxHtml(rt.q) + '<p class="lf-prompt">' + esc(rt.q.prompt) + '</p><div class="lf-options">' + optionButtons(rt.q, rt.chosen, rt.feedback) + '</div>';
    if (rt.feedback) {
      head += '<div class="lf-feedback ' + (rt.feedback.correct ? 'is-correct' : 'is-wrong') + '">' + esc(rt.feedback.text) + '</div>';
      head += '<div class="paw-stakes-tally" data-testid="paw-stakes-tally">' +
        esc(t('pawarena.stakes.you-line', 'Kamu: taruhan {w} → {pts} poin').replace('{w}', t('pawarena.wager.' + rt.wager, rt.wager)).replace('{pts}', String(rt.feedback.correct ? WAGER_POINTS[rt.wager] : 0))) + '<br>' +
        esc(t('pawarena.stakes.bot-line', '{name}: taruhan {w} → {pts} poin').replace('{name}', S.opponent.name).replace('{w}', t('pawarena.wager.' + rt.botWager, rt.botWager)).replace('{pts}', String(rt.botCorrect ? WAGER_POINTS[rt.botWager] : 0))) + '</div>';
      head += '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="next" data-testid="paw-next">' + esc(t('pawarena.next', 'Lanjut')) + '</button></div>';
    }
    return head + '</div>';
  }

  // ---- result ----
  function resultHtml() {
    var r = result(S);
    var head = r.outcome === 'win' ? t('pawarena.result.win', 'Kamu menang!') : (r.outcome === 'lose' ? t('pawarena.result.lose', '{name} menang!').replace('{name}', S.opponent.name) : t('pawarena.result.tie', 'Seri!'));
    var artifact = '';
    if (S.game === 'story') {
      artifact = '<div class="lf-card paw-artifact" data-testid="paw-artifact"><h3>' + esc(t('pawarena.story-done', 'Cerita kalian selesai — ini artefaknya.')) + '</h3>' +
        '<p class="paw-story-text">' + esc(r.story) + '</p>' +
        '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="save-story" data-testid="paw-save-story">' + esc(t('pawarena.save-artifact', 'Simpan cerita')) + '</button></div></div>';
    }
    return '<div class="lf-card duel-result" data-testid="paw-result"><p class="lf-kicker">' + esc(t('pawarena.title', 'PAW ARENA')) + '</p><h2>' + esc(head) + '</h2>' +
      '<ul class="duel-versus"><li class="is-me"><b>' + esc(t('pawarena.you', 'Kamu')) + '</b><span>' + r.mine + ' ' + esc(t('pawarena.points', 'poin')) + '</span></li>' +
      '<li><b>' + esc(S.opponent.name) + '</b><span>' + r.theirs + ' ' + esc(t('pawarena.points', 'poin')) + '</span></li></ul></div>' + artifact +
      '<div class="lf-actions"><button type="button" class="lf-primary" data-arena="replay" data-testid="paw-replay">' + esc(t('pawarena.play-again', 'Main lagi')) + '</button>' +
      '<button type="button" class="lf-ghost" data-arena="to-lobby" data-testid="paw-to-lobby">' + esc(t('pawarena.to-lobby', 'Ke daftar permainan')) + '</button></div>';
  }

  function finishGame() {
    S.phase = 'done'; paw('celebrate'); sfx(result(S).outcome === 'win' ? 'win' : 'complete'); render();
  }
  function saveStory() {
    try {
      var KEY = 'fiezel-paw-arena-stories-v1';
      var arr = JSON.parse(root.localStorage.getItem(KEY) || '[]');
      arr.unshift({ at: Date.now(), text: storyText(S), with: S.opponent.name });
      root.localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 20)));
    } catch (_) {}
    if (env.toast) try { env.toast(t('pawarena.story-saved', 'Cerita tersimpan.')); } catch (_) {}
  }

  // ---- events ----
  function onClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-arena]') : null;
    if (!btn || btn.disabled) return;
    var act = btn.getAttribute('data-arena');
    if (act === 'pick') { S = newSession(btn.getAttribute('data-game'), { seed: (Date.now() % 100000) + 7 }); sfx('nav'); render(); return; }
    if (act === 'start' || act === 'skip') { dismissRules(S, act); sfx('start'); paw('milestone'); setupTurn(); render(); return; }
    if (act === 'help') { openHelp(S); sfx('nav'); render(); return; }
    if (act === 'close-help') { closeHelp(S); render(); return; }
    if (act === 'to-lobby') { S = null; unmount(); render(); return; }
    if (act === 'replay') { S = newSession(S.game, { seed: (Date.now() % 100000) + 11 }); render(); return; }
    if (act === 'save-story') { saveStory(); return; }
    if (act === 'answer') { onAnswer(Number(btn.getAttribute('data-choice'))); return; }
    if (act === 'pick-sentence') { onStoryPick(Number(btn.getAttribute('data-idx'))); return; }
    if (act === 'clue-toggle') { onClueToggle(Number(btn.getAttribute('data-idx'))); return; }
    if (act === 'clue-send') { onClueSend(); return; }
    if (act === 'signal-guess') { onSignalGuess(Number(btn.getAttribute('data-choice'))); return; }
    if (act === 'wager') { S.rt.wager = btn.getAttribute('data-w'); S.rt.step = 'answer'; sfx('nav'); render(); return; }
    if (act === 'next') { onNext(); return; }
  }

  function onAnswer(choice) {
    var b = bank(), item = S.rt.q; if (!item || S.rt.feedback) return;
    var ex = b.explain(item, choice); S.rt.feedback = { correct: ex.correct, text: ex.text, chosen: choice };
    paw(ex.correct ? 'correct' : 'wrong'); sfx(ex.correct ? 'correct' : 'wrong');
    if (S.game === 'story') {
      recordTurn(S, { who: 0, correct: ex.correct, points: 1, qid: item.id });
      // Tiket dibeli: apa pun hasilnya, giliranmu terbuka untuk menyambung — tapi hanya
      // jawaban benar yang menambah poin (harga tiket §3.1 Story Chain).
      S.rt.step = 'append';
    } else { // stakes: reveal, hitung bot, tambah skor
      var Bot = root && root.FiezelArenaBot, r = rng(S.round * 3 + 2);
      var bw = Bot.chooseWager({ persona: personaObj(), rng: r });
      var ba = Bot.chooseAnswer({ correctIndex: item.answer, optionCount: item.options.length, difficulty: 3, persona: personaObj(), rng: r });
      S.rt.botWager = bw; S.rt.botChoice = ba.choice; S.rt.botCorrect = ba.correct;
      if (ex.correct) S.scores[0] += WAGER_POINTS[S.rt.wager];
      if (ba.correct) S.scores[1] += WAGER_POINTS[bw];
    }
    render();
  }
  function onStoryPick(idx) {
    if (!S.rt.options[idx]) return;
    appendSentence(S, S.rt.options[idx].text, 0); sfx('select'); paw('milestone');
    advance(S); // turn 0 → 1 (bot)
    if (S.phase === 'done') { finishGame(); return; }
    setupTurn(); render();
  }
  function onClueToggle(idx) {
    var p = S.rt.picked, at = p.indexOf(idx);
    if (at > -1) p.splice(at, 1); else if (p.length < 3) p.push(idx);
    render();
  }
  function onClueSend() {
    var Bot = root && root.FiezelArenaBot, e = S.rt.entry, r = rng(S.round * 9 + 4);
    var strength = signalStrength(e, S.rt.picked);
    S.rt.step = 'give-thinking'; render();
    botThink(function () {
      var guess = Bot.guessFromClues({ correctIndex: 0, optionCount: e.options.length, clueStrength: strength, persona: personaObj(), rng: r });
      S.rt.botGuess = guess; S.rt.step = 'give-result';
      if (guess.correct) { S.scores[0] += 1; paw('correct'); sfx('correct'); } else { paw('wrong'); sfx('wrong'); }
      render();
    });
  }
  function onSignalGuess(choice) {
    if (S.rt.feedback) return; var e = S.rt.entry, correct = e.options[choice] === e.word;
    S.rt.feedback = { chosen: choice, correct: correct };
    if (correct) { S.scores[0] += 1; paw('correct'); sfx('correct'); } else { paw('wrong'); sfx('wrong'); }
    render();
  }
  function onNext() {
    advance(S);
    if (S.phase === 'done') { finishGame(); return; }
    setupTurn(); render();
  }

  return {
    USES_TOUR: USES_TOUR, GAMES: GAMES, STORY_TURNS: STORY_TURNS,
    SIGNAL_BANK: SIGNAL_BANK, STORY_STAGES: STORY_STAGES, WAGER_POINTS: WAGER_POINTS,
    gameById: gameById, newSession: newSession, shouldShowRules: shouldShowRules,
    rulesModel: rulesModel, dismissRules: dismissRules, startRound: startRound,
    openHelp: openHelp, closeHelp: closeHelp, recordTurn: recordTurn,
    appendSentence: appendSentence, storyText: storyText, isOver: isOver,
    advance: advance, result: result, readLegacyDuelCode: readLegacyDuelCode,
    mount: mount, unmount: unmount, render: render
  };
});
