/**
 * FIEZEL · features/teacher/fiezel-teacher-loader.js — PEMUAT MALAS RUANG GURU (audit F28)
 *
 * fiezel-teacher-shell.js (±350 KB) dan fiezel-teacher-curriculum.js (±255 KB) dulu dimuat
 * untuk SETIAP pengunjung sebelum app.js, padahal murid tidak pernah memakainya. Berkas kecil
 * ini menggantikan keduanya di jalur boot:
 *
 *   - `previewAllowed()` tersedia seketika. isVerifiedTeacher() menanyakannya saat Home
 *     digambar pertama kali, jadi jawabannya tidak boleh menunggu jaringan.
 *   - `mount` / `render` / `ensureCss` meneruskan panggilan setelah modul penuh termuat.
 *     Modul penuh menimpa `window.FiezelTeacherShell` dengan objek aslinya, jadi setelah itu
 *     semua pemanggil langsung berbicara dengan shell sungguhan.
 *   - Perangkat guru (akun guru, fz_teacher_mode, peran 'guru') dan demo ?teacher=preview
 *     mulai memuat modul penuh SAAT BOOT, sejajar dengan app.js, supaya dasbor guru tetap
 *     muncul tanpa jeda yang terasa.
 *
 * Aturan previewAllowed() disalin dari fiezel-teacher-shell.js; keduanya harus sama persis
 * (dijaga tests/teacher-lazy-load-test.js).
 */
(function (root) {
  'use strict';
  if (!root || !root.document || root.FiezelTeacherShell) return;

  var BUNDLE = ['./features/teacher/fiezel-teacher-curriculum.js', './features/teacher/fiezel-teacher-shell.js'];
  var loading = null;

  function isTeacherRole() {
    try {
      var acc = (root.FiezelAccount && root.FiezelAccount.state && root.FiezelAccount.state()) || null;
      if (acc && acc.role === 'teacher') return true;
      if (root.FiezelAccount && root.FiezelAccount.isTeacher && root.FiezelAccount.isTeacher()) return true;
      if (root.localStorage && root.localStorage.getItem('fz_teacher_mode') === '1') return true;
      if (root.state && root.state.preferences && root.state.preferences.role === 'guru') return true;
      var st = root.FiezelTeacherStore && root.FiezelTeacherStore.load ? root.FiezelTeacherStore.load() : null;
      if (st && st.teacher && st.teacher.name && String(st.teacher.name).trim() !== '' && st.teacher.name !== 'Bu Sari') return true;
    } catch (_) {}
    return false;
  }
  function previewAllowed() {
    try {
      if (isTeacherRole()) return false;
      if (new URL(location.href).searchParams.get('teacher') === 'preview') sessionStorage.setItem('fz-teacher-preview', '1');
      return sessionStorage.getItem('fz-teacher-preview') === '1';
    } catch (_) { return false; }
  }
  function ensureCss() {
    try {
      var d = root.document; if (d.getElementById('fzTeacherCss')) return true;
      var l = d.createElement('link'); l.id = 'fzTeacherCss'; l.rel = 'stylesheet'; l.href = './features/teacher/teacher-shell.css';
      (d.head || d.documentElement).appendChild(l); return true;
    } catch (_) { return false; }
  }
  function withBuild(src) {
    var build = root.FIEZEL_PAGE_BUILD || (root.FiezelConfig && root.FiezelConfig.pageBuild) || '';
    return build ? src + '?v=' + encodeURIComponent(build) : src;
  }
  /** Muat kurikulum lalu shell, berurutan (shell membaca kurikulum saat diurai). */
  function load() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var i = 0;
      (function next() {
        if (i >= BUNDLE.length) {
          var real = root.FiezelTeacherShell;
          return real && real !== stub ? resolve(real) : reject(new Error('teacher_shell_missing'));
        }
        var s = root.document.createElement('script');
        s.src = withBuild(BUNDLE[i++]);
        s.async = false;
        s.onload = next;
        s.onerror = function () { loading = null; reject(new Error('teacher_bundle_failed')); };
        (root.document.head || root.document.documentElement).appendChild(s);
      }());
    });
    return loading;
  }
  function forward(name) {
    return function () {
      var args = arguments;
      return load().then(function (real) { return typeof real[name] === 'function' ? real[name].apply(real, args) : undefined; });
    };
  }

  var stub = {
    __lazy: true,
    previewAllowed: previewAllowed,
    ensureCss: ensureCss,
    ensureLoaded: load,
    mount: forward('mount'),
    render: forward('render'),
    exitPreview: forward('exitPreview'),
    // Belum ada yang terpasang sebelum modul penuh tiba, jadi tidak ada yang perlu dilepas.
    unmount: function () {}
  };
  root.FiezelTeacherShell = stub;
  root.FiezelTeacherLoader = { load: load, isTeacherRole: isTeacherRole, previewAllowed: previewAllowed, BUNDLE: BUNDLE.slice() };

  // Guru dan demo guru: mulai unduh sekarang, jangan menunggu tombol pertama.
  if (isTeacherRole() || previewAllowed()) load().catch(function () {});
}(typeof window !== 'undefined' ? window : null));
