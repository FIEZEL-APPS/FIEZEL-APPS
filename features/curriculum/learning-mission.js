/**
 * FIEZEL — Misi Belajar murid (learning mission, bukan “ini 10 soal, kerjakan”).
 * Alur: goal → why → warm-up → contoh → latihan → tantangan → cek → review.
 * Bahasa manusia; tidak ada istilah teknis (BKT/FSRS) yang bocor ke murid.
 */
(function (root) {
  'use strict';
  var E = root.FZEngine, esc = E.esc, api = E.api, toast = E.toast;
  var app = document.getElementById('app');
  var S = { user: null, today: null, session: null, q: null, reason: null, phase: null,
            progress: null, picked: null, conf: null, feedback: null, summary: null,
            hint: null, view: 'today', passport: null, busy: false, retryOf: null, t0: 0 };

  var CONF = [['yakin', 'Yakin'], ['lumayan', 'Lumayan yakin'], ['tidak', 'Tidak yakin']];
  var PHASES = ['warm-up', 'example', 'practice', 'challenge', 'transfer', 'check'];

  // ---------------- boot: tangani callback Google lebih dulu ----------------
  function boot() {
    var hash = location.hash || '';
    if (hash.indexOf('session_id=') !== -1) {
      var sid = decodeURIComponent(hash.split('session_id=')[1].split('&')[0]);
      app.innerHTML = '<div class="auth-wrap"><div class="card">Menyiapkan akunmu…</div></div>';
      var code = '';
      try { code = sessionStorage.getItem('fz-join-code') || ''; } catch (_) {}
      return E.login.googleSession(sid, code).then(function (u) {
        history.replaceState(null, '', location.pathname);
        S.user = u; loadToday();
      }).catch(function (e) { history.replaceState(null, '', location.pathname); renderAuth(e.message); });
    }
    E.login.me().then(function (u) { S.user = u; loadToday(); }).catch(function () { renderAuth(); });
  }

  function renderAuth(err) {
    app.innerHTML =
      '<div class="auth-wrap"><div class="card ink rise">' +
      '<p class="kicker">FIEZEL · Misi Belajar</p>' +
      '<h1>Bukan sekadar mengerjakan soal.</h1>' +
      '<p class="muted">Kamu belajar satu kompetensi sampai benar-benar bisa dipakai — dengan jalur yang disesuaikan untukmu.</p>' +
      (err ? '<div class="issue error">' + esc(err) + '</div>' : '') +
      '<div class="row" style="margin-bottom:14px"><button class="btn sm" data-a="tab" data-t="login" data-testid="tab-login">Masuk</button>' +
      '<button class="btn sm ghost" data-a="tab" data-t="register" data-testid="tab-register">Daftar</button></div>' +
      '<div id="authBox">' + (S.authTab === 'register' ? registerForm() : loginForm()) + '</div>' +
      '<hr style="border:none;border-top:1px solid var(--line);margin:18px 0">' +
      '<label class="f">Kode kelas dari guru (opsional)<input id="joinCode" placeholder="FZ-XXXXXX" data-testid="join-code"></label>' +
      '<button class="btn clay" data-a="google" data-testid="google-btn">Masuk dengan Google</button>' +
      '<p class="muted" style="margin-top:14px;font-size:13px">Guru masuk di <a href="./kurikulum.html">Ruang Guru</a>.</p>' +
      '</div></div>';
  }

  function loginForm() {
    return '<label class="f">Email<input id="em" type="email" data-testid="login-email"></label>' +
      '<label class="f">Sandi<input id="pw" type="password" data-testid="login-password"></label>' +
      '<button class="btn primary" data-a="login" data-testid="login-btn">Masuk FIEZEL</button>';
  }
  function registerForm() {
    return '<label class="f">Nama<input id="nm" data-testid="reg-name"></label>' +
      '<label class="f">Email<input id="em" type="email" data-testid="reg-email"></label>' +
      '<label class="f">Sandi (min 6)<input id="pw" type="password" data-testid="reg-password"></label>' +
      '<label class="f">Kode kelas (opsional)<input id="cc" placeholder="FZ-XXXXXX" data-testid="reg-class-code"></label>' +
      '<button class="btn primary" data-a="register" data-testid="register-btn">Buat akun</button>';
  }

  // ---------------- hari ini ----------------
  function loadToday() {
    return api('/learning/today').then(function (t) { S.today = t; S.view = 'today'; render(); }).catch(function (e) {
      toast(e.message); renderAuth(e.message);
    });
  }

  function render() {
    if (!S.user) return renderAuth();
    if (S.view === 'session') return renderSession();
    if (S.view === 'summary') return renderSummary();
    if (S.view === 'passport') return renderPassport();
    return renderToday();
  }

  function shellTop(title, sub) {
    return '<div class="row between" style="margin-bottom:8px"><p class="kicker">FIEZEL · ' + esc(S.user.name || 'Murid') + '</p>' +
      '<div class="row"><button class="btn sm ghost" data-a="go-today" data-testid="go-today">Hari ini</button>' +
      '<button class="btn sm ghost" data-a="go-passport" data-testid="go-passport">Paspor Belajar</button>' +
      '<button class="btn sm ghost" data-a="logout" data-testid="logout-btn">Keluar</button></div></div>' +
      '<h1>' + esc(title) + '</h1>' + (sub ? '<p class="muted">' + esc(sub) + '</p>' : '');
  }

  function renderToday() {
    var t = S.today || { missions: [], due_reviews: [] };
    app.innerHTML = '<div class="mission" data-testid="today-view">' + shellTop('Misi belajarmu hari ini',
      t.missions.length ? 'Setiap misi punya tujuan, bukan sekadar tumpukan soal.' : 'Belum ada misi dari gurumu.') +
      (t.missions.length ? t.missions.map(function (m, i) {
        return '<div class="card rise" style="--d:' + (i * 70) + 'ms" data-testid="mission-' + esc(m.assessment_id) + '">' +
          '<div class="row between"><span class="pill info">' + esc(m.type_label || m.type) + '</span>' +
          (m.session ? '<span class="pill ' + (m.session.state === 'finished' ? 'good' : 'warn') + '">' + (m.session.state === 'finished' ? 'selesai' : 'lanjutkan · ' + m.session.answered + ' soal') + '</span>' : '<span class="pill mute">baru</span>') + '</div>' +
          '<h3 style="margin-top:8px">' + esc(m.title) + '</h3>' +
          '<p class="muted">Tujuan hari ini: ' + esc((m.goal || []).join('; ') || '-') + '</p>' +
          '<p class="muted" style="font-size:13.5px">' + esc(m.purpose || '') + '</p>' +
          '<p class="mono muted">' + m.question_count + ' soal · ±' + m.minutes + ' menit' + (m.deadline ? ' · tenggat ' + esc(m.deadline) : '') + '</p>' +
          '<button class="btn primary" data-a="start" data-id="' + esc(m.assessment_id) + '" data-testid="start-' + esc(m.assessment_id) + '">' +
          (m.session && m.session.state !== 'finished' ? 'Lanjutkan misi' : m.session ? 'Ulangi misi' : 'Mulai misi') + '</button></div>';
      }).join('') : '<div class="card"><p>Belum ada misi. Minta gurumu mengirim latihan, atau masukkan kode kelas di Paspor Belajar.</p>' +
        '<label class="f">Kode kelas<input id="joinCode2" placeholder="FZ-XXXXXX" data-testid="join-code-2"></label>' +
        '<button class="btn primary sm" data-a="join" data-testid="join-btn">Gabung kelas</button></div>') +
      (t.due_reviews && t.due_reviews.length ? '<div class="card accent" data-testid="due-reviews"><p class="kicker">Waktunya mengingat ulang</p>' +
        '<p>Beberapa hal yang sudah kamu kuasai mulai rawan lupa. Mengulang sekarang jauh lebih hemat tenaga daripada belajar ulang nanti.</p>' +
        '<ul>' + t.due_reviews.map(function (d) { return '<li>' + esc(d.name || d.competency_id) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</div>';
  }

  // ---------------- sesi ----------------
  function startMission(id) {
    S.busy = true;
    api('/learning/sessions/start', { body: { assessment_id: id } }).then(function (ses) {
      S.session = ses; S.view = 'session'; S.feedback = null; S.summary = null;
      return nextQuestion();
    }).catch(function (e) { toast(e.message); }).then(function () { S.busy = false; });
  }

  function nextQuestion() {
    return api('/learning/sessions/' + S.session.id + '/next').then(function (d) {
      if (d.done) { S.summary = d.summary; S.view = 'summary'; return render(); }
      S.q = d.question; S.reason = d.reason; S.phase = d.phase; S.progress = d.progress;
      S.picked = null; S.conf = null; S.feedback = null; S.hint = null; S.t0 = Date.now();
      render();
    });
  }

  function renderSession() {
    var m = (S.session && S.session.mission) || {};
    var q = S.q;
    if (!q) { app.innerHTML = '<div class="mission"><div class="card">Menyiapkan soal…</div></div>'; return; }
    app.innerHTML = '<div class="mission" data-testid="session-view">' +
      shellTop(m.type_label ? 'Misi: ' + m.type_label : 'Misi belajar') +
      '<div class="card ink" data-testid="mission-header"><p class="kicker">Tujuan hari ini</p>' +
      '<h3>' + esc((m.today_goal || []).join('; ')) + '</h3>' +
      '<p class="muted">' + esc(m.why_this_matters || '') + '</p>' +
      '<div class="phases">' + PHASES.map(function (p) {
        return '<span class="' + (p === S.phase ? 'on' : '') + '">' + esc(p) + '</span>';
      }).join('') + '</div>' +
      '<span class="bar"><i style="width:' + Math.round(100 * (S.progress.answered / Math.max(1, S.progress.target))) + '%"></i></span>' +
      '<p class="mono muted">' + S.progress.answered + ' / ' + S.progress.target + ' soal · ' + S.progress.correct + ' benar</p></div>' +

      '<div class="qcard rise" data-testid="question-card">' +
      (S.reason ? '<div class="why" data-testid="why-this-question">' + esc(S.reason) + '</div>' : '') +
      (q.is_transfer ? '<span class="pill clay" style="background:rgba(232,160,107,.18);color:var(--clay)">Situasi baru</span>' : '') +
      '<p class="stem" data-testid="question-stem">' + esc(q.stem) + '</p>' +
      (q.options && q.options.length ? '<div class="opts">' + q.options.map(function (o, i) {
        var letter = String.fromCharCode(65 + i);
        var cls = 'opt' + (S.picked === letter ? ' sel' : '');
        if (S.feedback) {
          if (S.feedback.answer_key && S.feedback.answer_key.toUpperCase() === letter) cls += ' right';
          else if (S.picked === letter && S.feedback.correct === false) cls += ' wrong';
        }
        return '<button class="' + cls + '" data-a="pick" data-l="' + letter + '" data-testid="opt-' + letter + '"' + (S.feedback ? ' disabled' : '') + '><em>' + letter + '</em><span>' + esc(o) + '</span></button>';
      }).join('') + '</div>'
        : '<label class="f">Jawabanmu<input id="freeAns" data-testid="free-answer"' + (S.feedback ? ' disabled' : '') + '></label>') +

      (!S.feedback ? '<div style="margin-top:18px"><p class="kicker">Seberapa yakin kamu?</p><div class="conf">' +
        CONF.map(function (c) {
          return '<button class="btn sm' + (S.conf === c[0] ? ' primary' : ' ghost') + '" data-a="conf" data-c="' + c[0] + '" data-testid="conf-' + c[0] + '">' + c[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="row" style="margin-top:16px">' +
        '<button class="btn primary" data-a="submit" data-testid="submit-btn"' + (S.picked || q.question_type !== 'mcq' ? '' : ' disabled') + '>Kirim jawaban</button>' +
        (q.has_hint ? '<button class="btn ghost sm" data-a="hint" data-testid="hint-btn">Minta petunjuk</button>' : '') +
        '</div>' + (S.hint ? '<div class="issue info" data-testid="hint-text">' + esc(S.hint) + '</div>' : '') + '</div>' : '') +

      (S.feedback ? feedbackHtml() : '') +
      '</div></div>';
  }

  function feedbackHtml() {
    var f = S.feedback;
    var ok = f.correct === true;
    return '<div class="feedback ' + (ok ? 'ok' : f.correct === false ? 'no' : '') + '" data-testid="feedback">' +
      '<p class="kicker">' + (ok ? 'Benar' : f.correct === false ? 'Belum tepat' : 'Terkirim') + '</p>' +
      '<p><b>' + esc(f.diagnosis.message) + '</b></p>' +
      (f.explanation ? '<p data-testid="explanation">' + esc(f.explanation) + '</p>' : '') +
      (f.learner_state ? '<p class="mono muted" data-testid="learner-state">Kemajuanmu di kompetensi ini: ' + esc(f.learner_state.state_label) + ' · ' + f.learner_state.progress_pct + '%</p>' : '') +
      (f.next_action && f.next_action.reason ? '<div class="why" data-testid="next-action-reason">' + esc(f.next_action.reason) + '</div>' : '') +
      '<button class="btn primary" data-a="continue" data-testid="continue-btn">' +
      (f.next_action && f.next_action.kind === 'targeted_retry' ? 'Coba soal serupa'
        : f.next_action && f.next_action.kind === 'micro_remediation' ? 'Perkuat dasarnya dulu' : 'Lanjut') + '</button></div>';
  }

  function submitAnswer() {
    var q = S.q;
    var ans = q.options && q.options.length ? (S.picked || '') : (document.getElementById('freeAns') || {}).value || '';
    if (!ans) return toast('Pilih atau tulis jawabanmu dulu.');
    S.busy = true;
    return api('/learning/sessions/' + S.session.id + '/answer', {
      body: { question_id: q.question_id, answer: ans, confidence: S.conf,
              time_ms: Date.now() - S.t0, retry_of: S.retryOf || null }
    }).then(function (res) {
      S.busy = false;
      if (res.duplicate) return nextQuestion();
      S.feedback = res;
      S.retryOf = res.next_action && res.next_action.retry_of ? res.next_action.retry_of : null;
      render();
    }).catch(function (e) { S.busy = false; toast(e.message); });
  }

  function continueLoop() {
    var na = S.feedback && S.feedback.next_action;
    if (na && na.question) {
      S.q = na.question; S.reason = na.reason;
      S.phase = na.kind === 'micro_remediation' ? 'warm-up' : 'practice';
      S.picked = null; S.conf = null; S.feedback = null; S.hint = null; S.t0 = Date.now();
      S.progress.answered = S.progress.answered; return render();
    }
    S.retryOf = null;
    return nextQuestion();
  }

  function renderSummary() {
    var s = S.summary || {};
    app.innerHTML = '<div class="mission" data-testid="summary-view">' + shellTop('Misi selesai') +
      '<div class="card accent"><p class="kicker">Ringkasan</p>' +
      '<h2>' + s.correct + ' dari ' + s.answered + ' benar</h2>' +
      '<p class="muted">Petunjuk dipakai ' + (s.hints || 0) + 'x · percobaan ulang ' + (s.retries || 0) + 'x' +
      (s.transfer && s.transfer.attempts ? ' · situasi baru ' + s.transfer.correct + '/' + s.transfer.attempts : '') + '</p>' +
      '<p>' + esc(s.next_step || '') + '</p></div>' +
      '<div class="card"><p class="kicker">Kompetensi yang kamu sentuh hari ini</p>' +
      (s.competency_states || []).map(function (c) {
        return '<div class="row between" style="border-top:1px solid rgba(42,63,53,.5);padding:8px 0"><span>' + esc(c.name) + '</span>' +
          '<span class="row"><span class="bar" style="width:120px"><i style="width:' + c.progress_pct + '%"></i></span>' +
          '<span class="pill ' + (['MASTERED', 'RETAINED', 'TRANSFERRED'].indexOf(c.state) !== -1 ? 'good' : c.state === 'DEVELOPING' ? 'warn' : 'mute') + '">' + esc(c.state_label) + '</span></span></div>';
      }).join('') + '</div>' +
      '<div class="row"><button class="btn primary" data-a="go-today" data-testid="back-today">Kembali ke misi</button>' +
      '<button class="btn ghost" data-a="go-passport">Lihat Paspor Belajar</button></div></div>';
  }

  function renderPassport() {
    var p = S.passport;
    if (!p) { api('/learning/passport').then(function (r) { S.passport = r; render(); }); app.innerHTML = '<div class="mission"><div class="card">Memuat paspor…</div></div>'; return; }
    app.innerHTML = '<div class="mission" data-testid="passport-view">' + shellTop('Paspor Belajarmu', 'Bukti perkembangan, bukan sekadar nilai.') +
      '<div class="row">' + [['Kompetensi', p.totals.competencies], ['Dikuasai', p.totals.mastered], ['Masih ingat', p.totals.retained], ['Bisa diterapkan', p.totals.transferred]].map(function (t) {
        return '<div class="card tight kpi" style="flex:1 1 140px"><small>' + t[0] + '</small><b>' + t[1] + '</b></div>';
      }).join('') + '</div>' +
      (p.rows.length ? p.rows.map(function (r) {
        return '<div class="card"><div class="row between"><b>' + esc(r.tp_name || r.tp_code || '-') + '</b><span class="pill mute">' + r.mastery_pct + '%</span></div>' +
          r.competencies.map(function (c) {
            return '<div class="row between" style="border-top:1px solid rgba(42,63,53,.5);padding:7px 0"><span>' + esc(c.name) + '</span>' +
              '<span class="pill ' + (['MASTERED', 'RETAINED', 'TRANSFERRED'].indexOf(c.state) !== -1 ? 'good' : c.state === 'DEVELOPING' ? 'warn' : 'mute') + '">' + esc(c.state_label) + '</span></div>';
          }).join('') +
          (r.next_target ? '<p class="mono" style="color:var(--clay)">Berikutnya: ' + esc(r.next_target) + '</p>' : '') + '</div>';
      }).join('') : '<div class="card"><p class="muted">Belum ada evidence. Mulai satu misi dan paspormu akan terisi.</p></div>') +
      '<div class="card"><label class="f">Gabung kelas dengan kode guru<input id="joinCode3" placeholder="FZ-XXXXXX" data-testid="join-code-3"></label>' +
      '<button class="btn primary sm" data-a="join" data-testid="join-btn-3">Gabung</button></div></div>';
  }

  // ---------------- events ----------------
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-a]');
    if (!el) return;
    var a = el.getAttribute('data-a');
    if (a === 'tab') { S.authTab = el.getAttribute('data-t'); return renderAuth(); }
    if (a === 'login') {
      return E.login.studentLogin(val('em'), val('pw')).then(function (u) { S.user = u; loadToday(); })
        .catch(function (e) { renderAuth(e.message); });
    }
    if (a === 'register') {
      return E.login.studentRegister({ email: val('em'), password: val('pw'), name: val('nm') || 'Murid',
                                       class_code: val('cc') || null })
        .then(function (u) { S.user = u; loadToday(); }).catch(function (e) { S.authTab = 'register'; renderAuth(e.message); });
    }
    if (a === 'google') {
      try { sessionStorage.setItem('fz-join-code', val('joinCode') || ''); } catch (_) {}
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      var redirectUrl = window.location.origin + '/misi.html';
      window.location.href = 'https://auth.emergentagent.com/?redirect=' + encodeURIComponent(redirectUrl);
      return;
    }
    if (a === 'logout') return E.login.logout().then(function () { S.user = null; renderAuth(); });
    if (a === 'go-today') { S.view = 'today'; return loadToday(); }
    if (a === 'go-passport') { S.view = 'passport'; S.passport = null; return render(); }
    if (a === 'join') {
      var code = val('joinCode2') || val('joinCode3');
      if (!code) return toast('Masukkan kode kelas.');
      return api('/auth/join-class', { body: { class_code: code } })
        .then(function () { toast('Berhasil gabung kelas.'); loadToday(); }).catch(function (e) { toast(e.message); });
    }
    if (a === 'start') return startMission(el.getAttribute('data-id'));
    if (a === 'pick') { S.picked = el.getAttribute('data-l'); return render(); }
    if (a === 'conf') { S.conf = el.getAttribute('data-c'); return render(); }
    if (a === 'submit') { if (S.busy) return; return submitAnswer(); }
    if (a === 'continue') return continueLoop();
    if (a === 'hint') {
      return api('/learning/sessions/' + S.session.id + '/hint', { method: 'POST', body: {} })
        .then(function (h) { S.hint = h.hint; render(); }).catch(function (e) { toast(e.message); });
    }
  });

  boot();
})(window);
