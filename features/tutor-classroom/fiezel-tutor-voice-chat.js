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

  // AI-02 F01: naskah murid diambil dari lapisan i18n (copy-id-feat-b.js). Di browser
  // runtime-nya dimuat lebih dulu (index.html); di Node modul memuatnya sendiri supaya
  // keluaran render tetap byte-identik dengan sebelumnya.
  var I18N = (typeof globalThis !== 'undefined' && globalThis.FiezelI18n) || null;
  if (!I18N && typeof require === 'function') {
    try {
      I18N = require('../i18n/fiezel-i18n.js');
      require('../i18n/copy-id-feat-b.js');
    } catch (loadError) { I18N = null; }
  }
  function T(key, params) { return I18N ? I18N.t(key, params) : String(key); }
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

  /**
   * m025-95: tutor bicara INGGRIS dengan subtitle Indonesia, bukan bersuara Indonesia.
   *
   * Dialog tutor sudah berpasangan {en, id}, jadi barisnya diambil langsung dari
   * pasangan itu dan tidak menghabiskan jatah terjemahan.
   */
  function speak(reply) {
    var say = root.FiezelVoiceSay;
    if (!say || typeof say.say !== 'function') return Promise.resolve(false);
    if (typeof reply === 'string') return say.say(reply);
    var en = String((reply && reply.en) || '').trim();
    var id = String((reply && reply.id) || '').trim();
    // Tanpa kalimat Inggris tidak ada yang bisa diucapkan; barisnya saja tidak cukup.
    if (!en) return Promise.resolve(false);
    return say.say({ en: en, id: id });
  }

  function stopSpeaking() {
    try { root.FiezelVoiceSay && root.FiezelVoiceSay.stop && root.FiezelVoiceSay.stop(); } catch (_) {}
  }

  // ---- answering ---------------------------------------------------------------

  function localAnswer(question) {
    var dialog = root.FiezelTutorDialog;
    if (!dialog) return { id: T('tutor.module-missing'), en: '', intent: 'error' };
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
      if (typeof root.puter === 'undefined') return T('tutor.ai-need-internet');
      var signedIn = root.puter && root.puter.auth && root.puter.auth.isSignedIn && root.puter.auth.isSignedIn();
      if (!signedIn) return T('tutor.ai-need-login');
    } catch (_) {}
    return T('tutor.ai-need-internet');
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
      '<button type="button" id="tutorTalkButton" class="tutor-talk-button" aria-label="' + T('tutor.talk-aria') + '">' +
      '<span class="tutor-talk-ring"></span><i data-lucide="mic"></i></button>' +
      '<p class="tutor-talk-hint" id="tutorTalkHint">' + T('tutor.talk-hint') + '</p>';
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


  /**
   * m025-100: teks model ditulis dalam Markdown. Sampai rilis ini ia dipasang lewat
   * textContent, jadi murid membaca "**tebal**" apa adanya - bug Bab 2 brief redesign, dan
   * di sini justru pada permukaan AI yang paling sering dibaca.
   *
   * Beralih ke innerHTML membuka permukaan injeksi, jadi syaratnya keras: HANYA lewat
   * renderMarkdown() milik app.js, yang meng-esc setiap baris SEBELUM mengubah penanda
   * menjadi tag. Kalau penerjemah itu tidak ada - app.js gagal dimuat, atau modul ini
   * dipakai di luar aplikasi - kita kembali ke textContent, bukan menulis teks mentah ke
   * innerHTML. Lebih baik terlihat jelek daripada tidak aman.
   */
  function paintModelText(node, text) {
    if (!node) return false;
    var md = root && root.renderMarkdown;
    if (typeof md === 'function') {
      try { node.innerHTML = md(text); return true; } catch (_) {}
    }
    node.textContent = String(text || '');
    return false;
  }

  /** The answer text lands in the lesson's existing subtitle line, not in a chat box. */
  function showAnswer(text) {
    paintModelText(doc.getElementById('tutorSubtitle'), text);
  }

  // ---- interaction --------------------------------------------------------------

  function handleQuestion(question) {
    var text = String(question || '').trim();
    if (!text) { setHint(T('tutor.no-voice-captured')); return; }
    busy = true;
    setState('is-thinking');
    setHint(T('tutor.answering'));
    answer(text).then(function (reply) {
      busy = false;
      setState('');
      showAnswer(reply.id);
      setHint(reply.source === 'core-ai' ? T('tutor.answered-by-ai') : T('tutor.talk-hint'));
      return speak(reply);
    }).catch(function () {
      busy = false;
      setState('');
      setHint(T('tutor.ask-retry'));
    });
  }

  function startListening() {
    var Ctor = recognizer();
    if (!Ctor) { openTypeSheet(); return; }
    stopSpeaking();
    try { recognition = new Ctor(); } catch (_) { openTypeSheet(); return; }
    // AI-17 F03 (audit v2): ini SATU-SATUNYA permukaan STT berbahasa MURID di seluruh
    // aplikasi — murid bertanya ke tutor dalam bahasa ibunya. Locale dibaca dari atribut
    // <html lang> yang diset app.js lewat FiezelI18n.onChange (m025-182 W2-STATE), BUKAN
    // dengan mengimpor modul i18n: pola tak-langsung ini menjaga jarak dari plumbing
    // locale UI yang dilarang keras menyentuh opsi audio (AI-17 F02). Fallback ke id-ID
    // menjaga perilaku lama byte-demi-byte saat atributnya belum/tidak terisi.
    // Recognizer latihan SPEAKING tetap en-US (bahasa yang DIPELAJARI) — jangan disamakan.
    var learnerLang = '';
    try { learnerLang = String(doc.documentElement.lang || ''); } catch (_) {}
    recognition.lang = /^th(-|$)/i.test(learnerLang) ? 'th-TH' : 'id-ID';
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
      setHint(T('tutor.mic-blocked'));
      openTypeSheet();
    };
    recognition.onend = function () { listening = false; if (!busy) { setState(''); setHint(T('tutor.talk-hint')); } };
    try { recognition.start(); listening = true; setState('is-listening'); setHint(T('tutor.listening-now')); }
    catch (_) { listening = false; openTypeSheet(); }
  }

  function stopListening() {
    listening = false;
    setState('');
    try { if (recognition && recognition.stop) recognition.stop(); } catch (_) {}
  }

  function onPress() {
    if (busy) { stopSpeaking(); busy = false; setState(''); setHint(T('tutor.talk-hint')); return; }
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
      '<span class="tutor-talk-mark">' + T('tutor.ask-kicker') + '</span>' +
      '<h2>' + T('tutor.sheet-title') + '</h2>' +
      '<p>' + T('tutor.sheet-body') + '</p>' +
      '<textarea name="question" rows="3" maxlength="240" placeholder="' + T('tutor.sheet-placeholder') + '" required></textarea>' +
      '<div class="tutor-talk-actions"><button type="button" data-talk-cancel>' + T('tutor.btn-cancel') + '</button>' +
      '<button type="submit" class="primary">' + T('tutor.btn-ask') + '</button></div></form>';
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
