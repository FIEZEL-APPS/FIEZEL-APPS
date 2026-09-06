/**
 * FIEZEL · PAW ARENA — ruang permainan tersendiri (m025-276).
 *
 * NAMA MEREK: "PAW ARENA" dikunci owner — tidak diterjemahkan, sama di id & th. Kalimat di
 * sekelilingnya tetap dwibahasa lewat FiezelI18n.t (tugas §3).
 *
 * ISINYA TIGA PERMAINAN (tugas §3.1), berbeda RASA satu sama lain:
 *   - story  · STORY CHAIN  — kerja sama membangun cerita; bahasa Inggris = harga tiket.
 *   - signal · SINYAL       — beri-petunjuk & tebak; adu komunikasi presisi kosakata.
 *   - stakes · TARUHAN      — bertaruh pada keyakinan sendiri; cepat, tegang, individual.
 * Ketiganya bisa dimainkan SENDIRI melawan bot Braincore (FiezelArenaBot), offline, dan
 * berdua lewat kode/tautan (giliran bergantian — nol biaya server, §3.1.2). Duel lama
 * (`?duel=KODE`) TIDAK dipatahkan: arena membaca kode duel lama lewat FiezelDuel.decode.
 *
 * ========================================================================================
 * KARTU ATURAN PER-SESI — INTI KEPUTUSAN OWNER (§3.3), DAN KENAPA TIDAK PAKAI MODUL TUR
 * ========================================================================================
 * Owner memutuskan: SETIAP kali murid masuk sesi, kartu aturan HARUS muncul — bukan sekali
 * seumur hidup. Karena itu visibilitas kartu adalah SIFAT DARI SESI (session.phase ==='rules'
 * saat lahir), BUKAN flag yang disimpan lintas-sesi. newSession() SELALU lahir di fase
 * 'rules'. Tidak ada storage key yang bisa menekannya. Inilah kenapa modul ini SENGAJA
 * TIDAK memakai FiezelTour.completed()/STORAGE_KEY dari features/onboarding/fiezel-tour.js:
 * modul tur dirancang sekali-seumur-hidup — persis kebalikan dari yang diminta. USES_TOUR
 * di bawah adalah `false` dan gerbang tests/paw-arena-rules-card-test.js membuktikan kartu
 * muncul di DUA kali masuk berturut-turut (bukan hanya kali pertama).
 *
 * "TIDAK PERNAH MENGURUNG" (pelajaran m025-88): setiap jalan keluar dari kartu — tombol
 * Mulai, Lewati, tombol kembali, sentuh di luar, atau tenggat — berakhir di SATU jalur
 * yang sama: dismissRules(session, reason) → startRound(). Tidak ada cabang yang menjebak.
 *
 * PETUNJUK DI TENGAH RONDE: openHelp()/closeHelp() TIDAK menyentuh ronde/giliran/skor —
 * membuka petunjuk tidak membatalkan permainan dan tidak menghanguskan giliran (§3.3.3).
 *
 * BATAS: berkas ini BUKAN modul brain — ia boleh menyentuh DOM/localStorage. Semua akses
 * DOM dijaga (typeof document) supaya modul bisa di-require di Node oleh gerbang. Keputusan
 * lawan didelegasikan ke FiezelArenaBot yang murni; animasi/SFX ke sistem yang sudah ada.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelPawArena = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // Owner: kartu aturan per-SESI tidak boleh bergantung pada modul tur sekali-seumur-hidup.
  var USES_TOUR = false;

  var STORY_TURNS = 6;   // 3 giliranmu + 3 giliran bot → cerita 6 kalimat, selesai 3–7 menit.
  var SIGNAL_ROUNDS = 5;
  var STAKES_ROUNDS = 6;

  // Metadata tiap permainan. `help` menunjuk kunci i18n petunjuknya SENDIRI (§3.3.4: satu
  // teks umum untuk tiga permainan = tidak ada petunjuk). `rounds` = panjang ronde.
  var GAMES = Object.freeze([
    Object.freeze({ id: 'story', rounds: STORY_TURNS, key: 'story', teaches: 'connectors_narrative_tense' }),
    Object.freeze({ id: 'signal', rounds: SIGNAL_ROUNDS, key: 'signal', teaches: 'vocab_definitions_synonyms' }),
    Object.freeze({ id: 'stakes', rounds: STAKES_ROUNDS, key: 'stakes', teaches: 'mixed_skill_recall' })
  ]);

  function gameById(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  function t(k, fb) {
    try { var I = root && root.FiezelI18n; return I && I.t ? I.t(k) : (fb == null ? k : fb); }
    catch (_) { return fb == null ? k : fb; }
  }

  // ---- SESI --------------------------------------------------------------------------
  /**
   * Lahir SELALU di fase 'rules'. `seed` menentukan persona & langkah bot (lewat
   * FiezelArenaBot) sehingga solo-vs-bot deterministik dan bisa diputar ulang gerbang.
   * @param {string} gameId  'story' | 'signal' | 'stakes'
   * @param {Object} [opts]  { mode:'solo'|'friend', seed, opponentName }
   */
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
      phase: 'rules',          // SELALU 'rules' saat masuk — kartu aturan per-sesi (§3.3).
      rulesShown: false,
      helpOpen: false,         // petunjuk di tengah ronde; tidak memengaruhi ronde.
      round: 0,
      turn: 0,                 // 0 = kamu, 1 = bot/teman.
      scores: [0, 0],
      opponent: { name: o.mode === 'friend' ? (o.opponentName || t('pawarena.friend', 'Teman')) : persona.name, persona: persona.id, isBot: o.mode !== 'friend' },
      story: [],               // Story Chain: [{by,text}] — artefak yang bisa disimpan.
      log: []                  // riwayat langkah, untuk hasil akhir.
    };
  }

  // Kartu aturan HARUS terlihat setiap sesi masuk: benar selama fase masih 'rules'.
  function shouldShowRules(session) { return !!session && session.phase === 'rules'; }

  /**
   * Model teks kartu aturan untuk SATU permainan (§3.3.1: satu kalimat tujuan, 2–3 langkah,
   * satu tombol mulai). Dwibahasa lewat i18n. Bukan dinding teks.
   */
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
      game: g.id,
      title: fn(base + '.name', g.id),
      goal: fn(base + '.rule-goal', ''),
      steps: steps,
      startLabel: fn('pawarena.start', 'Mulai'),
      skipLabel: fn('pawarena.skip', 'Lewati')
    };
  }

  /**
   * SATU jalur keluar dari kartu aturan (m025-88 "tidak pernah mengurung"): apa pun
   * reason-nya ('start'|'skip'|'back'|'outside'|'deadline'), kartu ditutup DENGAN CARA YANG
   * SAMA dan ronde mulai. Tidak ada cabang yang menjebak murid di kartu.
   */
  function dismissRules(session, reason) {
    if (!session) return session;
    session.rulesDismissReason = reason || 'start';
    return startRound(session);
  }

  function startRound(session) {
    if (!session) return session;
    session.phase = 'playing';
    session.rulesShown = true;
    return session;
  }

  // Petunjuk di tengah ronde: MEMBUKA TIDAK mengubah ronde/giliran/skor/fase (§3.3.3).
  function openHelp(session) { if (session) session.helpOpen = true; return session; }
  function closeHelp(session) { if (session) session.helpOpen = false; return session; }

  // ---- LANGKAH PERMAINAN (netral-UI; dipanggil renderer & bot) ------------------------
  function recordTurn(session, entry) {
    session.log.push(entry);
    if (entry && entry.correct) session.scores[entry.who] += (entry.points || 1);
  }

  // STORY CHAIN: menyambung kalimat SETELAH tantangan bahasa lolos (§3.1 Story Chain).
  function appendSentence(session, text, who) {
    session.story.push({ by: who === 1 ? 'opponent' : 'you', text: String(text || '') });
    return session;
  }
  function storyText(session) {
    return (session.story || []).map(function (s) { return s.text; }).join(' ');
  }
  function isOver(session) { return session && session.round >= (gameById(session.game) || {}).rounds; }

  function advance(session) {
    if (!session) return session;
    // Giliran bergantian; satu putaran penuh (kamu → lawan) menambah satu ronde untuk
    // permainan dua-giliran seperti Story Chain. Signal/Stakes memakai satu langkah/ronde.
    if (session.game === 'story') {
      if (session.turn === 0) { session.turn = 1; }
      else { session.turn = 0; session.round += 1; }
    } else {
      session.round += 1;
    }
    if (isOver(session)) session.phase = 'done';
    return session;
  }

  function result(session) {
    var mine = session.scores[0], theirs = session.scores[1];
    var outcome = mine > theirs ? 'win' : (mine < theirs ? 'lose' : 'tie');
    return { outcome: outcome, mine: mine, theirs: theirs, story: storyText(session) };
  }

  // ---- ?duel=KODE lama tetap hidup (§4) ----------------------------------------------
  function readLegacyDuelCode(str) {
    try { var D = root && root.FiezelDuel; return D && D.decode ? D.decode(str) : null; }
    catch (_) { return null; }
  }

  // ---- RENDER (dijaga: hanya jika ada document) --------------------------------------
  function sfx(name) { try { if (root && root.uiSfx) root.uiSfx(name); } catch (_) {} }
  function paw(evt) { try { if (root && root.pawReact) root.pawReact(evt); } catch (_) {} }

  function mount(el, env) {
    if (typeof document === 'undefined' || !el) return; // gerbang Node berhenti di sini.
    env = env || {};
    var session = env.session || newSession(env.game || 'story', env.opts || {});
    paw('celebrate'); sfx('nav');
    render(el, session, env);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
    });
  }

  function render(el, session, env) {
    if (typeof document === 'undefined' || !el) return;
    var html;
    if (shouldShowRules(session)) html = rulesCardHtml(session);
    else html = boardHtml(session);
    el.innerHTML = '<div class="paw-arena" data-testid="paw-arena">' +
      '<div class="paw-arena-topbar"><b>' + esc(t('pawarena.title', 'PAW ARENA')) + '</b>' +
      '<button type="button" class="paw-arena-help-btn" data-arena="help" aria-label="' + esc(t('pawarena.help', 'Petunjuk')) + '" data-testid="paw-arena-help">?</button></div>' +
      html +
      (session.helpOpen ? helpOverlayHtml(session) : '') + '</div>';
    if (env && env.afterRender) try { env.afterRender(); } catch (_) {}
  }

  function rulesCardHtml(session) {
    var m = rulesModel(session.game);
    var steps = m.steps.map(function (s, i) { return '<li><span>' + (i + 1) + '</span>' + esc(s) + '</li>'; }).join('');
    // Tombol Mulai adalah FOKUS AWAL (autofocus) — pemain lama menekan sekali & langsung main (§3.3.2).
    return '<div class="paw-rules-card" data-testid="paw-rules-card" role="dialog" aria-label="' + esc(m.title) + '">' +
      '<p class="paw-rules-goal">' + esc(m.goal) + '</p>' +
      '<ol class="paw-rules-steps">' + steps + '</ol>' +
      '<div class="paw-rules-actions">' +
      '<button type="button" class="paw-primary" data-arena="start" autofocus data-testid="paw-rules-start">' + esc(m.startLabel) + '</button>' +
      '<button type="button" class="paw-ghost" data-arena="skip" data-testid="paw-rules-skip">' + esc(m.skipLabel) + '</button>' +
      '</div></div>';
  }

  function helpOverlayHtml(session) {
    var m = rulesModel(session.game);
    var steps = m.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    return '<div class="paw-help-overlay" data-testid="paw-help-overlay" role="dialog" aria-label="' + esc(t('pawarena.help', 'Petunjuk')) + '">' +
      '<div class="paw-help-inner"><h4>' + esc(m.title) + '</h4><p>' + esc(m.goal) + '</p><ul>' + steps + '</ul>' +
      '<button type="button" class="paw-primary" data-arena="close-help" data-testid="paw-help-close">' + esc(t('pawarena.close', 'Tutup')) + '</button></div></div>';
  }

  function boardHtml(session) {
    var vs = t('pawarena.bot.vs', 'Lawan: {name}').replace('{name}', esc(session.opponent.name));
    var g = gameById(session.game) || GAMES[0];
    var name = t('pawarena.game.' + g.key + '.name', g.id);
    return '<div class="paw-board" data-testid="paw-board">' +
      '<div class="paw-board-head"><b>' + esc(name) + '</b><small>' + esc(vs) + '</small></div>' +
      '<p class="paw-muted">' + esc(t('pawarena.round', 'Ronde {n}').replace('{n}', String(session.round + 1))) + '</p>' +
      // Konten ronde tiap permainan dirender oleh addon UI masing-masing (Story/Signal/Stakes);
      // engine ini menyediakan state & keputusan bot. Placeholder aman untuk boot.
      '<div class="paw-round-slot" data-testid="paw-round-slot"></div></div>';
  }

  function onClick(el, session, env, e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-arena]') : null;
    if (!btn) return;
    var act = btn.getAttribute('data-arena');
    if (act === 'start' || act === 'skip') { dismissRules(session, act); sfx('start'); paw('milestone'); render(el, session, env); }
    else if (act === 'help') { openHelp(session); sfx('nav'); render(el, session, env); }
    else if (act === 'close-help') { closeHelp(session); render(el, session, env); }
  }

  return {
    USES_TOUR: USES_TOUR,
    GAMES: GAMES,
    STORY_TURNS: STORY_TURNS,
    gameById: gameById,
    newSession: newSession,
    shouldShowRules: shouldShowRules,
    rulesModel: rulesModel,
    dismissRules: dismissRules,
    startRound: startRound,
    openHelp: openHelp,
    closeHelp: closeHelp,
    recordTurn: recordTurn,
    appendSentence: appendSentence,
    storyText: storyText,
    isOver: isOver,
    advance: advance,
    result: result,
    readLegacyDuelCode: readLegacyDuelCode,
    mount: mount,
    render: render,
    onClick: onClick
  };
});
