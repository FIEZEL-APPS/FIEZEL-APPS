/**
 * Klien API bersama untuk Curriculum/Question/Assessment/Learning Engine.
 *
 * ALAMATNYA DARI KONFIGURASI, BUKAN SAME-ORIGIN. Berkas ini dulu memanggil
 * fetch('/api' + path) — "cari backend di domain yang sama". Asumsi itu benar di
 * lingkungan tempat berkas ini lahir (ingress mengarahkan /api ke FastAPI port 8001) dan
 * SALAH di produksi FIEZEL: fiezel.my.id adalah hosting statis, dan owner memeriksanya
 * sendiri pada 7 September 2026 — /api/health menjawab 404, jadi seluruh konsol mati.
 *
 * Backend FIEZEL yang sudah hidup tidak pernah memakai asumsi itu: fiezel-core-worker
 * dipanggil lewat CORE_CONFIG.workerUrl, alamat absolut dari konfigurasi. Berkas ini
 * kini mengikuti pola yang sama, karena pola itu yang terbukti bekerja di produksi ini.
 *
 * Alamat kosong = backend belum dipasang. Panggilan ditolak SEBELUM menyentuh jaringan,
 * dengan kalimat yang menyebut sebabnya - bukan menembak halaman statis lalu memunculkan
 * galat penguraian JSON yang tidak memberi tahu siapa pun apa yang sebenarnya salah.
 */
(function (root) {
  'use strict';
  var TOKEN_KEY = 'fz-engine-token';

  /* Satu pembaca alamat untuk seluruh berkas. Slash di ekor dibuang supaya
     base() + '/auth/login' tidak pernah menghasilkan '//auth/login'. */
  function base() {
    try {
      var c = root.FIEZEL_CURRICULUM_CONFIG || {};
      return String(c.curriculumApiUrl || '').trim().replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (_) {} }

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token()) headers['Authorization'] = 'Bearer ' + token();
    var akar = base();
    if (!akar) {
      /* Gagal cepat dan jujur. Ini satu-satunya tempat yang tahu alamatnya kosong, jadi
         di sinilah kalimatnya harus lahir. */
      return Promise.reject(new Error(
        'Konsol kurikulum belum dikonfigurasi: alamat backend (curriculumApiUrl) masih kosong di core-config.js.'));
    }
    return fetch(akar + '/api' + path, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      credentials: 'include',
      headers: headers,
      body: opts.body instanceof FormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined)
    }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      var p = ct.indexOf('json') !== -1 ? r.json() : r.text();
      return p.then(function (data) {
        if (!r.ok) {
          var detail = data && data.detail;
          var msg = typeof detail === 'string' ? detail
            : Array.isArray(detail) ? detail.map(function (e) { return e.msg || JSON.stringify(e); }).join(' ')
            : detail && detail.message ? detail.message : ('Gagal (' + r.status + ')');
          var err = new Error(msg); err.status = r.status; err.data = data; throw err;
        }
        return data;
      });
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
    });
  }

  function toast(text) {
    var el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('data-testid', 'toast'); el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function pct(v) { return v == null ? '—' : Math.round(v) + '%'; }

  root.FZEngine = {
    api: api, esc: esc, toast: toast, pct: pct, token: token, setToken: setToken,
    login: {
      teacherToken: function (tok, name) {
        return api('/auth/teacher/token', { body: { token: tok, name: name } })
          .then(function (u) { setToken(u.access_token); return u; });
      },
      studentLogin: function (email, password) {
        return api('/auth/login', { body: { email: email, password: password } })
          .then(function (u) { setToken(u.access_token); return u; });
      },
      studentRegister: function (payload) {
        return api('/auth/register', { body: payload }).then(function (u) { setToken(u.access_token); return u; });
      },
      googleSession: function (sessionId, classCode) {
        return api('/auth/google/session', { body: { session_id: sessionId, class_code: classCode || null } })
          .then(function (u) { setToken(u.access_token); return u; });
      },
      me: function () { return api('/auth/me'); },
      logout: function () { return api('/auth/logout', { method: 'POST', body: {} }).then(function () { setToken(''); }); }
    }
  };
})(window);
