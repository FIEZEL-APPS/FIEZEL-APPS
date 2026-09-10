/**
 * FIEZEL · features/ui/fiezel-student-mode.js — MODE MURID
 * Menyalakan lapisan tampilan premium (body.fz-lux) dan menyembunyikan panel yang tidak
 * membantu murid (laporan diagnostik, panel sosial yang belum aktif, angka BKT, dst).
 * Dimuat SETELAH app.js. Tidak menyentuh Ruang Guru (body.fz-teacher-mode).
 */
(function (root) {
  'use strict';
  var HIDE_KEYS = [
    'progress.laporan-diagnostik', 'progress.lab-kesalahan', 'progress.mastery-bkt',
    'progress.jaringan-kekeliruan-vocab', 'progress.kebingungan-antar-lesson',
    'progress.tab-cara-soal-dipilih'
  ];
  var HIDE_BODY_KEYS = ['social.summary-flag-off', 'social.flag-off-title'];

  function t(k) { try { return root.FiezelI18n ? root.FiezelI18n.t(k) : k; } catch (_) { return k; } }
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  function apply() {
    var body = document.body;
    if (!body) return;
    body.classList.toggle('fz-lux', !body.classList.contains('fz-teacher-mode'));
    if (body.classList.contains('fz-teacher-mode')) return;
    var app = document.getElementById('app');
    if (!app) return;
    var titles = HIDE_KEYS.map(function (k) { return norm(t(k)); });
    var bodies = HIDE_BODY_KEYS.map(function (k) { return norm(t(k)); });
    var cards = app.querySelectorAll('.card, .home-fold, details.settings-fold');
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var head = el.querySelector('h2, h3, summary span, summary');
      var headText = norm(head && head.textContent);
      var bodyText = norm(el.textContent);
      var hit = headText && titles.indexOf(headText) >= 0;
      if (!hit) {
        for (var j = 0; j < bodies.length; j++) {
          if (bodies[j] && bodyText.indexOf(bodies[j]) >= 0) { hit = true; break; }
        }
      }
      if (hit) el.setAttribute('data-fz-student-hide', '1');
    }
  }

  function wrap(name) {
    var orig = root[name];
    if (typeof orig !== 'function' || orig.__fzStudentWrapped) return;
    var wrapped = function () {
      var out = orig.apply(this, arguments);
      try { apply(); } catch (_) {}
      return out;
    };
    wrapped.__fzStudentWrapped = true;
    root[name] = wrapped;
  }

  function boot() {
    wrap('enhanceUI');
    wrap('render');
    apply();
    try {
      new MutationObserver(function () {
        var b = document.body;
        var teacher = b.classList.contains('fz-teacher-mode');
        if (teacher === b.classList.contains('fz-lux')) b.classList.toggle('fz-lux', !teacher);
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  root.FiezelStudentMode = { apply: apply };
}(typeof self !== 'undefined' ? self : this));
