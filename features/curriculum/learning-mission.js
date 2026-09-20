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
            hint: null, view: 'today', passport: null, busy: false, retryOf: null, t0: 0,
            offline: false, offUnit: null, offItems: [], offIdx: 0, offBenar: 0, offJawab: null,
            flushing: false };

  var CONF = [['yakin', 'Yakin'], ['lumayan', 'Lumayan yakin'], ['tidak', 'Tidak yakin']];
  var PHASES = ['warm-up', 'example', 'practice', 'challenge', 'transfer', 'check'];

  function t(kunci, cadangan) {
    var s;
    try { var I = root.FiezelI18n; s = I && I.t ? I.t(kunci) : undefined; } catch (_) {}
    return (s === undefined || s === kunci) ? cadangan : s;
  }

  /* F9 fase 1 (m025-354): MISI LURING. Keputusan owner: penuh-luring bertahap, identitas
     = sesi terakhir + konfirmasi (anti-bukti-nyasar di HP bersama), paket = seluruh bank
     teks otomatis (23 unit, nol gambar — tidak ada kuota yang dimakan diam-diam).
     Batas jujur fase 1: latihan dinilai di perangkat; antrean bukti dikirim sebagai
     question_answered idempoten (event_id stabil) — penguasaan/paspor tetap dihitung
     server (fase 2 = pipa penilaian backend, di luar pintu klien ini). */
  var SES_KEY = 'fiezel-mission-session-v1', PAS_KEY = 'fiezel-mission-passport-v1',
      QUEUE_KEY = 'fiezel-mission-queue-v1';

  function muatJSON(kunci) {
    try { return JSON.parse(localStorage.getItem(kunci) || 'null'); } catch (_) { return null; }
  }
  function simpanJSON(kunci, v) {
    try {
      if (v === null) localStorage.removeItem(kunci);
      else localStorage.setItem(kunci, JSON.stringify(v));
    } catch (_) {}
  }
  function uidOf(u) {
    if (!u) return null;
    return u.user_id || u.sub || u.id || u.name || null;
  }
  function muatAntre() {
    var q = muatJSON(QUEUE_KEY);
    return Array.isArray(q) ? q : [];
  }
  function kickLuring() {
    try { return root.FiezelCurriculum || null; } catch (_) { return null; }
  }

  // ---------------- boot ----------------
  function boot() {
    var token = E.token();

    function start(u) {
      S.user = u;
      S.offline = false;
      /* F9: bekukan sesi terakhir supaya mode luring tahu siapa yang memegang perangkat. */
      simpanJSON(SES_KEY, { u: u, at: new Date().toISOString() });
      loadToday();
    }

    function viaKelasKu() {
      var storedCode = '';
      try {
        var ob = JSON.parse(localStorage.getItem('fiezel-onboarding-v1') || '{}');
        storedCode = ob.classCode || '';
      } catch (_) {}
      return E.login.kelasku(storedCode || undefined).then(start).catch(function (e) {
        renderAuth(e.message);
      });
    }

    if (token) {
      E.login.me().then(start).catch(viaKelasKu);
    } else {
      viaKelasKu();
    }
  }

  /* Murid tidak mendaftar apa pun di sini.

     Layar ini dulu meminta email+sandi (akun ketiga bagi murid yang sudah punya
     akun KelasKu) atau Google. Keduanya dicabut: identitas datang dari akun
     KelasKu yang sama, dan satu-satunya yang perlu diketik murid adalah KODE
     KELAS dari gurunya — itu pun hanya sekali, saat pertama bergabung. */
  function renderAuth(err) {
    app.innerHTML =
      '<div class="auth-wrap"><div class="card ink rise">' +
      '<p class="kicker">FIEZEL · Misi Belajar</p>' +
      '<h1>Bukan sekadar mengerjakan soal.</h1>' +
      '<p class="muted">Kamu belajar satu kompetensi sampai benar-benar bisa dipakai — dengan jalur yang disesuaikan untukmu.</p>' +
      (err ? '<div class="issue error">' + esc(err) + '</div>' : '') +
      '<label class="f">Kode kelas dari guru (isi kalau ini pertama kalinya)<input id="joinCode" placeholder="FZ-XXXXXX" data-testid="join-code" autocomplete="off"></label>' +
      '<button class="btn primary" data-a="login" data-testid="login-btn">Masuk dengan akun KelasKu</button>' +
      /* F9: pintu luring hanya muncul bila ada sesi terakhir yang bisa dikonfirmasi —
         tanpa itu tidak ada identitas untuk mengikat bukti antre. */
      (function () {
        var snap = muatJSON(SES_KEY);
        var nm = snap && snap.u && (snap.u.name || snap.u.handle);
        if (!nm) return '';
        return '<div class="card" style="margin-top:12px" data-testid="offline-door"><p class="kicker">' +
          esc(t('kurikulum.luring-kicker', 'Mode luring')) + '</p><p class="muted">' +
          esc(t('kurikulum.luring-masuk-sub', 'Tanpa sinyal — latihan dari bank perangkat, dinilai di perangkat.')) + '</p>' +
          '<button class="btn ghost sm" data-a="offline" data-testid="offline-btn">' +
          esc(t('kurikulum.luring-masuk', 'Lanjut luring sebagai {nama}').replace('{nama}', nm)) + '</button></div>';
      })() +
      '<p class="muted" style="margin-top:16px;font-size:13px"><a href="./index.html#classroom" data-testid="link-app">' + t('kelas.kembali-kelasku-app', '‹ Kembali ke KelasKu di aplikasi FIEZEL') + '</a></p>' +
      '<p class="muted" style="font-size:13px">Guru masuk di <a href="./kurikulum.html">Ruang Guru</a>.</p>' +
      '</div></div>';
  }

  // ---------------- hari ini ----------------
  function loadToday() {
    if (window.location.hash === '#passport') {
      S.view = 'passport';
      S.passport = null;
      return render();
    }
    return api('/learning/today').then(function (t) {
      S.today = t; S.view = 'today'; S.offline = false; render();
      /* F9: bukti online = sinyal ada — kirim antrean luring yang menunggu. */
      kirimAntre(false);
    }).catch(function (e) {
      toast(e.message); renderAuth(e.message);
    });
  }

  function render() {
    if (!S.user) return renderAuth();
    if (S.view === 'session') return renderSession();
    if (S.view === 'summary') return renderSummary();
    if (S.view === 'passport') return renderPassport();
    if (S.view === 'offline-units') return renderOffUnits();
    if (S.view === 'offline-run') return renderOffRun();
    if (S.view === 'offline-done') return renderOffDone();
    return renderToday();
  }

  function shellTop(title, sub) {
    return '<div class="row between" style="margin-bottom:8px"><p class="kicker">FIEZEL · ' + esc(S.user.name || 'Murid') + '</p>' +
      '<div class="row">' +
      '<a href="./index.html#classroom" class="btn sm ghost" data-testid="back-to-kelasku" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px">' + t('kelas.kembali-kelasku', '‹ Kembali ke KelasKu') + '</a>' +
      '<button class="btn sm ghost" data-a="go-today" data-testid="go-today">Hari ini</button>' +
      '<button class="btn sm ghost" data-a="go-passport" data-testid="go-passport">Paspor Belajar</button>' +
      '<button class="btn sm ghost" data-a="logout" data-testid="logout-btn">Keluar</button></div></div>' +
      '<h1>' + esc(title) + '</h1>' + (sub ? '<p class="muted">' + esc(sub) + '</p>' : '');
  }

  function renderToday() {
    var t = S.today || { missions: [], due_reviews: [] };
    app.innerHTML = '<div class="mission" data-testid="today-view">' + shellTop('Misi belajarmu hari ini',
      t.missions.length ? 'Setiap misi punya tujuan, bukan sekadar tumpukan soal.' : 'Belum ada misi dari gurumu.') +
      antreBanner() +
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
    if (!p) {
      api('/learning/passport').then(function (r) {
        S.passport = r;
        /* F9: bekukan paspor terakhir untuk dibaca luring (dengan stempel waktu). */
        simpanJSON(PAS_KEY, { data: r, at: new Date().toISOString() });
        render();
      });
      app.innerHTML = '<div class="mission"><div class="card">Memuat paspor…</div></div>'; return;
    }
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
      /* F7 (m025-351): versi murid dari dokumen yang sama — tombolnya memanggil modul
         bersama yang dipakai guru, jadi narasi + angka tidak pernah menyimpang. */
      '<div class="card" data-testid="rapor-ortu-card"><p class="kicker">FIEZEL · Learning Passport</p><h3>' +
      esc(t('kurikulum.rapor-ortu-card-title', 'Rapor untuk orang tua')) + '</h3>' +
      '<p class="muted">' + esc(t('kurikulum.rapor-ortu-card-sub', 'Dokumen yang sama dibaca guru — unduh gambar untuk dibagikan, atau cetak.')) + '</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' +
      '<button class="btn primary sm" data-a="rapor-png" data-testid="rapor-png-btn">🖼️ ' + esc(t('kurikulum.rapor-png-btn', 'Unduh PNG')) + '</button>' +
      '<button class="btn ghost sm" data-a="rapor-print" data-testid="rapor-print-btn">🖨️ ' + esc(t('kurikulum.rapor-print-btn', 'Cetak / PDF')) + '</button></div></div>' +
      '<div class="card"><label class="f">Gabung kelas dengan kode guru<input id="joinCode3" placeholder="FZ-XXXXXX" data-testid="join-code-3"></label>' +
      '<button class="btn primary sm" data-a="join" data-testid="join-btn-3">Gabung</button></div></div>';
  }

  /* ---------------- F9: unit, runner, dan antrean luring ---------------- */

  function antreBanner() {
    var n = muatAntre().length;
    if (!n) return '';
    return '<div class="card tight" data-testid="antre-banner"><p class="kicker">' +
      esc(t('kurikulum.antre-judul', 'Bukti menunggu sinyal')) + '</p><p class="muted">' +
      esc(t('kurikulum.antre-isi', '{n} jawaban antre untuk dihitung server — belum masuk bukti penguasaan.').replace('{n}', n)) +
      '</p><button class="btn sm ghost" data-a="queue-flush" data-testid="queue-flush-btn">' +
      esc(t('kurikulum.antre-kirim', 'Kirim antrean')) + '</button></div>';
  }

  function acakSalin(arr) {
    var a = arr.slice(), i, j, tmp;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function renderOffUnits() {
    var CUR = kickLuring();
    var units = CUR ? CUR.allUnits().filter(function (u) { return u.items && u.items.length; }) : [];
    app.innerHTML = '<div class="mission" data-testid="offline-units-view">' +
      shellTop(t('kurikulum.luring-pilih-judul', 'Pilih unit latihan luring'),
        t('kurikulum.luring-pilih-sub', 'Dari bank offline di perangkat ini — {n} unit.').replace('{n}', units.length)) +
      '<div class="card tight"><p class="kicker">' + esc(t('kurikulum.luring-kicker', 'Mode luring')) + '</p><p class="muted">' +
      esc(t('kurikulum.luring-masuk-sub', 'Tanpa sinyal — latihan dari bank perangkat, dinilai di perangkat.')) + '</p></div>' +
      antreBanner() +
      (CUR ? units.map(function (u) {
        return '<div class="card" data-testid="off-unit-' + esc(u.id) + '"><div class="row between"><div><b>' +
          esc(u.title || u.id) + '</b><p class="muted">' + esc([u.genre, u.grade ? 'Kelas ' + u.grade : null].filter(Boolean).join(' · ') +
          ' · ' + u.items.length + ' ' + t('kurikulum.luring-butir', 'butir')) + '</p></div>' +
          '<button class="btn primary sm" data-a="off-unit" data-id="' + esc(u.id) + '">▶</button></div></div>';
      }).join('') : '<div class="card"><p class="muted">' +
        esc(t('kurikulum.luring-tanpa-modul', 'Bank unit belum termuat di halaman ini.')) + '</p></div>') + '</div>';
  }

  function renderOffRun() {
    var u = S.offUnit, items = S.offItems, i = S.offIdx, q = items[i];
    if (!u || !q) { S.view = 'offline-units'; return render(); }
    var jawab = S.offJawab;
    var benar = jawab !== null && jawab !== undefined && jawab === q.answer;
    app.innerHTML = '<div class="mission" data-testid="offline-run-view">' +
      shellTop(u.title || u.id, t('kurikulum.luring-soal-ke', 'Butir {i} dari {n}').replace('{i}', i + 1).replace('{n}', items.length)) +
      '<div class="card"><p style="font-size:17px;line-height:1.6">' + esc(q.prompt) + '</p>' +
      '<div class="opts">' + q.options.map(function (o, k) {
        var cls = jawab === null || jawab === undefined ? '' : (k === q.answer ? ' is-benar' : (k === jawab ? ' is-salah' : ' is-redup'));
        return '<button class="btn ghost' + cls + '" data-a="off-pick" data-l="' + k + '"' + (jawab !== null && jawab !== undefined ? ' disabled' : '') +
          '>' + esc(o) + '</button>';
      }).join('') + '</div>' +
      (jawab !== null && jawab !== undefined
        ? '<div class="card tight" style="margin-top:10px"><b>' + esc(benar ? t('kurikulum.luring-benar', 'Benar') : t('kurikulum.luring-salah', 'Kurang tepat')) + '</b>' +
          (q.marker ? '<p class="mono">' + esc(q.marker) + '</p>' : '') +
          '<p class="muted">' + esc((q.why && (q.why[String(q.answer)] || q.why[q.answer])) || q.note || '') + '</p>' +
          '<button class="btn primary sm" data-a="off-next" data-testid="off-next-btn">' +
          esc(i + 1 >= items.length ? t('kurikulum.luring-hasil', 'Lihat hasil') : t('kurikulum.luring-berikutnya', 'Berikutnya')) + '</button></div>'
        : '') + '</div></div>';
  }

  function renderOffDone() {
    var total = S.offItems.length, benar = S.offBenar, n = muatAntre().length;
    app.innerHTML = '<div class="mission" data-testid="offline-done-view">' +
      shellTop(t('kurikulum.luring-selesai-judul', 'Latihan luring selesai'),
        t('kurikulum.luring-skor', 'Skor {benar} dari {total}').replace('{benar}', benar).replace('{total}', total)) +
      antreBanner() +
      '<div class="card"><div class="row" style="gap:8px;flex-wrap:wrap">' +
      '<button class="btn primary sm" data-a="off-again" data-testid="off-again-btn">' + esc(t('kurikulum.luring-lagi', 'Ulangi unit ini')) + '</button>' +
      '<button class="btn ghost sm" data-a="off-units" data-testid="off-units-btn">' + esc(t('kurikulum.luring-ganti', 'Ganti unit')) + '</button>' +
      '<button class="btn ghost sm" data-a="queue-flush" data-testid="queue-flush-btn2">' + esc(t('kurikulum.antre-kirim', 'Kirim antrean')) + ' (' + n + ')</button>' +
      '</div></div></div>';
  }

  function dorongAntre(entri) {
    var q = muatAntre();
    q.push(entri);
    simpanJSON(QUEUE_KEY, q.slice(-500));
  }

  /* Mengirim antrean: pertama ke /offline-batch (F9 fase 2: paparan + aktivitas,
     bentuk payload sama seperti antrean fase 1). Bila backend lebih tua dan belum
     mengenal rute itu (404), jatuh kembali ke pengiriman per-event fase 1 — antrean
     tidak boleh terdampar oleh skew deploy. */
  function kirimAntre(manual) {
    if (S.flushing) return Promise.resolve(false);
    var q = muatAntre();
    if (!q.length || !S.user) return Promise.resolve(true);
    S.flushing = true;
    function selesai(sisa) {
      simpanJSON(QUEUE_KEY, sisa);
      S.flushing = false;
      if (manual) {
        toast(sisa.length
          ? t('kurikulum.antre-sisa', '{n} masih antre — coba lagi saat sinyal lebih baik.').replace('{n}', sisa.length)
          : t('kurikulum.antre-terkirim', 'Antrean terkirim.'));
      }
      if (S.user) render();
      return !sisa.length;
    }
    function warisan() {
      var sisa = [];
      var rantai = Promise.resolve();
      q.forEach(function (e) {
        rantai = rantai.then(function () {
          return api('/learning/events', { body: {
            type: 'question_answered',
            event_id: e.eid,
            payload: {
              question_id: e.itemId, unit_id: e.unitId, subchapter_id: e.sub || null,
              correct: e.correct ? 1 : 0, offline: true, at: e.at
            }
          } }).then(function (r) {
            if (!(r && (r.stored || r.reason === 'duplicate'))) sisa.push(e);
          }, function () { sisa.push(e); });
        });
      });
      return rantai.then(function () { return selesai(sisa); });
    }
    return api('/learning/offline-batch', { body: {
      attempts: q.map(function (e) {
        return {
          event_id: e.eid, static_item_id: e.itemId, unit_id: e.unitId,
          subchapter_id: e.sub || null, client_correct: !!e.correct, at: e.at
        };
      })
    } }).then(function (r) {
      var okSet = {};
      ((r && r.results) || []).forEach(function (x) {
        if (x && (x.status === 'stored' || x.status === 'duplicate')) okSet[x.event_id] = true;
      });
      var sisa = q.filter(function (e) { return !okSet[e.eid]; });
      /* Backend tua tanpa rute batch: seluruh antrean "gagal" sekaligus — warisan. */
      if (sisa.length === q.length && q.length) return warisan();
      return selesai(sisa);
    }, function (e) {
      if (e && (e.status === 404 || /404|tidak ditemukan/i.test(e.message || ''))) return warisan();
      return selesai(q);
    });
  }

  // ---------------- events ----------------
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  document.addEventListener('online', function () { kirimAntre(false); });

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-a]');
    if (!el) return;
    var a = el.getAttribute('data-a');
    if (a === 'login') {
      el.disabled = true;
      el.textContent = 'Menghubungkan ke KelasKu…';
      return E.login.kelasku(val('joinCode')).then(function (u) { S.user = u; loadToday(); })
        .catch(function (e) { renderAuth(e.message); });
    }
    if (a === 'logout') {
      /* F9: keluar = lupakan sesi & paspor perangkat (HP bersama). Antrean milik userId
         tetap — ia terkirim saat pemiliknya masuk lagi, bukan oleh pemegang berikutnya. */
      simpanJSON(SES_KEY, null); simpanJSON(PAS_KEY, null);
      return E.login.logout().then(function () { S.user = null; S.offline = false; renderAuth(); });
    }
    if (a === 'go-today') {
      if (S.offline) { S.view = 'offline-units'; return render(); }
      S.view = 'today'; return loadToday();
    }
    if (a === 'go-passport') { S.view = 'passport'; S.passport = null; return render(); }
    if (a === 'offline') {
      var snap = muatJSON(SES_KEY);
      if (!snap || !snap.u || !uidOf(snap.u)) return renderAuth('Sesi tidak ditemukan.');
      /* F9: konfirmasi implisit — tombolnya menyebut nama pemilik sesi, jadi bukti antre
         terikat pada identitas yang ditampilkan, bukan pada siapa pun yang memegang HP. */
      S.user = snap.u; S.offline = true; S.view = 'offline-units';
      return render();
    }
    if (a === 'off-units' || a === 'off-again') {
      if (a === 'off-again' && S.offUnit) {
        S.offItems = acakSalin(S.offUnit.items).slice(0, 6);
        S.offIdx = 0; S.offBenar = 0; S.offJawab = null; S.view = 'offline-run';
      } else S.view = 'offline-units';
      return render();
    }
    if (a === 'off-unit') {
      var CUR = kickLuring();
      var unit = null;
      if (CUR) {
        var semua = CUR.allUnits();
        for (var ui = 0; ui < semua.length; ui++) {
          if (String(semua[ui].id) === String(el.getAttribute('data-id'))) { unit = semua[ui]; break; }
        }
      }
      if (!unit || !unit.items || !unit.items.length) return;
      S.offUnit = unit;
      S.offItems = acakSalin(unit.items).slice(0, 6);
      S.offIdx = 0; S.offBenar = 0; S.offJawab = null; S.view = 'offline-run';
      return render();
    }
    if (a === 'off-pick') {
      if (S.offJawab !== null && S.offJawab !== undefined) return;
      var pilih = parseInt(el.getAttribute('data-l'), 10);
      var soal = S.offItems[S.offIdx];
      if (!soal || isNaN(pilih)) return;
      S.offJawab = pilih;
      var ok = pilih === soal.answer;
      if (ok) S.offBenar++;
      var uid = uidOf(S.user);
      var saat = new Date().toISOString();
      if (uid) {
        dorongAntre({
          v: 1, userId: uid, unitId: (S.offUnit && S.offUnit.id) || null, itemId: soal.id,
          sub: soal.subChapterId || null, correct: ok ? 1 : 0, at: saat,
          eid: 'offline:' + uid + ':' + soal.id + ':' + Date.parse(saat)
        });
      }
      return render();
    }
    if (a === 'off-next') {
      S.offJawab = null;
      if (S.offIdx + 1 >= S.offItems.length) S.view = 'offline-done';
      else S.offIdx++;
      return render();
    }
    if (a === 'queue-flush') { kirimAntre(true); return; }
    if (a === 'rapor-png' || a === 'rapor-print') {
      /* F7 (m025-351): ekspor sisi klien dari payload paspor murid sendiri. Tanpa payload
         tidak ada dokumen — gagal diam lebih buruk daripada tombol yang jujur. */
      var RS = root.FiezelRaporShare;
      if (!RS || !S.passport) return;
      var namaM = (S.passport.student_name || S.passport.name || (S.user && S.user.name));
      var dok = RS.ringkas({
        nama: namaM, kelas: S.passport.class_name, mapel: S.passport.subject_name,
        tanggal: RS.hariIni(), totals: S.passport.totals, rows: S.passport.rows,
        narasi: RS.narrative(namaM, S.passport.rows, S.passport.open_misconceptions)
      });
      if (!dok) return;
      if (a === 'rapor-png') { if (!RS.unduhPNG(dok)) toast(t('kurikulum.rapor-gagal-unduh', 'Gagal membuat gambar. Coba tombol Cetak.')); }
      else if (!RS.cetak(dok)) toast(t('kurikulum.rapor-gagal-cetak', 'Gagal membuka dialog cetak.'));
      return;
    }
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
