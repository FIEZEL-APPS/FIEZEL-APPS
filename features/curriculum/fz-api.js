/**
 * Klien API bersama untuk Curriculum/Question/Assessment/Learning Engine.
 * Same-origin: /api diarahkan ingress ke backend FastAPI (port 8001).
 */
(function (root) {
  'use strict';
  var TOKEN_KEY = 'fz-engine-token';

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (_) {} }

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token()) headers['Authorization'] = 'Bearer ' + token();
    return fetch('/api' + path, {
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
