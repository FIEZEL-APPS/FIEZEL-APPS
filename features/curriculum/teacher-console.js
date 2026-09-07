/**
 * FIEZEL — Konsol Kurikulum & Kompetensi (Ruang Guru).
 * Guru menentukan GOAL (kompetensi), Braincore mengoptimalkan PATH.
 * Semua data dari server (source of truth) via /api.
 */
(function (root) {
  'use strict';
  var E = root.FZEngine, esc = E.esc, api = E.api, toast = E.toast;
  var app = document.getElementById('app');
  var S = {
    user: null, classes: [], cls: null, view: 'copilot', tree: null, coverage: null,
    recs: null, questions: [], reviewQueue: [], tps: [], comps: [], assessments: [],
    drawer: null, modal: null, plan: null, groups: null, busy: false, health: null, blueprintCheck: null
  };

  var NAV = [
    ['copilot', 'Kopilot Guru'], ['coverage', 'Cakupan Kurikulum'], ['curriculum', 'Struktur Kurikulum'],
    ['bank', 'Bank Soal'], ['assessment', 'Asesmen'], ['students', 'Murid & Paspor']
  ];

  // ---------------- boot ----------------
  function boot() {
    E.login.me().then(start).catch(function () { renderAuth(); });
  }

  function renderAuth(err) {
    app.innerHTML =
      '<div class="auth-wrap"><div class="card ink rise">' +
      '<p class="kicker">FIEZEL · Ruang Guru</p>' +
      '<h1>Kurikulum yang benar-benar dipelajari.</h1>' +
      '<p class="muted">Masuk dengan token guru yang diberikan owner FIEZEL. Tidak ada pendaftaran mandiri — akses guru dikendalikan owner.</p>' +
      (err ? '<div class="issue error">' + esc(err) + '</div>' : '') +
      '<label class="f">Token guru<input id="tok" placeholder="FZG-XXXXXXXX" data-testid="teacher-token-input" autocomplete="off"></label>' +
      '<label class="f">Nama panggilan<input id="tnm" placeholder="Bu Rina" data-testid="teacher-name-input"></label>' +
      '<button class="btn primary" data-a="login" data-testid="teacher-login-btn">Masuk Ruang Guru</button>' +
      '<p class="muted" style="margin-top:16px;font-size:13px">Murid masuk di halaman <a href="./misi.html" data-testid="link-student">Misi Belajar</a>.</p>' +
      '</div></div>';
  }

  function start(user) {
    S.user = user;
    api('/classes').then(function (list) {
      S.classes = list;
      if (!list.length) {
        return api('/seed/bootstrap', { body: {} }).then(function (r) {
          S.classes = [r.class]; S.cls = r.class;
          toast('Kurikulum Merdeka & bank soal contoh disiapkan.');
        });
      }
      S.cls = list[0];
    }).then(loadContext).then(render).catch(function (e) { renderAuth(e.message); });
  }

  function loadContext() {
    return Promise.all([
      api('/curriculum/nodes?type=tp'),
      api('/curriculum/competencies')
    ]).then(function (r) { S.tps = r[0]; S.comps = r[1]; });
  }

  // ---------------- kerangka ----------------
  function render() {
    if (!S.user) return renderAuth();
    app.innerHTML =
      '<div class="shell"><aside class="side">' +
      '<div class="brand"><span class="brand-mark">F</span><div><b>FIEZEL</b><small>Kurikulum & Kompetensi</small></div></div>' +
      (S.classes.length ? '<label class="f">Kelas aktif<select data-a="pick-class" data-testid="class-select">' +
        S.classes.map(function (c) { return '<option value="' + c.id + '"' + (S.cls && c.id === S.cls.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
        '</select></label>' : '') +
      '<nav class="nav">' + NAV.map(function (n) {
        return '<button data-a="view" data-v="' + n[0] + '" class="' + (S.view === n[0] ? 'on' : '') + '" data-testid="nav-' + n[0] + '">' + n[1] + '</button>';
      }).join('') + '</nav>' +
      '<div class="stack"><button class="btn sm ghost" data-a="new-class" data-testid="new-class-btn">+ Kelas baru</button>' +
      '<a class="btn sm ghost" href="./misi.html" data-testid="link-mission">Buka Misi Belajar murid</a>' +
      '<a class="btn sm ghost" href="./index.html">← Aplikasi FIEZEL</a>' +
      '<button class="btn sm ghost" data-a="logout" data-testid="logout-btn">Keluar</button></div>' +
      '<p class="muted mono" style="margin-top:22px">' + esc(S.user.name || '') + ' · ' + esc(S.user.role) + '</p>' +
      '</aside><main class="main" data-testid="teacher-console">' + view() + '</main></div>' +
      (S.drawer ? '<div class="scrim" data-a="close"></div><aside class="drawer" data-testid="drawer">' + S.drawer + '</aside>' : '') +
      (S.modal ? '<div class="scrim" data-a="close"></div><div class="modal" data-testid="modal">' + S.modal + '</div>' : '');
  }

  function view() {
    if (!S.cls) return '<div class="card">Belum ada kelas. Buat kelas baru untuk mulai.</div>';
    return ({ copilot: vCopilot, coverage: vCoverage, curriculum: vCurriculum, bank: vBank,
              assessment: vAssessment, students: vStudents }[S.view] || vCopilot)();
  }

  function head(kicker, title, sub) {
    return '<div class="topline"><div><p class="kicker">' + esc(kicker) + '</p><h1>' + esc(title) + '</h1>' +
      (sub ? '<p class="muted">' + esc(sub) + '</p>' : '') + '</div></div>';
  }

  // ---------------- 1. Kopilot ----------------
  function vCopilot() {
    if (!S.coverage) { loadCoverage(); return head('Kopilot', 'Menyiapkan intelijen kelas…') + '<div class="card">Memuat evidence…</div>'; }
    if (!S.recs) { loadRecs(); }
    var rows = S.coverage.rows, total = rows.length;
    var missing = rows.filter(function (r) { return r.status === 'MISSING' || r.status === 'NOT_TAUGHT'; }).length;
    var gap = rows.filter(function (r) { return r.status === 'GAP'; }).length;
    var good = rows.filter(function (r) { return r.status === 'GOOD'; }).length;
    var avg = rows.filter(function (r) { return r.mastery_pct != null; });
    var mastery = avg.length ? Math.round(avg.reduce(function (a, b) { return a + b.mastery_pct; }, 0) / avg.length) : null;
    return head('Kopilot Guru', 'Apa yang harus saya lakukan sekarang?',
      'Rekomendasi dibangun dari evidence nyata kelas ' + S.cls.name + ' — bukan template.') +
      '<div class="grid g4">' +
      kpi('TP dipantau', total, 0) + kpi('Belum diajarkan / tanpa soal', missing, 60) +
      kpi('Sudah diajarkan, belum dikuasai', gap, 120) + kpi('Rata-rata penguasaan', mastery == null ? '—' : mastery + '%', 180) +
      '</div>' +
      '<div class="card accent rise" style="--d:220ms" data-testid="recommendations">' +
      '<p class="kicker">3 tindakan paling disarankan hari ini</p>' +
      (S.recs ? (S.recs.length ? S.recs.map(function (r, i) {
        return '<div class="card tight" style="margin-top:12px" data-testid="rec-' + i + '">' +
          '<div class="row between"><b>' + esc(r.title) + '</b><span class="pill ' +
          (r.kind === 'remedial' ? 'bad' : r.kind === 'enrichment' ? 'good' : r.kind === 'curriculum_gap' ? 'mute' : 'warn') +
          '">' + esc(r.kind) + '</span></div>' +
          '<p class="muted" style="margin:6px 0">' + esc(r.why) + '</p>' +
          (r.student_names && r.student_names.length ? '<p class="mono muted">' + esc(r.student_names.filter(Boolean).join(', ')) + '</p>' : '') +
          '<div class="row">' + (r.actions || []).map(function (a, j) {
            return '<button class="btn ' + (j === 0 ? 'primary' : 'ghost') + ' sm" data-a="exec-rec" data-i="' + i + '" data-j="' + j + '" data-testid="rec-' + i + '-action-' + j + '">' + esc(a.label) + '</button>';
          }).join('') + '</div></div>';
      }).join('') : '<p class="muted">Belum ada evidence yang cukup untuk merekomendasikan tindakan.</p>')
        : '<p class="muted">Menghitung rekomendasi…</p>') + '</div>' +
      '<div class="grid g2">' +
      '<div class="card rise" style="--d:280ms" data-testid="lesson-plan-card"><p class="kicker">Rencana mengajar pintar</p>' +
      '<h3>Susun jam pelajaran dari evidence kelas</h3>' +
      '<div class="row"><label class="f" style="flex:1 1 200px">Target TP<select id="planTp" data-testid="plan-tp">' + tpOptions() + '</select></label>' +
      '<label class="f" style="width:120px">Durasi (menit)<input id="planMin" type="number" value="45" data-testid="plan-minutes"></label></div>' +
      '<button class="btn primary sm" data-a="make-plan" data-testid="make-plan-btn">Buat rencana</button>' +
      (S.plan ? planHtml(S.plan) : '') + '</div>' +
      '<div class="card rise" style="--d:340ms" data-testid="groups-card"><p class="kicker">Kelompok dinamis</p>' +
      '<h3>Kelompok berbasis bukti, bukan tebakan</h3>' +
      '<label class="f">TP<select id="grpTp" data-testid="group-tp">' + tpOptions() + '</select></label>' +
      '<button class="btn primary sm" data-a="make-groups" data-testid="make-groups-btn">Bentuk kelompok</button>' +
      (S.groups ? S.groups.groups.map(function (g, i) {
        return '<div class="card tight" style="margin-top:10px" data-testid="group-' + i + '"><div class="row between"><b>' + esc(g.name) + '</b><span class="pill mute">' + g.members.length + ' murid</span></div>' +
          '<p class="muted" style="margin:4px 0">' + esc(g.reason) + '</p><p class="mono">' + esc(g.members.map(function (m) { return m.name; }).join(', ')) + '</p>' +
          '<button class="btn sm" data-a="group-action" data-kind="' + esc(g.suggested_action) + '" data-tp="' + esc(S.groups.tp_id) + '" data-members="' + esc(g.members.map(function (m) { return m.student_id; }).join(',')) + '" data-testid="group-' + i + '-assign">Tugaskan ' + esc(g.suggested_action) + '</button></div>';
      }).join('') : '') + '</div></div>';
  }

  function kpi(label, val, d) {
    return '<div class="card kpi rise" style="--d:' + d + 'ms"><small>' + esc(label) + '</small><b>' + esc(String(val)) + '</b></div>';
  }

  function planHtml(p) {
    return '<div style="margin-top:14px" data-testid="lesson-plan"><p class="kicker">' + esc(p.tp_name || '') + ' · ' + p.minutes + ' menit · ' +
      p.class_snapshot.total + ' murid (' + p.class_snapshot.needs_help + ' perlu bantuan, ' + p.class_snapshot.ready_enrichment + ' siap pengayaan)</p>' +
      p.blocks.map(function (b) {
        return '<div class="row" style="align-items:flex-start;gap:14px;padding:7px 0;border-bottom:1px solid rgba(42,63,53,.5)">' +
          '<span class="mono" style="width:78px;flex:none;color:var(--citrus)">' + b.from + '–' + b.to + '\'</span>' +
          '<div><b>' + esc(b.title) + '</b><br><span class="muted">' + esc(b.detail) + '</span></div></div>';
      }).join('') + '</div>';
  }

  function tpOptions(sel) {
    var list = S.tps.filter(function (t) {
      return !S.cls || !S.cls.subject_id || t.subject_id === S.cls.subject_id;
    });
    if (!list.length) list = S.tps;
    return list.map(function (t) {
      return '<option value="' + t.id + '"' + (sel === t.id ? ' selected' : '') + '>' + esc(t.code) + ' — ' + esc(t.name.slice(0, 60)) + '</option>';
    }).join('');
  }

  function loadCoverage() {
    api('/coverage?class_id=' + S.cls.id).then(function (c) { S.coverage = c; render(); });
  }
  function loadRecs() {
    api('/braincore/recommendations?class_id=' + S.cls.id).then(function (r) { S.recs = r.recommendations; render(); });
  }

  // ---------------- 2. Cakupan ----------------
  function vCoverage() {
    if (!S.coverage) { loadCoverage(); return head('Cakupan', 'Memuat matriks cakupan…'); }
    return head('Cakupan Kurikulum', 'Bagian mana yang belum diajarkan, dan mana yang sudah tapi belum dikuasai',
      'MISSING = belum ada soal · NOT_TAUGHT = belum ada evidence belajar · GAP = sudah dipelajari tapi mastery rendah') +
      '<div class="card" data-testid="coverage-table"><table><thead><tr><th>TP</th><th>Soal</th><th>Exposure</th><th>Mastery</th><th>Perlu bantuan</th><th>Status</th></tr></thead><tbody>' +
      S.coverage.rows.map(function (r) {
        var cls = r.status === 'GOOD' ? 'good' : r.status === 'GAP' ? 'bad' : r.status === 'DEVELOPING' ? 'warn' : 'mute';
        return '<tr class="click" data-a="tp-detail" data-tp="' + r.tp_id + '" data-testid="coverage-row-' + r.tp_id + '">' +
          '<td><b>' + esc(r.tp_code) + '</b><br><span class="muted">' + esc(r.tp_name.slice(0, 70)) + '</span></td>' +
          '<td>' + r.questions_published + (r.questions_pending ? ' <span class="muted">(+' + r.questions_pending + ' tinjau)</span>' : '') + '</td>' +
          '<td>' + r.students_exposed + '/' + r.students_total + '</td>' +
          '<td><span class="bar ' + (r.mastery_pct != null && r.mastery_pct < 60 ? 'bad' : r.mastery_pct != null && r.mastery_pct < 80 ? 'warn' : '') + '"><i style="width:' + (r.mastery_pct || 0) + '%"></i></span> ' + (r.mastery_pct == null ? '—' : r.mastery_pct + '%') + '</td>' +
          '<td>' + r.students_needs_help + '</td>' +
          '<td><span class="pill ' + cls + '">' + esc(r.status) + '</span><br><span class="muted" style="font-size:12px">' + esc(r.note) + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function openTpDetail(tpId) {
    Promise.all([
      api('/braincore/tp-detail?class_id=' + S.cls.id + '&tp_id=' + tpId),
      api('/curriculum/node/' + tpId + '/trace')
    ]).then(function (r) {
      var d = r[0].summary, mis = r[0].misconceptions, tr = r[1];
      function group(title, list, kind, cls) {
        return '<div class="card tight" style="margin-bottom:10px"><div class="row between"><b>' + title + '</b><span class="pill ' + cls + '">' + list.length + '</span></div>' +
          (list.length ? '<p class="mono muted">' + esc(list.map(function (x) { return x.name; }).join(', ')) + '</p>' +
            (kind ? '<button class="btn primary sm" data-a="intervene" data-kind="' + kind + '" data-tp="' + tpId + '" data-members="' + esc(list.map(function (x) { return x.student_id; }).join(',')) + '" data-testid="intervene-' + kind + '">Buat ' + kind + ' untuk ' + list.length + ' murid</button>' : '')
            : '<p class="muted">—</p>') + '</div>';
      }
      S.drawer =
        '<div class="row between"><p class="kicker">' + esc(tr.labels.curriculum + ' · ' + tr.labels.phase + ' · ' + tr.labels.grade + ' · ' + tr.labels.subject) + '</p>' +
        '<button class="btn sm ghost" data-a="close" data-testid="drawer-close">Tutup</button></div>' +
        '<h2>' + esc(tr.node.code) + '</h2><p>' + esc(tr.node.name) + '</p>' +
        '<p class="muted mono">Elemen: ' + esc(tr.labels.element || '—') + ' · CP: ' + esc((tr.labels.cp || '—').slice(0, 80)) + '</p>' +
        group('Sudah dikuasai', d.mastered, 'enrichment', 'good') +
        group('Sedang berkembang', d.developing, 'practice', 'warn') +
        group('Perlu remedial', d.needs_remediation, 'remedial', 'bad') +
        group('Belum ada evidence', d.not_started, 'diagnostic', 'mute') +
        group('Siap pengayaan', d.ready_enrichment, 'enrichment', 'good') +
        '<h3>Miskonsepsi</h3>' +
        (mis.length ? mis.map(function (m) {
          return '<div class="issue warn"><div><b>' + esc(m.misconception_id) + '</b><br>' + esc(m.headline) + '<br><span class="muted">' + esc(m.competency_name || '') + '</span></div></div>';
        }).join('') : '<p class="muted">Belum ada pola miskonsepsi yang terekam.</p>') +
        '<div class="row" style="margin-top:14px"><button class="btn ghost sm" data-a="plan-from-drawer" data-tp="' + tpId + '" data-testid="drawer-plan">Rencana mengajar 45\'</button>' +
        '<button class="btn ghost sm" data-a="groups-from-drawer" data-tp="' + tpId + '">Bentuk kelompok</button></div>';
      render();
    });
  }

  // ---------------- 3. Struktur kurikulum ----------------
  function vCurriculum() {
    if (!S.tree) { api('/curriculum/tree?curriculum_id=KURMER&depth=material').then(function (t) { S.tree = t; render(); }); return head('Kurikulum', 'Memuat learning graph…'); }
    if (!S.health) { api('/curriculum/health-check').then(function (h) { S.health = h; render(); }); }
    return head('Struktur Kurikulum', 'Kurikulum sebagai learning graph, bukan daftar nama materi',
      'Kurikulum → Fase → Kelas → Mapel → Elemen → CP → TP → Indikator → Kompetensi → Topik → Materi → Soal') +
      '<div class="grid g2"><div class="card" data-testid="curriculum-tree"><p class="kicker">Learning graph</p><div class="tree">' +
      S.tree.map(nodeHtml).join('') + '</div></div>' +
      '<div class="stack">' +
      '<div class="card" data-testid="add-node-card"><p class="kicker">Tambah simpul</p><h3>Lengkapi kurikulum</h3>' +
      '<label class="f">Jenis<select id="ndType" data-testid="node-type">' +
      ['tp', 'indicator', 'competency', 'topic', 'material', 'element', 'cp', 'subject', 'grade', 'phase'].map(function (t) { return '<option>' + t + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="f">Induk (parent id)<input id="ndParent" placeholder="CP-MAT-D-BIL" data-testid="node-parent"></label>' +
      '<label class="f">Nama<input id="ndName" placeholder="Nama simpul" data-testid="node-name"></label>' +
      '<button class="btn primary sm" data-a="add-node" data-testid="add-node-btn">Tambahkan</button></div>' +
      '<div class="card" data-testid="curriculum-health"><p class="kicker">Peringatan struktur</p>' +
      (S.health ? (S.health.warnings.length ? S.health.warnings.slice(0, 24).map(function (w) {
        return '<div class="issue ' + w.level + '">' + esc(w.message) + '</div>';
      }).join('') : '<p class="muted">Struktur sehat.</p>') : '<p class="muted">Memeriksa…</p>') +
      (S.health ? '<p class="mono muted">' + esc(JSON.stringify(S.health.counts)) + '</p>' : '') + '</div></div></div>';
  }

  function nodeHtml(n) {
    var kids = n.children || [];
    var label = '<span class="tag">' + esc(n.type) + '</span><b>' + esc(n.code) + '</b> ' + esc(n.name.slice(0, 90));
    if (!kids.length) return '<div class="leaf" data-testid="node-' + esc(n.id) + '">' + label + '</div>';
    return '<details' + (['curriculum', 'phase', 'grade', 'subject'].indexOf(n.type) !== -1 ? ' open' : '') + '><summary data-testid="node-' + esc(n.id) + '">' + label + '</summary>' + kids.map(nodeHtml).join('') + '</details>';
  }

  // ---------------- 4. Bank soal ----------------
  function vBank() {
    if (!S.questions.length && !S.bankLoaded) { loadBank(); return head('Bank Soal', 'Memuat…'); }
    return head('Bank Soal', 'Setiap soal punya DNA kurikulum', 'Soal adalah alat ukur; objek kanoniknya adalah KOMPETENSI.') +
      '<div class="grid g3">' +
      '<div class="card" data-testid="manual-card"><p class="kicker">A · Manual</p><h3>Buat soal</h3>' +
      compSelect('mqComp') +
      '<label class="f">Pertanyaan<textarea id="mqStem" data-testid="q-stem"></textarea></label>' +
      '<label class="f">Opsi A<input id="mqA" data-testid="q-a"></label>' +
      '<label class="f">Opsi B<input id="mqB" data-testid="q-b"></label>' +
      '<label class="f">Opsi C<input id="mqC"></label><label class="f">Opsi D<input id="mqD"></label>' +
      '<div class="row"><label class="f" style="width:90px">Kunci<select id="mqKey" data-testid="q-key"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>' +
      '<label class="f" style="width:110px">Kesulitan<select id="mqDif">' + [1, 2, 3, 4, 5].map(function (d) { return '<option' + (d === 2 ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" style="width:110px">Kognitif<select id="mqCog">' + ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(function (c) { return '<option' + (c === 'C2' ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f">Penjelasan<textarea id="mqExp" data-testid="q-exp"></textarea></label>' +
      '<label class="f">Petunjuk (hint)<input id="mqHint"></label>' +
      '<label class="f">Miskonsepsi (opsional)<input id="mqMis" placeholder="MIS-..."></label>' +
      '<div class="row"><button class="btn ghost sm" data-a="validate-q" data-testid="validate-btn">Cek validasi</button>' +
      '<button class="btn primary sm" data-a="create-q" data-testid="create-q-btn">Simpan sebagai draf</button></div>' +
      '<div id="qIssues"></div></div>' +

      '<div class="card" data-testid="paste-card"><p class="kicker">C · Copy/Paste</p><h3>Tempel banyak soal</h3>' +
      '<p class="muted" style="font-size:13px">Format: nomor, pertanyaan, opsi A–D, lalu <span class="mono">Jawaban: B</span> dan <span class="mono">Penjelasan: …</span></p>' +
      compSelect('pasteComp') +
      '<label class="f">Tempelan<textarea id="pasteText" style="min-height:160px" data-testid="paste-text"></textarea></label>' +
      '<button class="btn primary sm" data-a="import-paste" data-testid="import-paste-btn">Parse ke antrean tinjau</button></div>' +

      '<div class="card" data-testid="import-card"><p class="kicker">B & D · Import</p><h3>Excel / CSV / PDF / TXT</h3>' +
      compSelect('fileComp') +
      '<label class="f">Berkas<input type="file" id="impFile" accept=".csv,.xlsx,.pdf,.txt,.md" data-testid="import-file"></label>' +
      '<button class="btn primary sm" data-a="import-file" data-testid="import-file-btn">Unggah & parse</button>' +
      '<p class="muted" style="font-size:13px;margin-top:8px">Hasil parsing WAJIB ditinjau guru sebelum aktif.</p>' +
      '<button class="btn ghost sm" data-a="csv-template" data-testid="csv-template-btn">Lihat template kolom CSV</button>' +
      '<hr style="border:none;border-top:1px solid var(--line);margin:16px 0">' +
      '<p class="kicker">E · Kandidat dari Braincore</p>' +
      compSelect('genComp') +
      '<button class="btn clay sm" data-a="generate" data-testid="generate-btn">Buat kandidat soal</button>' +
      '<p class="muted" style="font-size:13px;margin-top:8px">Kandidat tidak pernah langsung terbit — hanya guru yang menerbitkan.</p></div>' +
      '</div>' +

      '<div class="card" data-testid="review-queue"><div class="row between"><div><p class="kicker">Antrean tinjau</p><h3>Menunggu keputusan guru</h3></div>' +
      '<button class="btn ghost sm" data-a="reload-bank">Muat ulang</button></div>' +
      (S.reviewQueue.length ? S.reviewQueue.map(qCard).join('') : '<p class="muted">Antrean bersih.</p>') + '</div>' +

      '<div class="card" data-testid="question-list"><div class="row between"><div><p class="kicker">Bank soal terbit</p><h3>' + S.questions.length + ' soal</h3></div>' +
      '<label class="f" style="width:280px;margin:0">Filter TP<select data-a="filter-tp" data-testid="filter-tp"><option value="">Semua TP</option>' + tpOptions(S.filterTp) + '</select></label></div>' +
      (S.questions.length ? S.questions.map(qCard).join('') : '<p class="muted">Belum ada soal.</p>') + '</div>';
  }

  function compSelect(id) {
    var list = S.comps.filter(function (c) { return !S.cls || !S.cls.subject_id || c.subject_id === S.cls.subject_id; });
    if (!list.length) list = S.comps;
    return '<label class="f">Kompetensi (goal)<select id="' + id + '" data-testid="' + id + '">' +
      list.map(function (c) { return '<option value="' + c.id + '">' + esc(c.code) + ' — ' + esc(c.name.slice(0, 52)) + '</option>'; }).join('') +
      '</select></label>';
  }

  function qCard(q) {
    var issues = q.issues || [];
    var st = q.status;
    var cls = st === 'PUBLISHED' ? 'good' : st === 'APPROVED' ? 'info' : st === 'ARCHIVED' ? 'mute' : 'warn';
    return '<div class="card tight" style="margin-top:10px" data-testid="q-' + esc(q.question_id) + '">' +
      '<div class="row between"><span class="pill ' + cls + '">' + esc(st) + ' v' + q.version + '</span>' +
      '<span class="mono muted">' + esc(q.question_id) + ' · ' + esc(q.tp_id || '-') + ' · D' + q.difficulty + ' · ' + esc(q.cognitive_level) + (q.is_transfer ? ' · TRANSFER' : '') + '</span></div>' +
      '<p style="margin:8px 0 4px"><b>' + esc(q.stem) + '</b></p>' +
      (q.options && q.options.length ? '<p class="muted mono">' + q.options.map(function (o, i) { return String.fromCharCode(65 + i) + '. ' + esc(o); }).join(' · ') + ' → kunci ' + esc(q.answer_key) + '</p>' : '') +
      '<p class="muted" style="font-size:13px">' + esc(q.competency_name || '') + (q.explanation ? ' · ' + esc(q.explanation.slice(0, 110)) : '') + '</p>' +
      issues.map(function (i) { return '<div class="issue ' + i.level + '">' + esc(i.message) + '</div>'; }).join('') +
      '<div class="row">' +
      (st !== 'PUBLISHED' ? '<button class="btn primary sm" data-a="q-review" data-q="' + esc(q.question_id) + '" data-act="publish" data-testid="publish-' + esc(q.question_id) + '">Terbitkan</button>' : '') +
      (st === 'DRAFT' || st === 'REVIEW' ? '<button class="btn sm" data-a="q-review" data-q="' + esc(q.question_id) + '" data-act="approve">Setujui</button>' : '') +
      '<button class="btn ghost sm" data-a="q-variants" data-q="' + esc(q.question_id) + '" data-testid="variants-' + esc(q.question_id) + '">Buat varian</button>' +
      '<button class="btn ghost sm" data-a="q-transfer" data-q="' + esc(q.question_id) + '">Buat varian transfer</button>' +
      '<button class="btn ghost sm" data-a="q-history" data-q="' + esc(q.question_id) + '">Riwayat versi</button>' +
      (st !== 'ARCHIVED' ? '<button class="btn ghost sm" data-a="q-review" data-q="' + esc(q.question_id) + '" data-act="archive">Arsipkan</button>' : '') +
      '</div></div>';
  }

  function loadBank() {
    S.bankLoaded = true;
    var qq = '/questions?limit=60' + (S.filterTp ? '&tp_id=' + S.filterTp : '');
    Promise.all([api(qq + '&status=PUBLISHED'), api('/questions/review/queue')]).then(function (r) {
      S.questions = r[0]; S.reviewQueue = r[1].items; render();
    });
  }

  // ---------------- 5. Asesmen ----------------
  function vAssessment() {
    if (!S.assessments.length && !S.asLoaded) { loadAssessments(); return head('Asesmen', 'Memuat…'); }
    var subjectTps = S.tps.filter(function (t) { return !S.cls.subject_id || t.subject_id === S.cls.subject_id; });
    if (!subjectTps.length) subjectTps = S.tps;
    var bpRows = S.bpRows || [{ tp: subjectTps[0] && subjectTps[0].id, count: 5 }];
    S.bpRows = bpRows;
    return head('Assessment Engine', 'Blueprint dulu, soal kemudian',
      'Delapan jenis asesmen dengan tujuan berbeda: diagnostic, practice, formative, summative, remedial, enrichment, review, transfer.') +
      '<div class="grid g2"><div class="card" data-testid="blueprint-card"><p class="kicker">Blueprint</p><h3>Rancang komposisi asesmen</h3>' +
      '<label class="f">Judul<input id="bpTitle" value="Formatif Bilangan" data-testid="bp-title"></label>' +
      '<label class="f">Jenis<select id="bpType" data-testid="bp-type">' +
      ['diagnostic', 'practice', 'formative', 'summative', 'remedial', 'enrichment', 'review', 'transfer'].map(function (t) { return '<option' + (t === 'formative' ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      '<p class="kicker">Target TP & jumlah soal</p>' +
      bpRows.map(function (r, i) {
        return '<div class="row" data-testid="bp-row-' + i + '"><select data-a="bp-tp" data-i="' + i + '" style="flex:1">' + tpOptions(r.tp) + '</select>' +
          '<input type="number" value="' + r.count + '" data-a="bp-count" data-i="' + i + '" style="width:80px"></div>';
      }).join('') +
      '<button class="btn ghost sm" data-a="bp-add" data-testid="bp-add">+ Target TP</button>' +
      '<p class="kicker" style="margin-top:14px">Distribusi kognitif (%)</p><div class="row">' +
      ['C1', 'C2', 'C3', 'C4'].map(function (c) {
        return '<label class="f" style="width:78px">' + c + '<input type="number" id="cog' + c + '" value="' + ({ C1: 20, C2: 30, C3: 30, C4: 20 })[c] + '" data-testid="cog-' + c + '"></label>';
      }).join('') + '</div>' +
      '<label class="f">Porsi soal transfer (0–1)<input id="bpTransfer" type="number" step="0.05" value="0.2" data-testid="bp-transfer"></label>' +
      '<div class="row"><button class="btn ghost sm" data-a="bp-check" data-testid="bp-check">Cek keseimbangan</button>' +
      '<button class="btn primary sm" data-a="bp-create" data-testid="bp-create">Simpan blueprint & buat asesmen</button></div>' +
      (S.blueprintCheck ? '<div style="margin-top:12px" data-testid="bp-warnings">' +
        (S.blueprintCheck.warnings.length ? S.blueprintCheck.warnings.map(function (w) { return '<div class="issue ' + w.level + '">' + esc(w.message) + '</div>'; }).join('') : '<div class="issue info">Blueprint seimbang.</div>') +
        '<p class="mono muted">' + esc(JSON.stringify(S.blueprintCheck.availability)) + '</p></div>' : '') +
      '</div>' +
      '<div class="card" data-testid="assessment-list"><p class="kicker">Asesmen kelas ini</p><h3>' + S.assessments.length + ' asesmen</h3>' +
      (S.assessments.length ? S.assessments.map(function (a) {
        return '<div class="card tight" style="margin-top:10px" data-testid="as-' + esc(a.id) + '"><div class="row between"><b>' + esc(a.title) + '</b>' +
          '<span class="pill info">' + esc(a.assessment_type) + (a.adaptive ? ' · adaptif' : '') + '</span></div>' +
          '<p class="muted">' + a.question_count + ' soal · ' + (a.student_ids || []).length + ' murid · ' +
          a.progress.finished + ' selesai / ' + a.progress.started + ' mulai</p>' +
          (a.assembly_notes && a.assembly_notes.length ? '<div class="issue warn">' + esc(a.assembly_notes.join(' ')) + '</div>' : '') +
          '<div class="row"><button class="btn ghost sm" data-a="as-analytics" data-id="' + esc(a.id) + '" data-testid="analytics-' + esc(a.id) + '">Analitik butir</button></div></div>';
      }).join('') : '<p class="muted">Belum ada asesmen.</p>') + '</div></div>';
  }

  function loadAssessments() {
    S.asLoaded = true;
    api('/assessments?class_id=' + S.cls.id).then(function (a) { S.assessments = a; render(); });
  }

  // ---------------- 6. Murid & paspor ----------------
  function vStudents() {
    if (!S.students) {
      api('/classes/' + S.cls.id).then(function (c) { S.students = c.students || []; render(); });
      return head('Murid', 'Memuat…');
    }
    return head('Murid & Learning Passport', S.cls.name, 'Kode kelas: ' + S.cls.code + ' — murid memakainya saat masuk.') +
      '<div class="grid g2"><div class="card" data-testid="roster-card"><p class="kicker">Tambah murid</p>' +
      '<label class="f">Nama (satu per baris)<textarea id="roster" data-testid="roster-input"></textarea></label>' +
      '<button class="btn primary sm" data-a="add-roster" data-testid="add-roster-btn">Tambahkan</button></div>' +
      '<div class="card" data-testid="legacy-import-card"><p class="kicker">Kompatibilitas</p><h3>Impor Ruang Guru lama</h3>' +
      '<p class="muted" style="font-size:13.5px">Data Ruang Guru versi localStorage tetap utuh. Impor ini <b>menambahkan</b> ' +
      'agregat skill lama sebagai evidence kompetensi kurikulum — tidak ada yang dihapus.</p>' +
      '<button class="btn sm" data-a="import-legacy" data-testid="import-legacy-btn">Impor dari perangkat ini</button></div>' +
      '<div class="card" data-testid="student-list"><p class="kicker">Daftar murid</p><h3>' + S.students.length + ' murid</h3>' +
      '<table><tbody>' + S.students.map(function (s) {
        return '<tr class="click" data-a="passport" data-sid="' + esc(s.user_id) + '" data-testid="student-' + esc(s.user_id) + '"><td><b>' + esc(s.name) + '</b></td><td class="muted mono">' + esc(s.email || 'roster') + '</td><td>Lihat paspor →</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function openPassport(sid) {
    api('/braincore/passport/' + sid).then(function (p) {
      S.drawer = '<div class="row between"><p class="kicker">Learning Passport</p><button class="btn sm ghost" data-a="close">Tutup</button></div>' +
        '<h2>' + esc(p.name || sid) + '</h2>' +
        '<div class="row">' + [['Kompetensi', p.totals.competencies], ['Dikuasai', p.totals.mastered], ['Bertahan', p.totals.retained], ['Transfer', p.totals.transferred]].map(function (t) {
          return '<div class="card tight kpi" style="flex:1"><small>' + t[0] + '</small><b>' + t[1] + '</b></div>';
        }).join('') + '</div>' +
        (p.rows.length ? p.rows.map(function (r) {
          return '<div class="card tight" style="margin-top:10px"><div class="row between"><b>' + esc(r.tp_code || '-') + '</b><span class="pill mute">' + r.mastery_pct + '%</span></div>' +
            '<p class="muted">' + esc((r.tp_name || '').slice(0, 90)) + '</p>' +
            r.competencies.map(function (c) {
              return '<div class="row between" style="border-top:1px solid rgba(42,63,53,.5);padding:6px 0"><span>' + esc(c.name) + '</span>' +
                '<span class="pill ' + (['MASTERED', 'RETAINED', 'TRANSFERRED'].indexOf(c.state) !== -1 ? 'good' : c.state === 'DEVELOPING' ? 'warn' : 'mute') + '">' + esc(c.state_label) + '</span></div>';
            }).join('') +
            (r.next_target ? '<p class="mono" style="color:var(--clay)">Target berikutnya: ' + esc(r.next_target) + '</p>' : '') + '</div>';
        }).join('') : '<p class="muted">Belum ada evidence.</p>') +
        (p.due_reviews.length ? '<h3>Perlu review</h3>' + p.due_reviews.map(function (d) {
          return '<div class="issue info">' + esc(d.name || d.competency_id) + ' — retensi ' + (d.retrievability == null ? '?' : Math.round(d.retrievability * 100) + '%') + '</div>';
        }).join('') : '') +
        (p.open_misconceptions.length ? '<h3>Miskonsepsi terbuka</h3>' + p.open_misconceptions.map(function (m) {
          return '<div class="issue warn">' + esc(m.misconception_id) + ' (' + m.frequency + 'x)</div>';
        }).join('') : '');
      render();
    });
  }

  // ---------------- events ----------------
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-a]');
    if (!el) return;
    var a = el.getAttribute('data-a');
    if (a === 'login') {
      var tok = val('tok');
      if (!tok) return toast('Masukkan token guru.');
      el.disabled = true;
      return E.login.teacherToken(tok, val('tnm')).then(start).catch(function (e) { renderAuth(e.message); });
    }
    if (a === 'logout') return E.login.logout().then(function () { S.user = null; renderAuth(); });
    if (a === 'close') { S.drawer = null; S.modal = null; return render(); }
    if (a === 'view') { S.view = el.getAttribute('data-v'); S.drawer = null; S.modal = null; return render(); }
    if (a === 'new-class') {
      var name = prompt('Nama kelas baru?');
      if (!name) return;
      return api('/classes', { body: { name: name, grade_id: 'KELAS-7', subject_id: 'MAT-7' } }).then(function (c) {
        S.classes.push(c); S.cls = c; resetCaches(); toast('Kelas dibuat. Kode: ' + c.code); render();
      }).catch(errToast);
    }
    if (a === 'tp-detail') return openTpDetail(el.getAttribute('data-tp'));
    if (a === 'passport') return openPassport(el.getAttribute('data-sid'));

    if (a === 'exec-rec') {
      var r = S.recs[+el.getAttribute('data-i')], act = r.actions[+el.getAttribute('data-j')];
      if (act.endpoint === '/api/questions') { S.view = 'bank'; return render(); }
      el.disabled = true;
      return api(act.endpoint.replace(/^\/api/, ''), { body: act.payload }).then(function (res) {
        if (res.groups) { S.groups = res; S.view = 'copilot'; toast('Kelompok dibentuk.'); }
        else if (res.blocks) { S.plan = res; toast('Rencana mengajar dibuat.'); }
        else { toast('Dibuat: ' + (res.title || 'intervensi') + ' → ' + ((res.student_ids || []).length) + ' murid.'); resetCaches(); }
        render();
      }).catch(errToast);
    }
    if (a === 'make-plan' || a === 'plan-from-drawer') {
      var tp = a === 'make-plan' ? val('planTp') : el.getAttribute('data-tp');
      var mins = a === 'make-plan' ? (+val('planMin') || 45) : 45;
      return api('/braincore/lesson-plan', { body: { class_id: S.cls.id, tp_id: tp, minutes: mins } })
        .then(function (p) { S.plan = p; S.view = 'copilot'; S.drawer = null; render(); }).catch(errToast);
    }
    if (a === 'make-groups' || a === 'groups-from-drawer') {
      var tpg = a === 'make-groups' ? val('grpTp') : el.getAttribute('data-tp');
      return api('/braincore/groups', { body: { class_id: S.cls.id, tp_id: tpg } })
        .then(function (g) { S.groups = g; S.view = 'copilot'; S.drawer = null; render(); }).catch(errToast);
    }
    if (a === 'intervene' || a === 'group-action') {
      var kind = el.getAttribute('data-kind');
      var members = (el.getAttribute('data-members') || '').split(',').filter(Boolean);
      el.disabled = true;
      return api('/assessments/from-recommendation', {
        body: { kind: kind, class_id: S.cls.id, tp_id: el.getAttribute('data-tp'), student_ids: members }
      }).then(function (res) {
        toast(res.title + ' dibuat untuk ' + (res.student_ids || []).length + ' murid.');
        S.drawer = null; resetCaches(); render();
      }).catch(errToast);
    }

    if (a === 'add-node') {
      return api('/curriculum/nodes', { body: { type: val('ndType'), parent_id: val('ndParent'), name: val('ndName') } })
        .then(function (n) { toast('Simpul ' + n.code + ' dibuat.'); S.tree = null; S.health = null; loadContext().then(render); })
        .catch(errToast);
    }

    if (a === 'validate-q' || a === 'create-q') {
      var body = questionBody();
      if (!body.stem) return toast('Isi pertanyaan dulu.');
      return api(a === 'validate-q' ? '/questions/validate' : '/questions', { body: body }).then(function (res) {
        var issues = res.issues || [];
        var box = document.getElementById('qIssues');
        if (box) box.innerHTML = '<div data-testid="q-issues">' + (issues.length ? issues.map(function (i) {
          return '<div class="issue ' + i.level + '">' + esc(i.message) + '</div>';
        }).join('') : '<div class="issue info">Tidak ada masalah. Soal siap diterbitkan.</div>') + '</div>';
        if (a === 'create-q') { toast('Soal disimpan (' + res.question.status + ').'); S.bankLoaded = false; loadBank(); }
      }).catch(errToast);
    }
    if (a === 'import-paste') {
      var text = val('pasteText');
      if (!text) return toast('Tempel soal dulu.');
      el.disabled = true;
      return api('/questions/import/paste', { body: { text: text, competency_id: val('pasteComp') } })
        .then(function (r) { toast(r.created.length + ' soal masuk antrean tinjau.'); S.bankLoaded = false; loadBank(); })
        .catch(errToast);
    }
    if (a === 'import-file') {
      var f = document.getElementById('impFile');
      if (!f || !f.files[0]) return toast('Pilih berkas dulu.');
      var fd = new FormData(); fd.append('file', f.files[0]); fd.append('competency_id', val('fileComp'));
      el.disabled = true;
      return api('/questions/import/file', { body: fd })
        .then(function (r) { toast(r.created.length + ' soal terbaca, ' + r.rejected.length + ' ditolak — semua masuk tinjau.'); S.bankLoaded = false; loadBank(); })
        .catch(errToast);
    }
    if (a === 'csv-template') {
      return api('/questions/import/template').then(function (t) {
        S.modal = '<div class="row between"><h3>Template kolom CSV/Excel</h3><button class="btn sm ghost" data-a="close">Tutup</button></div>' +
          '<p class="mono">' + esc(t.headers.join(', ')) + '</p><p class="kicker">Contoh baris</p><p class="mono">' + esc(t.example.join(' | ')) + '</p>';
        render();
      });
    }
    if (a === 'generate') {
      el.disabled = true;
      return api('/questions/generate-candidates', { body: { competency_id: val('genComp'), count: 3 } })
        .then(function (r) { toast(r.created.length + ' kandidat dibuat — menunggu tinjauanmu.'); S.bankLoaded = false; loadBank(); })
        .catch(errToast);
    }
    if (a === 'q-review') {
      el.disabled = true;
      return api('/questions/' + el.getAttribute('data-q') + '/review', { body: { action: el.getAttribute('data-act') } })
        .then(function (q) { toast('Status: ' + q.status); S.bankLoaded = false; loadBank(); }).catch(errToast);
    }
    if (a === 'q-variants' || a === 'q-transfer') {
      el.disabled = true;
      return api('/questions/' + el.getAttribute('data-q') + '/variants', { body: { count: 2, transfer: a === 'q-transfer' } })
        .then(function (r) { toast(r.created.length + ' varian dibuat (REVIEW).'); S.bankLoaded = false; loadBank(); }).catch(errToast);
    }
    if (a === 'q-history') {
      return api('/questions/' + el.getAttribute('data-q') + '/history').then(function (h) {
        S.modal = '<div class="row between"><h3>Riwayat versi</h3><button class="btn sm ghost" data-a="close">Tutup</button></div>' +
          '<p class="muted">Evidence murid tetap terikat ke versi soal saat dikerjakan.</p>' +
          h.map(function (v) {
            return '<div class="card tight" style="margin-top:8px"><span class="pill ' + (v.is_current ? 'good' : 'mute') + '">v' + v.version + (v.is_current ? ' · aktif' : '') + '</span><p>' + esc(v.stem) + '</p><p class="mono muted">' + esc(v.status) + ' · kunci ' + esc(v.answer_key) + '</p></div>';
          }).join('');
        render();
      });
    }
    if (a === 'reload-bank') { S.bankLoaded = false; return loadBank(); }
    if (a === 'bp-add') {
      var pool = S.tps.filter(function (t) { return !S.cls.subject_id || t.subject_id === S.cls.subject_id; });
      if (!pool.length) pool = S.tps;
      S.bpRows.push({ tp: pool[0] && pool[0].id, count: 5 });
      return render();
    }
    if (a === 'bp-check' || a === 'bp-create') {
      var bp = blueprintBody();
      if (a === 'bp-check') return api('/blueprints/check', { body: bp }).then(function (c) { S.blueprintCheck = c; render(); }).catch(errToast);
      el.disabled = true;
      return api('/blueprints', { body: bp }).then(function (saved) {
        S.blueprintCheck = saved.check;
        return api('/assessments', { body: { title: bp.title, assessment_type: bp.assessment_type, class_id: S.cls.id, blueprint_id: saved.id } });
      }).then(function (as) {
        toast('Asesmen "' + as.title + '" dibuat: ' + as.question_count + ' soal untuk ' + (as.student_ids || []).length + ' murid.');
        S.asLoaded = false; loadAssessments();
      }).catch(errToast);
    }
    if (a === 'as-analytics') {
      return api('/assessments/' + el.getAttribute('data-id') + '/analytics').then(function (an) {
        S.drawer = '<div class="row between"><p class="kicker">Analitik butir</p><button class="btn sm ghost" data-a="close">Tutup</button></div>' +
          '<h2>' + esc(an.assessment.title) + '</h2>' +
          '<p class="muted">' + an.sessions + ' sesi · ' + an.finished + ' selesai · rata-rata ' + (an.avg_score == null ? '—' : Math.round(an.avg_score * 100) + '%') + '</p>' +
          '<div class="card tight"><p class="kicker">Sinyal kepercayaan diri</p><p class="mono">' + esc(JSON.stringify(an.confidence_signals)) + '</p></div>' +
          (an.items.length ? an.items.map(function (i) {
            return '<div class="card tight" style="margin-top:8px"><div class="row between"><span class="pill ' + (i.flag === 'sehat' ? 'good' : 'warn') + '">' + esc(i.flag) + '</span><span class="mono muted">p=' + (i.p_value == null ? '—' : i.p_value) + ' · n=' + i.n + '</span></div><p>' + esc((i.stem || '').slice(0, 120)) + '</p></div>';
          }).join('') : '<p class="muted">Belum ada attempt.</p>');
        render();
      }).catch(errToast);
    }
    if (a === 'import-legacy') {
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem('fiezel-teacher-v1')); } catch (_) {}
      if (!raw || !(raw.classes || []).length) return toast('Tidak ada data Ruang Guru lama di perangkat ini.');
      el.disabled = true;
      return api('/migration/legacy-teacher-store', { body: { teacher_state: raw } }).then(function (r) {
        toast(r.classes + ' kelas · ' + r.students + ' murid · ' + r.evidence + ' evidence diimpor.');
        resetCaches(); return api('/classes');
      }).then(function (list) { S.classes = list; render(); }).catch(errToast);
    }
    if (a === 'add-roster') {
      var names = val('roster').split('\n').map(function (x) { return x.replace(/^\d+[.)\s-]*/, '').trim(); }).filter(Boolean);
      if (!names.length) return toast('Isi nama murid.');
      return api('/classes/' + S.cls.id + '/roster', { body: { names: names } }).then(function (r) {
        toast(r.count + ' murid ditambahkan.'); S.students = null; resetCaches(); render();
      }).catch(errToast);
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-a]');
    if (!el) return;
    var a = el.getAttribute('data-a');
    if (a === 'pick-class') {
      S.cls = S.classes.filter(function (c) { return c.id === el.value; })[0];
      resetCaches(); render();
    }
    if (a === 'filter-tp') { S.filterTp = el.value; S.bankLoaded = false; loadBank(); }
    if (a === 'bp-tp') { S.bpRows[+el.getAttribute('data-i')].tp = el.value; }
    if (a === 'bp-count') { S.bpRows[+el.getAttribute('data-i')].count = +el.value || 1; }
  });

  function questionBody() {
    var opts = ['mqA', 'mqB', 'mqC', 'mqD'].map(val).filter(Boolean);
    return {
      competency_id: val('mqComp'), stem: val('mqStem'), options: opts, answer_key: val('mqKey'),
      explanation: val('mqExp'), hints: val('mqHint') ? [val('mqHint')] : [],
      difficulty: +val('mqDif') || 2, cognitive_level: val('mqCog') || 'C2',
      misconception_id: val('mqMis') || null, question_type: 'mcq', status: 'DRAFT'
    };
  }

  function blueprintBody() {
    return {
      title: val('bpTitle') || 'Asesmen', assessment_type: val('bpType') || 'formative',
      tp_targets: S.bpRows.map(function (r) { return { tp_id: r.tp, count: r.count }; }),
      cognitive_distribution: { C1: +val('cogC1') || 0, C2: +val('cogC2') || 0, C3: +val('cogC3') || 0, C4: +val('cogC4') || 0 },
      transfer_ratio: parseFloat(val('bpTransfer')) || 0, question_types: ['mcq']
    };
  }

  function resetCaches() {
    S.coverage = null; S.recs = null; S.assessments = []; S.asLoaded = false;
    S.students = null; S.bankLoaded = false; S.questions = []; S.reviewQueue = [];
    S.plan = null; S.groups = null; S.bpRows = null; S.blueprintCheck = null;
  }

  function errToast(e) { toast(e.message || 'Gagal.'); render(); }

  // callback Google (murid) tidak dipakai di sini
  boot();
})(window);
