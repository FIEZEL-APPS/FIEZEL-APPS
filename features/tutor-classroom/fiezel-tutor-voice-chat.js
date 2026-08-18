/**
 * m025-42 Classroom press-to-talk.
 *
 * OWNER: inside Classroom there must be a round button in the middle. Press it, speak, and
 * FIEZEL answers whatever was asked - and the answers must vary the way a real teacher
 * varies, not repeat one canned line.
 *
 * How the pieces fit:
 *
 *   input   SpeechRecognition (id-ID). Where it does not exist - and it does NOT exist in a
 *           standalone iOS PWA, which is this app's main target - the same button opens a
 *           typing sheet instead. A dead button would be worse than a typed question.
 *   answer  Core AI gateway first (a real model, genuinely open-ended), local
 *           FiezelTutorDialog second, so the tutor still answers with no connection.
 *   output  the Indonesian neural bundle when it is downloaded, otherwise the mandatory
 *           English neural engine. Browser SpeechSynthesis is never used, anywhere: OWNER's
 *           standing rule is neural or nothing.
 */
(function (root) {
  'use strict';
  if (!root || !root.document || root.__fiezelTutorVoiceChatInstalled) return;
  root.__fiezelTutorVoiceChatInstalled = true;

  var doc = root.document;
  var AI_TIMEOUT_MS = 12000;
  var memory = root.FiezelTutorDialog ? root.FiezelTutorDialog.createMemory() : { lastVariant: {}, turns: 0 };
  var listening = false;
  var busy = false;
  var recognition = null;

  function classroomActive() {
    try {
      var app = doc.getElementById('app');
      return !!(app && app.querySelector('.classroom-v3'));
    } catch (_) { return false; }
  }

  function lessonContext() {
    try {
      return (typeof root.__fiezelTutorContext === 'function' && root.__fiezelTutorContext()) || {};
    } catch (_) { return {}; }
  }

  function recognizer() {
    var Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
    return typeof Ctor === 'function' ? Ctor : null;
  }

  // ---- speaking ----------------------------------------------------------------

  function speak(text) {
    var value = String(text || '').trim();
    if (!value) return Promise.resolve(false);
    var indo = root.FiezelIndonesianVoice;
    var prepared = false;
    try { prepared = !!(indo && indo.status && indo.status().prepared && typeof indo.speak === 'function'); } catch (_) {}
    if (prepared) {
      return indo.speak(value, { speed: 1, lang: 'id-ID', allowFallback: false }).catch(function () { return baseSpeak(value); });
    }
    return baseSpeak(value);
  }

  function baseSpeak(value) {
    var runtime = root.FiezelVoiceRuntime;
    if (!runtime || typeof runtime.speak !== 'function') return Promise.resolve(false);
    return runtime.speak(value, { lang: 'id-ID', speed: 1, allowFallback: false }).catch(function () { return false; });
  }

  function stopSpeaking() {
    try { root.FiezelIndonesianVoice && root.FiezelIndonesianVoice.stop && root.FiezelIndonesianVoice.stop(); } catch (_) {}
    try { root.FiezelVoiceRuntime && root.FiezelVoiceRuntime.stop && root.FiezelVoiceRuntime.stop(); } catch (_) {}
  }

  // ---- answering ---------------------------------------------------------------

  function localAnswer(question) {
    var dialog = root.FiezelTutorDialog;
    if (!dialog) return { id: 'Modul tutor belum termuat.', en: '', intent: 'error' };
    return dialog.respond(question, lessonContext(), memory);
  }

  function aiAnswer(question) {
    var dialog = root.FiezelTutorDialog;
    if (!dialog || typeof root.askFiezelAI !== 'function') return Promise.resolve(null);
    // m025-43 OWNER: "hanya tergantung konteks subjek saja, jadi ini gagal jika disebut
    // AI". Correct - the prompt used to frame every question as a question ABOUT the open
    // lesson. It is now an open-domain prompt: the lesson is optional background, and any
    // question is fair game.
    var prompt = dialog.aiPrompt(question, lessonContext());
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, AI_TIMEOUT_MS); });
    var request = Promise.resolve()
      .then(function () { return root.askFiezelAI(prompt); })
      .then(function (text) { return String(text || '').trim() || null; })
      .catch(function () { return null; });
    return Promise.race([request, timeout]);
  }

  /**
   * The gateway is tried first, but a failure is never surfaced as an error: the local
   * engine answers instead, so pressing the button always produces a reply.
   */
  function answer(question) {
    return aiAnswer(question).then(function (aiText) {
      if (aiText) return { id: aiText, en: '', intent: 'ai', source: 'core-ai' };
      var local = localAnswer(question);
      // Being honest about the limit is part of the answer: an off-topic question with no
      // gateway gets the local reply AND the reason it is not the full model.
      var offline = local.intent === 'open' || local.intent === 'unknown';
      var note = offline ? ' ' + unavailableReason() : '';
      return { id: local.id + note, en: local.en, intent: local.intent, source: 'local' };
    });
  }

  /** Why the full model did not answer, in one sentence the learner can act on. */
  function unavailableReason() {
    try {
      if (typeof root.puter === 'undefined') return 'Untuk pertanyaan bebas di luar materi, FIEZEL AI perlu koneksi internet.';
      var signedIn = root.puter && root.puter.auth && root.puter.auth.isSignedIn && root.puter.auth.isSignedIn();
      if (!signedIn) return 'Untuk pertanyaan bebas di luar materi, login Puter dulu lewat menu pengaturan.';
    } catch (_) {}
    return 'Untuk pertanyaan bebas di luar materi, FIEZEL AI perlu koneksi internet.';
  }

  // ---- UI ----------------------------------------------------------------------

  function ensureUi() {
    if (doc.getElementById('tutorTalkDock')) return;
    var dock = doc.createElement('div');
    dock.id = 'tutorTalkDock';
    dock.className = 'tutor-talk-dock';
    // m025-43 OWNER: the chat log covered the lesson. The button keeps one short status
    // line and nothing else - the answer is spoken, and its text goes to the tutor's own
    // subtitle line, which is already part of the lesson layout.
    dock.innerHTML =
      '<button type="button" id="tutorTalkButton" class="tutor-talk-button" aria-label="Tekan lalu bicara ke Fiezel">' +
      '<span class="tutor-talk-ring"></span><i data-lucide="mic"></i></button>' +
      '<p class="tutor-talk-hint" id="tutorTalkHint">Tekan lalu bicara</p>';
    doc.body.appendChild(dock);
    doc.getElementById('tutorTalkButton').addEventListener('click', onPress);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (_) {}
  }

  function removeUi() {
    var dock = doc.getElementById('tutorTalkDock');
    if (dock && dock.remove) dock.remove();
    var sheet = doc.getElementById('tutorTalkSheet');
    if (sheet && sheet.remove) sheet.remove();
  }

  function setHint(text) {
    var hint = doc.getElementById('tutorTalkHint');
    if (hint) hint.textContent = text;
  }

  function setState(name) {
    var button = doc.getElementById('tutorTalkButton');
    if (!button || !button.classList) return;
    button.classList.remove('is-listening', 'is-thinking');
    if (name) button.classList.add(name);
  }

  /** The answer text lands in the lesson's existing subtitle line, not in a chat box. */
  function showAnswer(text) {
    var subtitle = doc.getElementById('tutorSubtitle');
    if (subtitle) subtitle.textContent = String(text || '');
  }

  // ---- interaction --------------------------------------------------------------

  function handleQuestion(question) {
    var text = String(question || '').trim();
    if (!text) { setHint('Belum ada suara yang tertangkap'); return; }
    busy = true;
    setState('is-thinking');
    setHint('Fiezel sedang menjawab…');
    answer(text).then(function (reply) {
      busy = false;
      setState('');
      showAnswer(reply.id);
      setHint(reply.source === 'core-ai' ? 'Dijawab FIEZEL AI' : 'Tekan lalu bicara');
      return speak(reply.id);
    }).catch(function () {
      busy = false;
      setState('');
      setHint('Coba tanyakan sekali lagi');
    });
  }

  function startListening() {
    var Ctor = recognizer();
    if (!Ctor) { openTypeSheet(); return; }
    stopSpeaking();
    try { recognition = new Ctor(); } catch (_) { openTypeSheet(); return; }
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = function (event) {
      var said = '';
      try { said = event.results[0][0].transcript; } catch (_) {}
      handleQuestion(said);
    };
    recognition.onerror = function () {
      listening = false;
      setState('');
      // A refused or unavailable microphone must not dead-end the feature.
      setHint('Mikrofon tidak bisa dipakai. Ketik saja.');
      openTypeSheet();
    };
    recognition.onend = function () { listening = false; if (!busy) { setState(''); setHint('Tekan lalu bicara'); } };
    try { recognition.start(); listening = true; setState('is-listening'); setHint('Mendengarkan… bicara sekarang'); }
    catch (_) { listening = false; openTypeSheet(); }
  }

  function stopListening() {
    listening = false;
    setState('');
    try { if (recognition && recognition.stop) recognition.stop(); } catch (_) {}
  }

  function onPress() {
    if (busy) { stopSpeaking(); busy = false; setState(''); setHint('Tekan lalu bicara'); return; }
    if (listening) { stopListening(); return; }
    startListening();
  }

  function openTypeSheet() {
    if (doc.getElementById('tutorTalkSheet')) return;
    var sheet = doc.createElement('div');
    sheet.id = 'tutorTalkSheet';
    sheet.className = 'tutor-talk-sheet';
    sheet.innerHTML =
      '<form class="tutor-talk-panel">' +
      '<span class="tutor-talk-mark">TANYA FIEZEL</span>' +
      '<h2>Tanya apa saja</h2>' +
      '<p>Perangkat ini belum mengizinkan input suara, jadi ketik pertanyaanmu. Fiezel tetap menjawab dengan suara.</p>' +
      '<textarea name="question" rows="3" maxlength="240" placeholder="Contoh: kenapa bukan I have went?" required></textarea>' +
      '<div class="tutor-talk-actions"><button type="button" data-talk-cancel>Batal</button>' +
      '<button type="submit" class="primary">Tanya</button></div></form>';
    doc.body.appendChild(sheet);
    sheet.querySelector('[data-talk-cancel]').addEventListener('click', function () { sheet.remove(); });
    sheet.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault();
      var text = '';
      try { text = String(new root.FormData(event.currentTarget).get('question') || ''); } catch (_) {
        var field = sheet.querySelector('textarea');
        text = field ? field.value : '';
      }
      sheet.remove();
      handleQuestion(text);
    });
    var area = sheet.querySelector('textarea');
    if (area && area.focus) area.focus();
  }

  function sync() {
    if (classroomActive()) ensureUi();
    else { stopListening(); removeUi(); }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    var run = function () { scheduled = false; sync(); };
    if (typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  if (root.MutationObserver) {
    var app = doc.getElementById('app');
    if (app) new root.MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  }
  sync();

  root.FiezelTutorVoiceChat = Object.freeze({
    schema: 'fiezel-tutor-voice-chat-v1',
    ask: handleQuestion,
    speechSupported: function () { return !!recognizer(); },
    sync: sync
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
