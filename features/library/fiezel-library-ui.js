/**
 * m025-44 Library screen: shelf, reader, audiobook, instant translation, Ask Fiezel.
 *
 * The reader renders one <button> per sentence rather than a block of text. That single
 * decision is what makes the rest work:
 *
 *   - tapping a sentence is a normal button press, so the translation appears instantly
 *     and no text-selection UI is involved (selection is disabled app-wide anyway);
 *   - the audiobook can highlight exactly what it is reading, because the narrator and
 *     the DOM share one sentence index;
 *   - "Tanya Fiezel" always has a precise subject: the sentence the learner tapped.
 *
 * Narration is the neural English voice already shipped with the app. There is no audio
 * file to license, ship or cache, and it keeps working offline once the voice bundle is
 * downloaded - which is now mandatory at install.
 */
(function (root) {
  'use strict';
  if (!root || !root.document || root.__fiezelLibraryUiInstalled) return;
  root.__fiezelLibraryUiInstalled = true;

  var doc = root.document;
  var PROGRESS_KEY = 'fiezel-library-progress-v1';
  var pack = null;
  var session = null;
  var narrating = false;
  var narrationToken = 0;

  function mount() { return doc.getElementById('app'); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function readProgress() {
    try { return JSON.parse(root.localStorage.getItem(PROGRESS_KEY) || 'null'); } catch (_) { return null; }
  }
  function saveProgress() {
    if (!session) return;
    try { root.localStorage.setItem(PROGRESS_KEY, JSON.stringify(session.exportProgress())); } catch (_) {}
  }

  async function ensurePack() {
    if (pack) return pack;
    var response = await root.fetch('./features/library/library-books-v1.json', { credentials: 'same-origin' });
    if (!response || !response.ok) throw new Error('library_pack_unavailable');
    pack = await response.json();
    session = root.FiezelLibrary.createSession(pack, readProgress());
    return pack;
  }

  // ---- narration ----------------------------------------------------------------

  function speak(text) {
    var runtime = root.FiezelVoiceRuntime;
    if (!runtime || typeof runtime.speak !== 'function') return Promise.reject(new Error('neural_runtime_missing'));
    var speed = 1;
    try { speed = typeof root.selectedNeuralRate === 'function' ? Number(root.selectedNeuralRate()) || 1 : 1; } catch (_) {}
    var voice;
    try { voice = typeof root.neuralVoiceFor === 'function' ? root.neuralVoiceFor({}) : undefined; } catch (_) {}
    // The books are English; narration is never routed through the Indonesian tutor voice.
    return runtime.speak(text, { voice: voice, lang: 'en-US', speed: speed, allowFallback: false });
  }

  function stopNarration() {
    narrationToken++;
    narrating = false;
    if (session) session.pause();
    try { root.FiezelVoiceRuntime && root.FiezelVoiceRuntime.stop && root.FiezelVoiceRuntime.stop(); } catch (_) {}
    updatePlayButton();
  }

  /**
   * Reads sentence by sentence. Each step re-checks its token, so pressing pause or
   * leaving the screen stops the book instead of letting a queued sentence play on.
   */
  async function narrate() {
    var token = ++narrationToken;
    narrating = true;
    session.play();
    updatePlayButton();
    while (narrating && token === narrationToken) {
      var sentence = session.current();
      if (!sentence) break;
      highlight(sentence.index, true);
      try {
        await speak(sentence.en);
      } catch (error) {
        narrating = false;
        session.pause();
        setStatus('Audiobook butuh suara neural. Selesaikan unduhan suara dulu.');
        updatePlayButton();
        return;
      }
      if (!narrating || token !== narrationToken) return;
      var following = session.next();
      saveProgress();
      if (!following) {
        narrating = false;
        setStatus('Selesai. Buku ini sudah dibacakan sampai habis.');
        updatePlayButton();
        return;
      }
      renderProgress();
    }
  }

  // ---- rendering ------------------------------------------------------------------

  function shelfMarkup() {
    var cards = session.books().map(function (b) {
      var progress = session.progressFor(b.id);
      var accent = esc((b.cover && b.cover.accent) || '#3d7de0');
      return '<button type="button" class="library-card" data-book="' + esc(b.id) + '" style="--book-accent:' + accent + '">' +
        '<span class="library-cover">' + esc((b.cover && b.cover.emoji) || '📖') + '</span>' +
        '<span class="library-meta"><b>' + esc(b.title) + '</b>' +
        '<small>' + esc(b.level) + ' · ' + esc(b.minutes) + ' menit · ' + esc(b.sentences) + ' kalimat</small>' +
        '<em>' + esc(b.about.id) + '</em>' +
        (b.original ? '' : '<span class="library-badge">Ringkasan FIEZEL</span>') +
        (progress.percent ? '<span class="library-progress"><span style="width:' + progress.percent + '%"></span></span>' : '') +
        '</span></button>';
    }).join('');
    return '<section class="fade library-page"><div class="section-head"><div>' +
      '<span class="section-kicker">FIEZEL LIBRARY</span><h1>Perpustakaan</h1>' +
      '<p>Dongeng dan novel pendek dengan audiobook dan terjemahan sekali ketuk. Ketuk kalimat mana pun untuk melihat artinya.</p>' +
      '</div></div><div class="library-grid">' + cards + '</div></section>';
  }

  function readerMarkup() {
    var snap = session.snapshot();
    var summary = session.books().filter(function (b) { return b.id === snap.bookId; })[0] || {};
    var chapters = {};
    var body = session.sentences().map(function (s) {
      var head = '';
      if (chapters[s.chapterIndex] !== true) {
        chapters[s.chapterIndex] = true;
        head = '<h2 class="library-chapter">' + esc(s.chapterTitle) + '</h2>';
      }
      return head + '<button type="button" class="library-sentence" data-sentence="' + s.index + '"' +
        (s.index === snap.sentenceIndex ? ' data-active="1"' : '') + '>' + esc(s.en) + '</button>';
    }).join('');
    return '<section class="fade library-page library-reader">' +
      '<div class="library-reader-head"><button type="button" class="library-back" data-shelf="1">← Rak buku</button>' +
      '<div><span class="section-kicker">' + esc(summary.level || '') + ' · ' + esc(snap.chapterTitle || '') + '</span>' +
      '<h1>' + esc(snap.title || '') + '</h1></div></div>' +
      (summary.original ? '' : '<p class="library-note">' + esc(summary.source) + '</p>') +
      '<div class="library-text" id="libraryText">' + body + '</div>' +
      '<div class="library-translation" id="libraryTranslation" hidden></div>' +
      '<div class="library-dock">' +
      '<div class="library-progress-line"><span id="libraryBar" style="width:' + snap.percent + '%"></span></div>' +
      '<p class="library-status" id="libraryStatus">Ketuk kalimat untuk arti, atau putar audiobook.</p>' +
      '<div class="library-controls">' +
      '<button type="button" id="librayPrev" data-step="-1" aria-label="Kalimat sebelumnya"><i data-lucide="chevron-left"></i></button>' +
      '<button type="button" class="primary" id="libraryPlay"><i data-lucide="play"></i> Audiobook</button>' +
      '<button type="button" id="libraryNext" data-step="1" aria-label="Kalimat berikutnya"><i data-lucide="chevron-right"></i></button>' +
      '<button type="button" id="libraryAsk"><i data-lucide="message-circle-question"></i> Tanya Fiezel</button>' +
      '</div></div></section>';
  }

  function renderShelf() {
    stopNarration();
    session.close();
    var node = mount();
    if (!node) return;
    node.innerHTML = shelfMarkup();
    node.querySelectorAll('[data-book]').forEach(function (button) {
      button.addEventListener('click', function () { openBook(button.dataset.book); });
    });
    icons();
  }

  function renderReader() {
    var node = mount();
    if (!node) return;
    node.innerHTML = readerMarkup();
    node.querySelectorAll('[data-sentence]').forEach(function (button) {
      button.addEventListener('click', function () { onSentence(Number(button.dataset.sentence)); });
    });
    node.querySelectorAll('[data-shelf]').forEach(function (button) {
      button.addEventListener('click', renderShelf);
    });
    node.querySelectorAll('[data-step]').forEach(function (button) {
      button.addEventListener('click', function () { step(Number(button.dataset.step)); });
    });
    var play = doc.getElementById('libraryPlay');
    if (play) play.addEventListener('click', togglePlay);
    var ask = doc.getElementById('libraryAsk');
    if (ask) ask.addEventListener('click', openAsk);
    icons();
  }

  function icons() {
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (_) {}
  }

  function setStatus(text) {
    var node = doc.getElementById('libraryStatus');
    if (node) node.textContent = text;
  }

  function renderProgress() {
    var snap = session.snapshot();
    var bar = doc.getElementById('libraryBar');
    if (bar && bar.style) bar.style.width = snap.percent + '%';
    highlight(snap.sentenceIndex, true);
  }

  function highlight(index, scroll) {
    var nodes = doc.querySelectorAll('[data-sentence]');
    nodes.forEach(function (node) {
      if (Number(node.dataset.sentence) === Number(index)) {
        node.setAttribute('data-active', '1');
        if (scroll && node.scrollIntoView) {
          try { node.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
        }
      } else node.removeAttribute('data-active');
    });
  }

  function updatePlayButton() {
    var button = doc.getElementById('libraryPlay');
    if (!button) return;
    button.innerHTML = narrating
      ? '<i data-lucide="pause"></i> Jeda'
      : '<i data-lucide="play"></i> Audiobook';
    icons();
  }

  // ---- interaction ----------------------------------------------------------------

  function openBook(bookId) {
    try { session.open(bookId); } catch (_) { return; }
    renderReader();
    var progress = session.progressFor(bookId);
    if (progress.percent) setStatus('Lanjut dari kalimat ' + (session.snapshot().sentenceIndex + 1) + '.');
  }

  /** Tap a sentence: translate instantly, and make it the narration position too. */
  function onSentence(index) {
    session.goTo(index);
    var picked = session.select(index);
    saveProgress();
    highlight(index, false);
    var panel = doc.getElementById('libraryTranslation');
    if (panel && picked) {
      panel.hidden = false;
      panel.innerHTML = '<span class="library-translation-mark">TERJEMAHAN</span>' +
        '<p class="library-translation-en">' + esc(picked.en) + '</p>' +
        '<p class="library-translation-id">' + esc(picked.id) + '</p>' +
        '<div class="library-translation-actions">' +
        '<button type="button" id="librarySpeakOne"><i data-lucide="volume-2"></i> Dengar</button>' +
        '<button type="button" id="libraryAskOne"><i data-lucide="message-circle-question"></i> Tanya Fiezel</button>' +
        '</div>';
      var listen = doc.getElementById('librarySpeakOne');
      if (listen) listen.addEventListener('click', function () { stopNarration(); speak(picked.en).catch(function () {}); });
      var ask = doc.getElementById('libraryAskOne');
      if (ask) ask.addEventListener('click', openAsk);
      icons();
    }
    renderProgress();
  }

  function step(direction) {
    stopNarration();
    if (direction > 0) session.next(); else session.previous();
    saveProgress();
    renderProgress();
  }

  function togglePlay() {
    if (narrating) { stopNarration(); setStatus('Dijeda.'); return; }
    setStatus('Membacakan…');
    narrate();
  }

  // ---- Ask Fiezel about this book -------------------------------------------------

  function askContext() {
    var snap = session.snapshot();
    var picked = snap.selected || session.current();
    return {
      lesson: {
        topic: snap.title || 'bacaan ini',
        level: 'A2',
        board: { title: snap.title || '', formula: picked ? picked.en : '', examples: picked ? [picked.en] : [] }
      },
      beat: picked ? { en: picked.en, idText: picked.id } : null
    };
  }

  function openAsk() {
    stopNarration();
    var picked = session.snapshot().selected || session.current();
    var existing = doc.getElementById('libraryAskSheet');
    if (existing && existing.remove) existing.remove();
    var sheet = doc.createElement('div');
    sheet.id = 'libraryAskSheet';
    sheet.className = 'library-ask-sheet';
    sheet.innerHTML = '<form class="library-ask-panel"><span class="library-ask-mark">TANYA FIEZEL</span>' +
      '<h2>Tanya tentang bacaan ini</h2>' +
      (picked ? '<p class="library-ask-quote">“' + esc(picked.en) + '”</p>' : '') +
      '<textarea name="question" rows="3" maxlength="240" placeholder="Contoh: kenapa pakai kata was di sini?" required></textarea>' +
      '<div class="library-ask-actions"><button type="button" data-cancel>Tutup</button>' +
      '<button type="submit" class="primary">Tanya</button></div>' +
      '<p class="library-ask-answer" id="libraryAskAnswer"></p></form>';
    doc.body.appendChild(sheet);
    sheet.querySelector('[data-cancel]').addEventListener('click', function () { sheet.remove(); });
    sheet.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault();
      var field = sheet.querySelector('textarea');
      var question = String((field && field.value) || '').trim();
      if (!question) return;
      answerQuestion(question);
    });
    var area = sheet.querySelector('textarea');
    if (area && area.focus) area.focus();
    icons();
  }

  function showAskAnswer(text) {
    var node = doc.getElementById('libraryAskAnswer');
    if (node) node.textContent = text;
  }

  /**
   * Same contract as the Classroom talk button: the Core AI model first, the local
   * engine when it is unreachable, and the reply is spoken, never silently printed.
   */
  function answerQuestion(question) {
    showAskAnswer('Fiezel sedang menjawab…');
    var dialog = root.FiezelTutorDialog;
    var context = askContext();
    var ai = (typeof root.askFiezelAI === 'function' && dialog)
      ? Promise.resolve().then(function () { return root.askFiezelAI(dialog.aiPrompt(question, context)); }).catch(function () { return null; })
      : Promise.resolve(null);
    ai.then(function (text) {
      var answer = String(text || '').trim();
      if (!answer && dialog) answer = dialog.respond(question, context, memory()).id;
      if (!answer) answer = 'Fiezel belum bisa menjawab pertanyaan itu sekarang.';
      showAskAnswer(answer);
      return speakIndonesian(answer);
    }).catch(function () { showAskAnswer('Fiezel belum bisa menjawab pertanyaan itu sekarang.'); });
  }

  var askMemory = null;
  function memory() {
    if (!askMemory && root.FiezelTutorDialog) askMemory = root.FiezelTutorDialog.createMemory();
    return askMemory || { lastVariant: {}, turns: 0 };
  }

  function speakIndonesian(text) {
    var indo = root.FiezelIndonesianVoice;
    var prepared = false;
    try { prepared = !!(indo && indo.status && indo.status().prepared); } catch (_) {}
    if (prepared) return indo.speak(text, { lang: 'id-ID', speed: 1, allowFallback: false }).catch(function () {});
    var runtime = root.FiezelVoiceRuntime;
    if (!runtime || typeof runtime.speak !== 'function') return Promise.resolve();
    return runtime.speak(text, { lang: 'id-ID', speed: 1, allowFallback: false }).catch(function () {});
  }

  // ---- entry point -----------------------------------------------------------------

  async function library() {
    var node = mount();
    if (!node) return;
    node.innerHTML = '<section class="fade library-page"><div class="card">Memuat perpustakaan…</div></section>';
    try {
      await ensurePack();
      if (!root.FiezelLibrary) throw new Error('library_runtime_missing');
      renderShelf();
    } catch (error) {
      node.innerHTML = '<section class="fade library-page"><div class="card"><b>Perpustakaan belum bisa dimuat.</b>' +
        '<p class="muted">' + esc((error && error.message) || error) + '</p></div></section>';
    }
  }

  root.library = library;
  // Leaving the screen must silence the narrator; nothing is worse than a book that keeps
  // reading over the next screen.
  if (root.MutationObserver) {
    var app = mount();
    if (app) {
      new root.MutationObserver(function () {
        if (narrating && !doc.querySelector('.library-reader')) stopNarration();
      }).observe(app, { childList: true, subtree: true });
    }
  }

  root.FiezelLibraryUi = Object.freeze({
    schema: 'fiezel-library-ui-v1',
    open: library,
    stop: stopNarration,
    isNarrating: function () { return narrating; }
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
