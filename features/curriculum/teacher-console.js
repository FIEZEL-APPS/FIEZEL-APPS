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
    user: null, classes: [], cls: null, activeSubject: null, view: 'copilot', tree: null, coverage: null,
    recs: null, questions: [], reviewQueue: [], tps: [], comps: [], assessments: [],
    drawer: null, modal: null, plan: null, groups: null, busy: false, health: null, blueprintCheck: null,
    engStatus: null, engBusy: false, mapelStatus: null, mapelBusy: false,
    soalStatus: null, soalBusy: false
  };

  /* Pembungkus i18n yang sama dengan fz-api.js, dan alasannya sama pula: halaman konsol
     tidak memuat lapisan i18n hari ini, sehingga FiezelI18n.t() mengembalikan NAMA KUNCI
     saat naskahnya belum termuat. Guru tidak boleh membaca 'kurikulum.semai-judul' di
     layarnya, jadi cadangan Indonesia yang dikembalikan.

     Naskah baru di berkas ini WAJIB lewat sini. tests/th-ui-leak-test.js melacak anggaran
     literal Indonesia telanjang berkas ini di ALLOWLIST (sedang 35; angka yang hanya boleh
     turun dan harus pas dengan kenyataan) — dan argumen kedua t() adalah satu-satunya
     bentuk yang diakui pemindainya sebagai jalur i18n yang benar, bukan kebocoran. */
  function t(kunci, cadangan) {
    var s;
    try { var I = root.FiezelI18n; s = I && I.t ? I.t(kunci) : undefined; } catch (_) {}
    return (s === undefined || s === kunci) ? cadangan : s;
  }

  var GRADES = [
    ['KELAS-7', t('kurikulum.opt-k7', 'Kelas 7 (Fase D · SMP)')],
    ['KELAS-8', t('kurikulum.opt-k8', 'Kelas 8 (Fase D · SMP)')],
    ['KELAS-9', t('kurikulum.opt-k9', 'Kelas 9 (Fase D · SMP)')],
    ['KELAS-10', t('kurikulum.opt-k10', 'Kelas 10 (Fase E · SMA/SMK)')],
    ['KELAS-11', t('kurikulum.opt-k11', 'Kelas 11 (Fase F · SMA/SMK)')],
    ['KELAS-12', t('kurikulum.opt-k12', 'Kelas 12 (Fase F · SMA/SMK)')],
    ['KELAS-1', t('kurikulum.opt-k1', 'Kelas 1 (Fase A · SD)')],
    ['KELAS-2', t('kurikulum.opt-k2', 'Kelas 2 (Fase A · SD)')],
    ['KELAS-3', t('kurikulum.opt-k3', 'Kelas 3 (Fase B · SD)')],
    ['KELAS-4', t('kurikulum.opt-k4', 'Kelas 4 (Fase B · SD)')],
    ['KELAS-5', t('kurikulum.opt-k5', 'Kelas 5 (Fase C · SD)')],
    ['KELAS-6', t('kurikulum.opt-k6', 'Kelas 6 (Fase C · SD)')]
  ];

  var SUBJECT_CHOICES = [
    ['MAT-7', t('kurikulum.sub-mat7', 'Matematika (Kelas 7 · SMP)')],
    ['MAT-8', t('kurikulum.sub-mat8', 'Matematika (Kelas 8 · SMP)')],
    ['MAT-9', t('kurikulum.sub-mat9', 'Matematika (Kelas 9 · SMP)')],
    ['ENG-7', t('kurikulum.sub-eng7', 'Bahasa Inggris (Kelas 7 · SMP)')],
    ['ENG-8', t('kurikulum.sub-eng8', 'Bahasa Inggris (Kelas 8 · SMP)')],
    ['ENG-9', t('kurikulum.sub-eng9', 'Bahasa Inggris (Kelas 9 · SMP)')],
    ['IPA-7', t('kurikulum.sub-ipa7', 'IPA (Kelas 7 · SMP)')],
    ['IPA-8', t('kurikulum.sub-ipa8', 'IPA (Kelas 8 · SMP)')],
    ['IPA-9', t('kurikulum.sub-ipa9', 'IPA (Kelas 9 · SMP)')],
    ['IPS-7', t('kurikulum.sub-ips7', 'IPS (Kelas 7 · SMP)')],
    ['IND-7', t('kurikulum.sub-ind7', 'Bahasa Indonesia (Kelas 7 · SMP)')],
    ['INF-7', t('kurikulum.sub-inf7', 'Informatika (Kelas 7 · SMP)')],
    ['PKN-7', t('kurikulum.sub-pkn7', 'Pendidikan Pancasila (Kelas 7 · SMP)')],
    ['MAT', t('kurikulum.sub-mat', 'Matematika (Semua Kelas)')],
    ['ENG', t('kurikulum.sub-eng', 'Bahasa Inggris (Semua Kelas)')],
    ['IPA', t('kurikulum.sub-ipa', 'Ilmu Pengetahuan Alam (IPA)')],
    ['IPS', t('kurikulum.sub-ips', 'Ilmu Pengetahuan Sosial (IPS)')],
    ['IND', t('kurikulum.sub-ind', 'Bahasa Indonesia')],
    ['INF', t('kurikulum.sub-inf', 'Informatika')],
    ['PKN', t('kurikulum.sub-pkn', 'Pendidikan Pancasila')],
    ['SD-ALL', t('kurikulum.sub-sd-all', 'Guru Kelas SD (Tematik)')],
    ['ALL', t('kurikulum.sub-all', 'Semua Mata Pelajaran')]
  ];

  function activeSubj() {
    return (S.cls && S.cls.subject_id) || S.activeSubject || 'MAT-7';
  }

  function subjName(sid) {
    if (!sid) return t('kurikulum.sub-umum', 'Semua Mata Pelajaran');
    for (var i = 0; i < SUBJECT_CHOICES.length; i++) {
      if (SUBJECT_CHOICES[i][0] === sid) return SUBJECT_CHOICES[i][1];
    }
    var base = sid.split('-')[0];
    for (var j = 0; j < SUBJECT_CHOICES.length; j++) {
      if (SUBJECT_CHOICES[j][0] === base) return SUBJECT_CHOICES[j][1];
    }
    return sid;
  }

  /* G6 (m025-351): judul asesmen bawaan dulu satu string mengambang — muncul apa adanya
     di ruang mapel mana pun. Sekarang judulnya mengikuti mapel yang sedang aktif; urutan
     kata Indonesia tidak dipaksa ke naskah Thai karena pola {mapel} menyatu di dalam
     t()/copy-map. */
  function defaultAssessTitle() {
    var mapel = subjName(activeSubj());
    return String(t('kurikulum.bp-default-title', 'Formatif {mapel}')).replace('{mapel}', mapel);
  }

  /* G7 (m025-351): ketersediaan blueprint dari backend berbentuk array {tp_id, tp_code,
     needed, available} — dulu dicetak mentah dengan JSON.stringify. Yang dibaca guru cukup
     satu baris per TP: cukup atau kurang, dan berapa. */
  function fmtAvailability(list) {
    if (!list || !list.length) return t('kurikulum.bp-av-kosong', 'Pemeriksaan ketersediaan soal belum menghasilkan data.');
    var ganti = function (s, p) { return String(s).replace('{tp}', p.tp).replace('{avail}', p.avail).replace('{need}', p.need).replace('{selisih}', p.selisih); };
    return list.map(function (x) {
      var tp = x.tp_code || String(x.tp_id || 'TP');
      var avail = x.available || 0, need = x.needed || 0;
      var s = avail < need
        ? t('kurikulum.bp-av-kurang', 'TP {tp}: hanya {avail}/{need} soal — kurang {selisih}.')
        : t('kurikulum.bp-av-cukup', 'TP {tp}: {avail}/{need} soal tersedia.');
      return ganti(s, { tp: tp, avail: avail, need: need, selisih: need - avail });
    }).join(' · ');
  }

  /* G7 (m025-351): sinyal kepercayaan diri per butir (lucky guess, false confidence,
     careless, misconception) dicetak sebagai baris ringkas, bukan JSON mentah. */
  function fmtConfidence(s) {
    if (!s) return '—';
    var baris = [
      [t('kurikulum.an-sinyal-lucky', 'Tebakan beruntung'), s.lucky_guess],
      [t('kurikulum.an-sinyal-over', 'Yakin tapi salah'), s.false_confidence],
      [t('kurikulum.an-sinyal-careless', 'Ceroboh'), s.careless],
      [t('kurikulum.an-sinyal-miskon', 'Miskonsepsi'), s.misconception]
    ];
    return baris.map(function (b) { return b[0] + ': ' + (b[1] || 0); }).join(' · ');
  }

  var NAV = [
    ['copilot', t('kurikulum.nav-copilot', 'Beranda Guru')],
    ['coverage', t('kurikulum.nav-coverage', 'Kemajuan Belajar')],
    ['curriculum', t('kurikulum.nav-curriculum', 'Standar Kurikulum')],
    ['bank', t('kurikulum.nav-bank', 'Bank Soal')],
    ['assessment', t('kurikulum.nav-assessment', 'Kuis & Ulangan')],
    ['students', t('kurikulum.nav-students', 'Nilai & Rapor')]
  ];

  // ---------------- boot ----------------
  function boot() {
    function viaKelasKu() {
      return E.login.kelasku().then(start).catch(function (e) {
        renderAuth(e && e.message);
      });
    }
    if (E.token && E.token()) {
      E.login.me().then(start).catch(viaKelasKu);
    } else {
      viaKelasKu();
    }
  }

  /* SATU tombol, nol kolom isian.

     Layar ini dulu meminta token `FZG-` yang hanya ada di mesin kurikulum dan
     tidak punya satu pun antarmuka penerbit — guru yang sudah terverifikasi di
     KelasKu tetap terhenti di sini. Sekarang identitasnya diambil dari akun
     KelasKu yang sama dengan yang dipakai di aplikasi: kalau gurunya sudah masuk
     di sana, tidak ada yang perlu diketik sama sekali. */
  function renderAuth(err) {
    app.innerHTML =
      '<div class="auth-wrap"><div class="card ink rise">' +
      '<p class="kicker">FIEZEL · Ruang Guru</p>' +
      '<h1>Kurikulum yang benar-benar dipelajari.</h1>' +
      '<p class="muted">Masuk dengan akun KelasKu-mu. Tidak ada token terpisah: akses guru mengikuti peranmu di KelasKu, dan owner mengaturnya dari satu tempat.</p>' +
      (err ? '<div class="issue error">' + esc(err) + '</div>' : '') +
      '<button class="btn primary" data-a="login" data-testid="teacher-login-btn">Masuk dengan akun KelasKu</button>' +
      '<p class="muted" style="margin-top:16px;font-size:13px">Belum masuk? Buka <a href="./index.html" data-testid="link-app">aplikasi FIEZEL</a> dulu, lalu kembali ke halaman ini.</p>' +
      '<p class="muted" style="font-size:13px">Murid masuk di halaman <a href="./misi.html" data-testid="link-student">Misi Belajar</a>.</p>' +
      '<p class="muted" style="margin-top:20px;font-size:11px;line-height:1.5;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">' +
      esc(t('kurikulum.disclaimer-auth', 'Mengadopsi Standar Capaian Pembelajaran Kurikulum Merdeka (BSKAP No. 032/H/KR/2024). Menghormati penuh otonomi KOSP sekolah dan pendidik.')) +
      '</p>' +
      '</div></div>';
  }

  function start(user) {
    S.user = user;
    if (user && (user.subjectId || user.subject_id)) {
      S.activeSubject = user.subjectId || user.subject_id;
    }
    if (E && E.seed && E.seed.mapelStatus) {
      E.seed.mapelStatus().then(function (st) {
        if (st && !st.seeded && E.seed.mapel) {
          return E.seed.mapel().catch(function () {});
        }
      }).catch(function () {});
    }
    api('/classes').then(function (list) {
      S.classes = list;
      if (!list.length) {
        openWelcomeModal();
        return;
      }
      S.cls = list[0];
      if (S.cls && S.cls.subject_id) {
        S.activeSubject = S.cls.subject_id;
      }
      return loadContext().then(render);
    }).catch(function (e) { renderAuth(e.message); });
  }

  function openWelcomeModal() {
    var rawSub = S.activeSubject || '';
    var defSubject = 'MAT-7';
    for (var sIdx = 0; sIdx < SUBJECT_CHOICES.length; sIdx++) {
      var sCode = SUBJECT_CHOICES[sIdx][0];
      if (sCode === rawSub || (rawSub && (sCode.indexOf(rawSub + '-') === 0 || sCode === rawSub))) {
        defSubject = sCode;
        break;
      }
    }

    var rawGrd = (S.user && (S.user.gradeId || S.user.grade_id)) || '';
    var defGrade = 'KELAS-7';
    if (rawGrd === 'SMP' || rawGrd === 'fase_d') defGrade = 'KELAS-7';
    else if (rawGrd === 'SMA' || rawGrd === 'fase_e' || rawGrd === 'fase_f') defGrade = 'KELAS-10';
    else if (rawGrd === 'SD' || rawGrd === 'fase_a' || rawGrd === 'fase_b' || rawGrd === 'fase_c') defGrade = 'KELAS-1';

    S.modal =
      '<div class="card tight ink" style="margin-bottom:0;max-width:520px" data-testid="welcome-onboarding-modal">' +
      '<div class="row between" style="margin-bottom:12px">' +
        '<h3 style="margin:0">' + esc(t('kurikulum.welcome-title', 'Selamat Datang di Ruang Guru!')) + '</h3>' +
      '</div>' +
      '<p class="muted" style="margin-bottom:16px;line-height:1.5">' +
        esc(t('kurikulum.welcome-sub', 'Pilih mata pelajaran dan kelas yang Anda ampu agar ruang belajar Anda siap digunakan.')) +
      '</p>' +
      '<label class="f">' + esc(t('kurikulum.modal-kelas-nama', 'Nama Rombel / Kelas')) +
        '<input id="welcomeClsName" value="' + esc(t('kurikulum.default-class-name', 'Kelas 7A')) + '" autofocus data-testid="welcome-class-name">' +
      '</label>' +
      '<div class="grid g2">' +
        '<label class="f">' + esc(t('kurikulum.modal-kelas-jenjang', 'Tingkat / Fase')) +
          '<select id="welcomeClsGrade" data-testid="welcome-class-grade">' +
            GRADES.map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === defGrade ? ' selected' : '') + '>' + esc(g[1]) + '</option>'; }).join('') +
          '</select>' +
        '</label>' +
        '<label class="f">' + esc(t('kurikulum.modal-kelas-mapel', 'Mata Pelajaran')) +
          '<select id="welcomeClsSubject" data-testid="welcome-class-subject">' +
            SUBJECT_CHOICES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === defSubject ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('') +
          '</select>' +
        '</label>' +
      '</div>' +
      '<div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">' +
        '<button class="btn primary" data-a="submit-welcome-class" data-testid="submit-welcome-btn">' + esc(t('kurikulum.welcome-submit', '🚀 Mulai Mengajar di Ruang Ini')) + '</button>' +
        '<button class="btn ghost sm" data-a="bootstrap-demo-class" data-testid="bootstrap-demo-btn">' + esc(t('kurikulum.welcome-demo-btn', 'Atau Gunakan Kelas Contoh (Demo)')) + '</button>' +
      '</div>' +
      '</div>';
    render();
  }

  function loadContext() {
    var sub = activeSubj();
    return Promise.all([
      api('/curriculum/nodes?type=tp' + (sub ? '&subject_id=' + encodeURIComponent(sub) : '')),
      api('/curriculum/competencies' + (sub ? '?subject_id=' + encodeURIComponent(sub) : ''))
    ]).then(function (r) { S.tps = r[0]; S.comps = r[1]; });
  }

  function renderDisclaimer() {
    return '<footer class="compliance-footer" data-testid="compliance-disclaimer" style="margin-top:40px;padding:16px 20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;font-size:12px;line-height:1.6;color:var(--text-muted, #8e9bb0)">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-weight:600;color:var(--text-normal, #cad5e2)">' +
      '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981"></span>' +
      '<span>' + esc(t('kurikulum.disclaimer-badge', 'Standar Kurikulum Merdeka & Otonomi Pendidik')) + '</span>' +
      '</div>' +
      '<p style="margin:0">' + esc(t('kurikulum.disclaimer-text', 'FIEZEL beroperasi sebagai platform pendukung pembelajaran mandiri yang mengadopsi struktur Capaian Pembelajaran Kurikulum Merdeka (Keputusan Kepala BSKAP Kemendikbudristek No. 032/H/KR/2024 dan Permendikbudristek No. 12 Tahun 2024). Guru dan satuan pendidikan memiliki otonomi pedagogis penuh untuk menyesuaikan materi, indikator, dan alur tujuan pembelajaran sesuai Kurikulum Operasional Satuan Pendidikan (KOSP) masing-masing.')) + '</p>' +
      '</footer>';
  }

  // ---------------- kerangka ----------------

  /* ISIAN GURU TIDAK BOLEH HILANG SAAT LAYAR DICAT ULANG (m025-349, temuan G1).
     ==========================================================================
     render() menulis ulang app.innerHTML seutuhnya, dan ia dipanggil dari SETIAP
     penyelesaian permintaan latar: loadCoverage, loadRecs, health-check, tiga kartu
     penyemai, loadBank, loadAssessments, dan errToast. Seluruh isian di konsol ini adalah
     elemen DOM polos tanpa cadangan di S — jadi setiap permintaan yang selesai menghapus
     apa pun yang sedang diketik guru.

     Jalur yang paling mudah dipicu, dan yang membuat temuan ini P0: guru membuka Standar
     Kurikulum, mulai mengetik rumusan kompetensi di "Tambah simpul", lalu salah satu dari
     tiga permintaan status penyemai di kartu sebelahnya selesai — dan kalimatnya lenyap.
     Yang paling mahal: kotak "Tempel Banyak Soal Sekaligus", tempat guru menempelkan
     puluhan soal sekaligus.

     Perbaikannya sengaja TIDAK menyentuh alur render. Mengubah konsol menjadi render
     inkremental adalah penulisan ulang yang risikonya jauh lebih besar daripada cacatnya.
     Yang dilakukan di sini persis pola yang sudah dipakai fiezel-class-hub.js: potret
     nilai sebelum dicat, pulihkan sesudahnya, berikut fokus dan posisi kursor. */
  function potretIsian() {
    var potret = { nilai: {}, fokus: null };
    if (!app) return potret;
    try {
      var medan = app.querySelectorAll('input[id], textarea[id], select[id]');
      for (var i = 0; i < medan.length; i++) {
        var el = medan[i];
        /* Berkas tidak bisa — dan tidak boleh — dipulihkan dari JavaScript. */
        if (el.type === 'file') continue;
        potret.nilai[el.id] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
      }
      var aktif = document.activeElement;
      if (aktif && aktif.id && app.contains(aktif)) {
        potret.fokus = { id: aktif.id, mulai: null, akhir: null };
        try { potret.fokus.mulai = aktif.selectionStart; potret.fokus.akhir = aktif.selectionEnd; } catch (_) {}
      }
    } catch (_) {}
    return potret;
  }

  function pulihkanIsian(potret) {
    if (!potret || !app) return;
    try {
      Object.keys(potret.nilai).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || !app.contains(el)) return;
        var v = potret.nilai[id];
        if (el.type === 'checkbox' || el.type === 'radio') { el.checked = !!v; return; }
        /* Untuk <select>, nilai yang opsinya sudah tidak ada dibiarkan apa adanya supaya
           pilihan bawaan yang baru tetap sah — memaksakan nilai hantu diam-diam mengubah
           arti tombol di sebelahnya. */
        if (el.tagName === 'SELECT') {
          for (var i = 0; i < el.options.length; i++) if (el.options[i].value === v) { el.value = v; break; }
          return;
        }
        el.value = v;
      });
      if (potret.fokus) {
        var f = document.getElementById(potret.fokus.id);
        if (f && app.contains(f)) {
          f.focus();
          if (typeof f.setSelectionRange === 'function' && potret.fokus.mulai != null) {
            try { f.setSelectionRange(potret.fokus.mulai, potret.fokus.akhir); } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  function render() {
    if (!S.user) return renderAuth();
    var potret = potretIsian();
    app.innerHTML =
      '<div class="shell"><aside class="side">' +
      '<div class="brand"><span class="brand-mark">F</span><div><b>FIEZEL</b><small>Kurikulum & Kompetensi</small></div></div>' +
      '<div class="card tight ink" style="margin-bottom:12px;padding:8px 10px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);border-radius:8px" data-testid="active-subject-badge">' +
      '<small class="kicker" style="font-size:10px;color:#38bdf8;margin:0;display:block">' + esc(t('kurikulum.ruang-guru-label', 'RUANG MATA PELAJARAN')) + '</small>' +
      '<b style="font-size:12px;color:var(--text-normal, #cad5e2);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(subjName(activeSubj())) + '</b>' +
      '</div>' +
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
      '</aside><main class="main" data-testid="teacher-console">' + view() + renderDisclaimer() + '</main></div>' +
      (S.drawer ? '<button type="button" class="scrim" data-a="close" aria-label="' + esc(t('kurikulum.scrim-tutup', 'Tutup')) + '"></button><aside class="drawer" data-testid="drawer">' + S.drawer + '</aside>' : '') +
      (S.modal ? '<button type="button" class="scrim" data-a="close" aria-label="' + esc(t('kurikulum.scrim-tutup', 'Tutup')) + '"></button><div class="modal" data-testid="modal">' + S.modal + '</div>' : '');
    pulihkanIsian(potret);
    /* G3 (m025-351): ingat elemen pemicu supaya Tutup/Escape bisa memulangkan fokus. */
    if (!S.drawer && !S.modal && document.activeElement && app.contains(document.activeElement)) lastFocused = document.activeElement;
    if (S.drawer || S.modal) focusOverlay();
  }

  function view() {
    if (!S.cls) return '<div class="card"><h3>' + esc(t('kurikulum.welcome-title', 'Selamat Datang di Ruang Guru!')) + '</h3><p class="muted">' + esc(t('kurikulum.welcome-sub', 'Pilih mata pelajaran dan kelas yang Anda ampu agar ruang belajar Anda siap digunakan.')) + '</p><button class="btn primary sm" data-a="new-class" style="margin-top:10px">+ ' + esc(t('kurikulum.modal-kelas-submit', 'Simpan & Buat Kelas')) + '</button></div>';
    return ({ copilot: vCopilot, coverage: vCoverage, curriculum: vCurriculum, bank: vBank,
              assessment: vAssessment, students: vStudents }[S.view] || vCopilot)();
  }

  function head(kicker, title, sub) {
    return '<div class="topline"><div><p class="kicker">' + esc(kicker) + '</p><h1>' + esc(title) + '</h1>' +
      (sub ? '<p class="muted">' + esc(sub) + '</p>' : '') + '</div></div>';
  }

  // ---------------- 1. Kopilot ----------------
  function vCopilot() {
    if (!S.coverage) { loadCoverage(); return head(t('kurikulum.nav-copilot', 'Beranda Guru'), t('kurikulum.copilot-loading', 'Menyiapkan panduan mengajar kelas…')) + '<div class="card">' + t('kurikulum.copilot-memuat', 'Memuat data belajar kelas…') + '</div>'; }
    if (!S.recs) { loadRecs(); }
    var rows = S.coverage.rows, total = rows.length;
    var missing = rows.filter(function (r) { return r.status === 'MISSING' || r.status === 'NOT_TAUGHT'; }).length;
    var gap = rows.filter(function (r) { return r.status === 'GAP'; }).length;
    var good = rows.filter(function (r) { return r.status === 'GOOD'; }).length;
    var avg = rows.filter(function (r) { return r.mastery_pct != null; });
    var mastery = avg.length ? Math.round(avg.reduce(function (a, b) { return a + b.mastery_pct; }, 0) / avg.length) : null;
    return head(t('kurikulum.nav-copilot', 'Beranda Guru'), t('kurikulum.copilot-title', 'Panduan & Rekomendasi Mengajar Hari Ini'),
      t('kurikulum.copilot-sub', 'Saran otomatis berdasarkan materi yang perlu diperkuat di kelas ') + S.cls.name + '.') +
      '<div class="grid g4">' +
      kpi(t('kurikulum.kpi-tp-pantau', 'Materi Dipantau'), total, 0) + kpi(t('kurikulum.kpi-belum-ajar', 'Belum Diajarkan'), missing, 60) +
      kpi(t('kurikulum.kpi-perlu-remedial', 'Perlu Remedial / Bimbingan'), gap, 120) + kpi(t('kurikulum.kpi-rata-nilai', 'Rata-rata Nilai Kelas'), mastery == null ? '—' : mastery + '%', 180) +
      '</div>' +
      '<div class="card accent rise" style="--d:220ms" data-testid="recommendations">' +
      '<p class="kicker">' + esc(t('kurikulum.recs-kicker', '💡 Rekomendasi Guru Hari Ini')) + '</p>' +
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
      }).join('') : '<p class="muted">' + t('kurikulum.recs-empty', 'Belum ada data nilai yang cukup untuk merekomendasikan tindakan.') + '</p>')
        : '<p class="muted">' + t('kurikulum.recs-calc', 'Menghitung rekomendasi mengajar…') + '</p>') + '</div>' +
      '<div class="grid g2">' +
      '<div class="card rise" style="--d:280ms" data-testid="lesson-plan-card"><p class="kicker">' + t('kurikulum.plan-kicker', 'Rencana Jam Pelajaran (45 Menit)') + '</p>' +
      '<h3>' + t('kurikulum.plan-title', 'Susun kegiatan belajar sesuai kebutuhan murid') + '</h3>' +
      '<div class="row"><label class="f" style="flex:1 1 200px">' + t('kurikulum.kompetensi-goal-label', 'Kompetensi (goal)') + '<select id="planTp" data-testid="plan-tp">' + tpOptions() + '</select></label>' +
      '<label class="f" style="width:120px">Durasi (menit)<input id="planMin" type="number" value="45" data-testid="plan-minutes"></label></div>' +
      '<button class="btn primary sm" data-a="make-plan" data-testid="make-plan-btn">Buat rencana</button>' +
      (S.plan ? planHtml(S.plan) : '') + '</div>' +
      '<div class="card rise" style="--d:340ms" data-testid="groups-card"><p class="kicker">' + t('kurikulum.grp-kicker', 'Kelompok Belajar Murid') + '</p>' +
      '<h3>' + t('kurikulum.grp-title', 'Bentuk kelompok otomatis berdasarkan penguasaan materi') + '</h3>' +
      '<label class="f">' + t('kurikulum.kompetensi-goal-label', 'Kompetensi (goal)') + '<select id="grpTp" data-testid="group-tp">' + tpOptions() + '</select></label>' +
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
    var sub = activeSubj();
    var list = S.tps.filter(function (t) {
      return !sub || t.subject_id === sub;
    });
    if (!list.length) list = S.tps;
    return list.map(function (t) {
      return '<option value="' + t.id + '"' + (sel === t.id ? ' selected' : '') + '>' + esc(t.code) + ' — ' + esc(t.name.slice(0, 60)) + '</option>';
    }).join('');
  }

  function loadCoverage() {
    var sub = activeSubj();
    api('/coverage?class_id=' + S.cls.id + (sub ? '&subject_id=' + encodeURIComponent(sub) : '')).then(function (c) { S.coverage = c; render(); });
  }
  function loadRecs() {
    api('/braincore/recommendations?class_id=' + S.cls.id).then(function (r) { S.recs = r.recommendations; render(); });
  }

  // ---------------- 2. Cakupan ----------------
  function vCoverage() {
    if (!S.coverage) { loadCoverage(); return head(t('kurikulum.cakupan-head', 'Cakupan'), t('kurikulum.cakupan-memuat', 'Memuat matriks cakupan…')); }
    var STATUS_LABELS = {
      GOOD: t('kurikulum.st-good', 'Tuntas / Mahir'),
      DEVELOPING: t('kurikulum.st-dev', 'Sedang Berkembang'),
      GAP: t('kurikulum.st-gap', 'Perlu Pendampingan'),
      NOT_TAUGHT: t('kurikulum.st-not-taught', 'Belum Diajarkan'),
      MISSING: t('kurikulum.st-missing', 'Belum Ada Soal')
    };
    return head(t('kurikulum.cakupan-judul', 'Cakupan Kurikulum'), t('kurikulum.cakupan-subjudul', 'Bagian mana yang belum diajarkan, dan mana yang sudah tapi belum dikuasai'),
      t('kurikulum.cakupan-ket', 'Keterangan: Tuntas / Mahir = penguasaan tinggi · Perlu Pendampingan = perlu remedial · Belum Diajarkan = belum ada aktivitas belajar')) +
      '<div class="card" data-testid="coverage-table"><div class="tbl-scroll"><table><thead><tr>' +
      '<th>' + t('kurikulum.th-tp', 'Tujuan Pembelajaran (TP)') + '</th>' +
      '<th>' + t('kurikulum.th-soal', 'Bank Soal') + '</th>' +
      '<th>' + t('kurikulum.th-exposure', 'Keterlibatan') + '</th>' +
      '<th>' + t('kurikulum.th-mastery', 'Kemahiran') + '</th>' +
      '<th>' + t('kurikulum.th-help', 'Perlu Pendampingan') + '</th>' +
      '<th>' + t('kurikulum.th-status', 'Status Ketuntasan') + '</th></tr></thead><tbody>' +
      /* Kelas baru dulu menerima tabel berkepala tanpa satu baris pun dan tanpa satu
         kalimat pun tentang langkah berikutnya. Guru tidak bisa membedakan "belum ada
         data" dari "gagal memuat" — dua keadaan yang tindakannya berlawanan. */
      (S.coverage.rows.length ? '' : '<tr data-testid="coverage-empty"><td colspan="6" class="muted" style="padding:22px 10px;text-align:center">' +
        esc(t('kurikulum.cakupan-kosong', 'Belum ada data belajar di kelas ini. Matriks terisi sendiri setelah murid mengerjakan kuis pertamanya — terbitkan satu dari tab Kuis & Ulangan.')) + '</td></tr>') +
      S.coverage.rows.map(function (r) {
        var cls = r.status === 'GOOD' ? 'good' : r.status === 'GAP' ? 'bad' : r.status === 'DEVELOPING' ? 'warn' : 'mute';
        var stText = STATUS_LABELS[r.status] || r.status;
        return '<tr class="click" data-a="tp-detail" data-tp="' + r.tp_id + '" data-testid="coverage-row-' + r.tp_id + '">' +
          '<td><b>' + esc(r.tp_code) + '</b><br><span class="muted">' + esc(r.tp_name.slice(0, 70)) + '</span></td>' +
          '<td>' + r.questions_published + (r.questions_pending ? ' <span class="muted">(+' + r.questions_pending + ' tinjau)</span>' : '') + '</td>' +
          '<td>' + r.students_exposed + '/' + r.students_total + ' ' + t('kurikulum.unit-murid', 'murid') + '</td>' +
          '<td><span class="bar ' + (r.mastery_pct != null && r.mastery_pct < 60 ? 'bad' : r.mastery_pct != null && r.mastery_pct < 80 ? 'warn' : '') + '"><i style="width:' + (r.mastery_pct || 0) + '%"></i></span> ' + (r.mastery_pct == null ? '—' : r.mastery_pct + '%') + '</td>' +
          '<td>' + r.students_needs_help + '</td>' +
          '<td><span class="pill ' + cls + '">' + esc(stText) + '</span><br><span class="muted" style="font-size:12px">' + esc(r.note) + '</span></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="muted" style="margin-top:12px;font-size:12.5px">💡 ' + t('kurikulum.petunjuk-klik-tp', 'Klik baris mana saja untuk melihat murid, detail miskonsepsi, dan langsung membuat rencana intervensi.') + '</p></div>';
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

  function flattenTree(nodes, acc) {
    acc = acc || [];
    (nodes || []).forEach(function (n) {
      acc.push({ id: n.id, code: n.code, name: n.name, type: n.type });
      if (n.children && n.children.length) flattenTree(n.children, acc);
    });
    return acc;
  }

  // ---------------- 3. Struktur kurikulum ----------------
  function vCurriculum() {
    var sub = activeSubj();
    if (!S.tree) { api('/curriculum/tree?curriculum_id=KURMER&depth=material' + (sub ? '&subject_id=' + encodeURIComponent(sub) : '')).then(function (t) { S.tree = t; render(); }); return head(t('kurikulum.kurikulum-head', 'Kurikulum'), t('kurikulum.kurikulum-memuat', 'Memuat learning graph…')); }
    if (!S.health) { api('/curriculum/health-check' + (sub ? '?subject_id=' + encodeURIComponent(sub) : '')).then(function (h) { S.health = h; render(); }); }
    var flatNodes = flattenTree(S.tree);
    var parentOptions = flatNodes.map(function (n) {
      return '<option value="' + esc(n.id) + '">' + esc(n.type.toUpperCase() + ': ' + n.code + ' — ' + (n.name || '').slice(0, 50)) + '</option>';
    }).join('');
    var NODE_TYPES = [
      ['tp', t('kurikulum.type.tp', 'Tujuan Pembelajaran (TP)')],
      ['competency', t('kurikulum.type.comp', 'Kompetensi Dasar')],
      ['indicator', t('kurikulum.type.ind', 'Indikator Keberhasilan')],
      ['topic', t('kurikulum.type.topic', 'Topik Bahasan')],
      ['material', t('kurikulum.type.mat', 'Materi Ajar')],
      ['element', t('kurikulum.type.elem', 'Elemen Pembelajaran')],
      ['cp', t('kurikulum.type.cp', 'Capaian Pembelajaran (CP)')],
      ['subject', t('kurikulum.type.sub', 'Mata Pelajaran')],
      ['grade', t('kurikulum.type.grd', 'Jenjang Kelas')],
      ['phase', t('kurikulum.type.phs', 'Fase Kurikulum')]
    ];
    return head(t('kurikulum.struktur-judul', 'Struktur Kurikulum') + ' — ' + subjName(sub), t('kurikulum.struktur-subjudul', 'Kurikulum sebagai learning graph, bukan daftar nama materi'),
      'Kurikulum → Fase → Kelas → Mapel → Elemen → CP → TP → Indikator → Kompetensi → Topik → Materi → Soal') +
      '<div class="grid g2"><div class="card" data-testid="curriculum-tree"><p class="kicker">' + t('kurikulum.learning-graph-kicker', 'Learning graph') + '</p><div class="tree">' +
      S.tree.map(nodeHtml).join('') + '</div></div>' +
      '<div class="stack">' +
      '<details class="card" data-testid="add-node-card"><summary style="cursor:pointer;font-weight:600"><span class="kicker" style="display:inline;margin:0 8px 0 0">' + t('kurikulum.tambah-simpul-kicker', 'Tambah simpul') + '</span> ' + t('kurikulum.lengkapi-kurikulum', 'Lengkapi kurikulum') + ' …</summary>' +
      '<div style="margin-top:14px">' +
      '<label class="f">' + t('kurikulum.jenis-label', 'Jenis Simpul') + '<select id="ndType" data-testid="node-type">' +
      NODE_TYPES.map(function (nt) { return '<option value="' + nt[0] + '">' + esc(nt[1]) + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="f">' + t('kurikulum.induk-label', 'Induk (pilih dari bank atau ketik ID)') +
      '<datalist id="parent-tree-list">' + parentOptions + '</datalist>' +
      '<input id="ndParent" list="parent-tree-list" placeholder="' + t('kurikulum.induk-ph', 'Pilih dari daftar atau ketik ID induk (mis. CP-MAT-D-BIL)') + '" data-testid="node-parent"></label>' +
      '<label class="f">' + t('kurikulum.nama-simpul-label', 'Nama Simpul / Deskripsi') + '<input id="ndName" placeholder="' + t('kurikulum.nama-simpul-ph', 'Nama simpul atau rumusan kompetensi') + '" data-testid="node-name"></label>' +
      '<button class="btn primary sm" data-a="add-node" data-testid="add-node-btn">' + t('kurikulum.tombol-tambah-simpul', 'Tambahkan') + '</button></div></details>' +
      seedCardHtml() +
      '<div class="card" data-testid="curriculum-health"><p class="kicker">' + t('kurikulum.peringatan-kicker', 'Peringatan struktur') + '</p>' +
      (S.health ? (S.health.warnings.length ? S.health.warnings.slice(0, 24).map(function (w) {
        return '<div class="issue ' + w.level + '">' + esc(w.message) + '</div>';
      }).join('') : '<p class="muted">' + t('kurikulum.struktur-sehat', 'Struktur sehat.') + '</p>') : '<p class="muted">' + t('kurikulum.memeriksa-struktur', 'Memeriksa…') + '</p>') +
      (S.health && S.health.counts ? '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><span class="pill good">' + (S.health.counts.tp || 0) + ' ' + esc(t('kurikulum.type.tp', 'Tujuan Pembelajaran')) + '</span><span class="pill info">' + (S.health.counts.competency || 0) + ' ' + esc(t('kurikulum.type.comp', 'Kompetensi')) + '</span><span class="pill mute">' + (S.health.counts.material || 0) + ' ' + esc(t('kurikulum.type.mat', 'Materi Ajar')) + '</span></div>' : '') + '</div></div></div>';
  }

  /* KARTU PENYEMAI BANK KURIKULUM.

     Kurikulum Merdeka Bahasa Inggris utuh (Fase A–F, Kelas 1–12, 72 TP, 144 kompetensi,
     lengkap dengan materi ajar dan prasyarat antar kelas) sudah lama ada di
     backend/seed_english.py DAN sudah punya endpoint POST /api/seed/english. Yang tidak
     pernah ada adalah pemanggilnya: nol antarmuka di seluruh klien menyentuhnya, jadi
     satu-satunya kurikulum yang pernah mendarat di MongoDB adalah demo Matematika 11
     kompetensi yang dijalankan otomatis /seed/bootstrap saat guru belum punya kelas.

     Akibatnya owner membuka konsol, melihat dua mapel dengan satu elemen masing-masing,
     dan menyimpulkan "mata pelajarannya belum lengkap". Ia benar — tetapi sebabnya bukan
     isi yang kurang, melainkan pintu yang tidak pernah dipasang. Kartu ini pintunya.

     Statusnya dibaca lebih dulu supaya tombolnya jujur: guru berhak tahu banknya sudah
     terisi atau belum SEBELUM menekan apa pun. */
  /* DUA BANK, SATU BENTUK KARTU. Bahasa Inggris punya penyemainya sendiri (Fase A–F,
     Kelas 1–12) dan mapel lain punya penyemainya sendiri (Fase D, Kelas 7–9), tetapi
     kartunya identik: baca status dulu, baru tawarkan tombol. Ditulis sekali dan
     diparameterkan — dua salinan kartu berarti dua tempat yang bisa menyimpang, dan yang
     kedua tidak akan pernah dibaca ulang siapa pun. */
  var SEMAI = {
    english: {
      aksi: 'seed-english', st: 'engStatus', busy: 'engBusy',
      ambil: function () { return E.seed.englishStatus(); },
      jalan: function () { return E.seed.english(); },
      judul: function () { return t('kurikulum.semai-judul', 'Kurikulum Bahasa Inggris Kelas 1–12'); },
      ajakan: function () { return t('kurikulum.semai-ajakan', 'Kurikulum Merdeka Bahasa Inggris lengkap Fase A–F: 72 tujuan pembelajaran, 144 kompetensi, plus materi ajar dan prasyarat antar kelas. Disemai sekali, lalu menjadi milik bank kurikulummu.'); },
      selesai: function () { return t('kurikulum.semai-selesai', 'Kurikulum Bahasa Inggris Kelas 1–12 tersemai.'); }
    },
    mapel: {
      aksi: 'seed-mapel', st: 'mapelStatus', busy: 'mapelBusy',
      ambil: function () { return E.seed.mapelStatus(); },
      jalan: function () { return E.seed.mapel(); },
      judul: function () { return t('kurikulum.mapel-judul', 'Mata pelajaran lain — Kelas 1–12'); },
      ajakan: function () { return t('kurikulum.mapel-ajakan', 'Tujuh belas mata pelajaran Fase A–F: Matematika, B.Indonesia, Pancasila, IPAS, IPA, IPS, Sejarah, Informatika, Fisika, Kimia, Biologi, Ekonomi, Sosiologi, Geografi, PJOK, Seni Budaya, Prakarya. 210 tujuan pembelajaran, 420 kompetensi, lengkap materi ajar dan prasyarat antar kelas.'); },
      selesai: function () { return t('kurikulum.mapel-selesai', 'Mata pelajaran Kelas 1–12 tersemai.'); }
    },
    soal: {
      aksi: 'seed-soal', st: 'soalStatus', busy: 'soalBusy',
      ambil: function () { return E.seed.soalStatus(); },
      jalan: function () { return E.seed.soal(); },
      judul: function () { return t('kurikulum.soal-judul', 'Bank soal'); },
      /* Kartu bank soal memakai kalimat "sudah tersemai"-nya SENDIRI, karena angka yang
         dipunyainya memang berbeda. english_status dan mapel_status menghitung simpul
         kurikulum (tp, kompetensi, materi); soal_status menghitung BUTIR. Dipaksa memakai
         kalimat bersama, kartunya berbunyi "Sudah tersemai: undefined tujuan pembelajaran"
         — ruas yang tidak pernah ada di jawabannya. */
      sudah: function (st) {
        return t('kurikulum.soal-sudah', 'Sudah tersemai: {n} soal, mencakup {k} dari {total} kompetensi.')
          .replace('{n}', st.from_this_seeder).replace('{k}', st.competencies_with_questions)
          .replace('{total}', st.competencies_total);
      },
      ajakan: function () { return t('kurikulum.soal-ajakan', 'Soal pilihan ganda berpembahasan, berpetunjuk, dan berpeta miskonsepsi — inilah yang membuat kompetensi bisa dilatih, bukan sekadar dilihat. Semai kurikulumnya lebih dulu.'); },
      selesai: function () { return t('kurikulum.soal-selesai', 'Bank soal tersemai.'); }
    }
  };

  function kartuSemai(jenis) {
    var d = SEMAI[jenis];
    if (S[d.st] === null && !S[d.busy]) {
      S[d.busy] = true;
      d.ambil().then(function (st) {
        S[d.st] = st; S[d.busy] = false; render();
      }).catch(function () { S[d.st] = false; S[d.busy] = false; render(); });
    }
    var st = S[d.st], sibuk = S[d.busy], baris;
    if (st === null) baris = '<p class="muted">' + esc(t('kurikulum.semai-memeriksa', 'Memeriksa isi bank kurikulum…')) + '</p>';
    else if (st && st.seeded) {
      baris = '<p class="muted" data-testid="' + d.aksi + '-status">' + esc(d.sudah ? d.sudah(st) :
        t('kurikulum.semai-sudah', 'Sudah tersemai: {tp} tujuan pembelajaran, {komp} kompetensi, {materi} materi ajar.')
          .replace('{tp}', st.tp).replace('{komp}', st.competencies).replace('{materi}', st.materials)) + '</p>';
    } else {
      baris = '<p class="muted" data-testid="' + d.aksi + '-status">' + esc(t('kurikulum.semai-belum', 'Belum tersemai. Bank kurikulum masih berisi contoh demo saja.')) + '</p>';
    }
    var sudah = !!(st && st.seeded);
    return '<div class="card" data-testid="' + d.aksi + '-card"><p class="kicker">' + esc(t('kurikulum.semai-kicker', 'Bank kurikulum')) + '</p>' +
      '<h3>' + esc(d.judul()) + '</h3>' +
      '<p class="muted">' + esc(d.ajakan()) + '</p>' +
      baris +
      '<button class="btn ' + (sudah ? 'ghost' : 'primary') + ' sm" data-a="' + d.aksi + '" data-testid="' + d.aksi + '-btn"' + (sibuk ? ' disabled' : '') + '>' +
      esc(sibuk ? t('kurikulum.semai-jalan', 'Sedang menyemai — butuh beberapa detik.')
        : (sudah ? t('kurikulum.semai-ulang', 'Semai ulang') : t('kurikulum.semai-tombol', 'Semai sekarang'))) +
      '</button></div>';
  }

  function seedCardHtml() {
    return kartuSemai('english') + kartuSemai('mapel') + kartuSemai('soal');
  }

  function nodeHtml(n) {
    var kids = n.children || [];
    var label = '<span class="tag">' + esc(n.type) + '</span><b>' + esc(n.code) + '</b> ' + esc(n.name.slice(0, 90));
    if (!kids.length) return '<div class="leaf" data-testid="node-' + esc(n.id) + '">' + label + '</div>';
    return '<details' + (['curriculum', 'phase', 'grade', 'subject'].indexOf(n.type) !== -1 ? ' open' : '') + '><summary data-testid="node-' + esc(n.id) + '">' + label + '</summary>' + kids.map(nodeHtml).join('') + '</details>';
  }

  // ---------------- 4. Bank soal ----------------
  function vBank() {
    if (!S.questions.length && !S.bankLoaded) { loadBank(); return head(t('kurikulum.bank-head-kicker', 'Bank Soal'), t('kurikulum.bank-head-memuat', 'Memuat…')); }
    return head(t('kurikulum.bank-head-kicker', 'Bank Soal'), t('kurikulum.bank-head-title', 'Gudang Soal & Kurasi Mandiri'), t('kurikulum.bank-head-sub', 'Kelola bank soal kurikulum, buat soal baru secara manual, atau impor dari file naskah.')) +
      '<div class="card ink" style="margin-bottom:18px;border-left:4px solid #38bdf8" data-testid="bank-guide-card">' +
      '<p class="kicker" style="color:#38bdf8">' + esc(t('kurikulum.bank-guide-kicker', '💡 Petunjuk Guru')) + '</p>' +
      '<h3 style="margin:4px 0 8px">' + esc(t('kurikulum.bank-guide-title', 'Pusat Kurasi & Bank Soal')) + '</h3>' +
      '<p class="muted" style="margin:0 0 10px;font-size:13px;line-height:1.5">' +
      esc(t('kurikulum.bank-guide-desc', 'Seluruh kompetensi kurikulum sudah dilengkapi bank soal siap pakai. Jika Anda hanya ingin membuat kuis atau asesmen untuk kelas, Anda TIDAK PERLU menyusun soal manual di sini — cukup buka tab Asesmen dan gunakan Template Cepat 1-Klik.')) +
      '</p>' +
      '<button class="btn sm primary" data-a="view" data-v="assessment" data-testid="bank-to-as-btn">' + esc(t('kurikulum.bank-to-assessment', '⚡ Buka Tab Asesmen (Buat Kuis 1-Klik)')) + '</button>' +
      '</div>' +

      '<div class="grid g3">' +
      '<div class="card" data-testid="manual-card"><p class="kicker">' + esc(t('kurikulum.bank-kicker-manual', 'Tulis Manual')) + '</p><h3>' + esc(t('kurikulum.bank-title-manual', 'Buat 1 Soal Baru')) + '</h3>' +
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

      '<div class="card" data-testid="paste-card"><p class="kicker">' + esc(t('kurikulum.bank-kicker-paste', 'Salin & Tempel')) + '</p><h3>' + esc(t('kurikulum.bank-title-paste', 'Tempel Banyak Soal Sekaligus')) + '</h3>' +
      '<p class="muted" style="font-size:13px">Format: nomor, pertanyaan, opsi A–D, lalu <span class="mono">Jawaban: B</span> dan <span class="mono">Penjelasan: …</span></p>' +
      compSelect('pasteComp') +
      '<label class="f">Tempelan<textarea id="pasteText" style="min-height:160px" data-testid="paste-text"></textarea></label>' +
      '<button class="btn primary sm" data-a="import-paste" data-testid="import-paste-btn">Parse ke antrean tinjau</button></div>' +

      '<div class="card" data-testid="import-card"><p class="kicker">' + esc(t('kurikulum.bank-kicker-import', 'Impor Dokumen')) + '</p><h3>' + esc(t('kurikulum.bank-title-import', 'Unggah Excel / CSV / PDF / TXT')) + '</h3>' +
      compSelect('fileComp') +
      '<label class="f">Berkas<input type="file" id="impFile" accept=".csv,.xlsx,.pdf,.txt,.md" data-testid="import-file"></label>' +
      '<button class="btn primary sm" data-a="import-file" data-testid="import-file-btn">Unggah & parse</button>' +
      '<p class="muted" style="font-size:13px;margin-top:8px">Hasil parsing WAJIB ditinjau guru sebelum aktif.</p>' +
      '<button class="btn ghost sm" data-a="csv-template" data-testid="csv-template-btn">Lihat template kolom CSV</button>' +
      '<hr style="border:none;border-top:1px solid var(--line);margin:16px 0">' +
      '<p class="kicker">' + esc(t('kurikulum.bank-kicker-ai', 'Bantuan AI')) + '</p>' +
      compSelect('genComp') +
      '<button class="btn clay sm" data-a="generate" data-testid="generate-btn">Buat kandidat soal</button>' +
      '<p class="muted" style="font-size:13px;margin-top:8px">Kandidat tidak pernah langsung terbit — hanya guru yang menerbitkan.</p></div>' +
      '</div>' +

      '<div class="card" data-testid="review-queue"><div class="row between"><div><p class="kicker">' + esc(t('kurikulum.bank-kicker-queue', 'Antrean Kurasi')) + '</p><h3>' + esc(t('kurikulum.bank-title-queue', 'Menunggu Keputusan Guru')) + '</h3></div>' +
      '<button class="btn ghost sm" data-a="reload-bank">Muat ulang</button></div>' +
      (S.reviewQueue.length ? S.reviewQueue.map(qCard).join('') : '<p class="muted">Antrean bersih.</p>') + '</div>' +

      '<div class="card" data-testid="question-list"><div class="row between"><div><p class="kicker">' + esc(t('kurikulum.bank-kicker-published', 'Koleksi Siap Pakai')) + '</p><h3>' + S.questions.length + ' ' + esc(t('kurikulum.bank-soal-satuan', 'soal aktif')) + '</h3>' +
      (S.questions.length === 60 ? '<p class="muted" style="font-size:12.5px;margin:4px 0 0">⚠️ ' + esc(t('kurikulum.bank-capped-note', 'Menampilkan 60 soal pertama dari bank — batas halaman, bukan jumlah seluruh bank.')) + '</p>' : '') + '</div>' +
      '<label class="f" style="width:280px;margin:0">Filter TP<select data-a="filter-tp" data-testid="filter-tp"><option value="">Semua TP</option>' + tpOptions(S.filterTp) + '</select></label></div>' +
      (S.questions.length ? S.questions.map(qCard).join('') : '<p class="muted">Belum ada soal.</p>') + '</div>';
  }

  function compSelect(id) {
    var sub = activeSubj();
    var list = S.comps.filter(function (c) { return !sub || c.subject_id === sub; });
    if (!list.length) list = S.comps;
    return '<label class="f">' + esc(t('kurikulum.kompetensi-goal-label', 'Kompetensi (goal)')) + '<select id="' + id + '" data-testid="' + id + '">' +
      list.map(function (c) { return '<option value="' + c.id + '">' + esc(c.code) + ' — ' + esc(c.name.slice(0, 52)) + '</option>'; }).join('') +
      '</select></label>';
  }

  function qCard(q) {
    var issues = q.issues || [];
    var st = q.status;
    var cls = st === 'PUBLISHED' ? 'good' : st === 'APPROVED' ? 'info' : st === 'ARCHIVED' ? 'mute' : 'warn';
    var diffMap = {
      1: t('kurikulum.diff-1', 'Sangat Mudah'),
      2: t('kurikulum.diff-2', 'Mudah'),
      3: t('kurikulum.diff-3', 'Sedang'),
      4: t('kurikulum.diff-4', 'Sulit / HOTS'),
      5: t('kurikulum.diff-5', 'Sangat Sulit / Olimpiade')
    };
    var diffLabel = diffMap[q.difficulty] || ('D' + q.difficulty);
    var cogMap = {
      C1: t('kurikulum.cog-c1-short', 'Mengingat (C1)'),
      C2: t('kurikulum.cog-c2-short', 'Memahami (C2)'),
      C3: t('kurikulum.cog-c3-short', 'Menerapkan (C3)'),
      C4: t('kurikulum.cog-c4-short', 'Menganalisis (C4)'),
      C5: t('kurikulum.cog-c5-short', 'Mengevaluasi (C5)'),
      C6: t('kurikulum.cog-c6-short', 'Mencipta (C6)')
    };
    var cogLabel = cogMap[q.cognitive_level] || esc(q.cognitive_level);
    var stMap = {
      PUBLISHED: t('kurikulum.st-published', 'Siap Pakai'),
      APPROVED: t('kurikulum.st-approved', 'Disetujui'),
      REVIEW: t('kurikulum.st-review', 'Menunggu Tinjauan'),
      DRAFT: t('kurikulum.st-draft', 'Draf'),
      ARCHIVED: t('kurikulum.st-archived', 'Diarsipkan')
    };
    var stLabel = stMap[st] || st;

    return '<div class="card tight" style="margin-top:10px" data-testid="q-' + esc(q.question_id) + '">' +
      '<div class="row between" style="align-items:flex-start;gap:8px">' +
      '<div><span class="pill ' + cls + '">' + esc(stLabel) + ' · v' + q.version + '</span>' +
      (q.is_transfer ? ' <span class="pill info">' + esc(t('kurikulum.pill-transfer', 'Soal Kontekstual')) + '</span>' : '') + '</div>' +
      '<div style="text-align:right;font-size:12px;color:var(--text-muted)">' +
      '<span>' + esc(diffLabel) + ' · ' + esc(cogLabel) + '</span><br>' +
      '<span class="mono" style="font-size:11px;opacity:0.75">ID: ' + esc(q.question_id) + (q.tp_id ? ' · ' + esc(q.tp_id) : '') + '</span>' +
      '</div></div>' +
      '<p style="margin:8px 0 4px"><b>' + esc(q.stem) + '</b></p>' +
      (q.options && q.options.length ? '<p class="muted mono" style="font-size:13px;line-height:1.6">' + q.options.map(function (o, i) { return String.fromCharCode(65 + i) + '. ' + esc(o); }).join('  ·  ') + ' <span style="color:var(--good, #10b981);font-weight:bold">→ Kunci: ' + esc(q.answer_key) + '</span></p>' : '') +
      '<p class="muted" style="font-size:13px">' + esc(q.competency_name || '') + (q.explanation ? ' · ' + esc(q.explanation.slice(0, 110)) : '') + '</p>' +
      issues.map(function (i) { return '<div class="issue ' + i.level + '" style="font-size:12px;margin:6px 0;display:flex;align-items:center;gap:6px"><span>💡</span><span>' + esc(i.message) + '</span></div>'; }).join('') +
      '<div class="row" style="margin-top:8px">' +
      (st !== 'PUBLISHED' ? '<button class="btn primary sm" data-a="q-review" data-q="' + esc(q.question_id) + '" data-act="publish" data-testid="publish-' + esc(q.question_id) + '">Terbitkan</button>' : '') +
      (st === 'DRAFT' || st === 'REVIEW' ? '<button class="btn sm" data-a="q-review" data-q="' + esc(q.question_id) + '" data-act="approve">Setujui</button>' : '') +
      '<details class="curation-tools" style="display:inline-block;margin-left:auto">' +
      '<summary style="cursor:pointer;font-size:12px;color:var(--text-muted);user-select:none;padding:4px 8px">' + esc(t('kurikulum.btn-curation-options', 'Opsi kurasi & varian soal…')) + '</summary>' +
      '<div class="row" style="margin-top:6px;gap:6px">' +
      '<button class="btn ghost sm" data-a="q-variants" data-q="' + esc(q.question_id) + '" data-testid="variants-' + esc(q.question_id) + '">Buat varian</button>' +
      '<button class="btn ghost sm" data-a="q-transfer" data-q="' + esc(q.question_id) + '">Buat varian transfer</button>' +
      '<button class="btn ghost sm" data-a="q-history" data-q="' + esc(q.question_id) + '">Riwayat versi</button>' +
      (st !== 'ARCHIVED' ? '<button class="btn ghost sm" data-a="q-review" data-q="' + esc(q.question_id) + '" data-act="archive">Arsipkan</button>' : '') +
      '</div></details>' +
      '</div></div>';
  }

  function loadBank() {
    S.bankLoaded = true;
    var sub = activeSubj();
    var qq = '/questions?limit=60' + (sub ? '&subject_id=' + encodeURIComponent(sub) : '') + (S.filterTp ? '&tp_id=' + encodeURIComponent(S.filterTp) : '');
    Promise.all([
      api(qq + '&status=PUBLISHED'),
      api('/questions/review/queue' + (sub ? '?subject_id=' + encodeURIComponent(sub) : ''))
    ]).then(function (r) {
      S.questions = r[0]; S.reviewQueue = r[1].items; render();
    });
  }

  // ---------------- 5. Asesmen ----------------
  function vAssessment() {
    var sub = activeSubj();
    var subjectTps = S.tps.filter(function (t) { return !sub || t.subject_id === sub; });
    if (!subjectTps.length) subjectTps = S.tps;
    var bpRows = S.bpRows || [{ tp: subjectTps[0] && subjectTps[0].id, count: 5 }];
    S.bpRows = bpRows;
    var AS_TYPES = [
      ['formative', t('kurikulum.as-opt-formative', 'Formatif (Penilaian Proses Belajar)')],
      ['summative', t('kurikulum.as-opt-summative', 'Sumatif (Penilaian Akhir Bab / Semester)')],
      ['diagnostic', t('kurikulum.as-opt-diagnostic', 'Diagnostik (Asesmen Awal)')],
      ['practice', t('kurikulum.as-opt-practice', 'Latihan Mandiri')],
      ['remedial', t('kurikulum.as-opt-remedial', 'Remedial (Perbaikan Khusus)')],
      ['enrichment', t('kurikulum.as-opt-enrichment', 'Pengayaan (Tantangan Mahir)')],
      ['review', t('kurikulum.as-opt-review', 'Ulasan Berkala (Spaced Review)')],
      ['transfer', t('kurikulum.as-opt-transfer', 'Transfer Kemahiran (Konteks Baru)')]
    ];
    var COG_ITEMS = [
      ['C1', t('kurikulum.cog-c1-label', 'C1 (Mengingat)')],
      ['C2', t('kurikulum.cog-c2-label', 'C2 (Memahami)')],
      ['C3', t('kurikulum.cog-c3-label', 'C3 (Menerapkan)')],
      ['C4', t('kurikulum.cog-c4-label', 'C4 (Menganalisis)')],
      ['C5', t('kurikulum.cog-c5-label', 'C5 (Mengevaluasi)')],
      ['C6', t('kurikulum.cog-c6-label', 'C6 (Mencipta)')]
    ];
    return head(t('kurikulum.as-title', 'Assessment Engine'), t('kurikulum.as-sub', 'Blueprint dulu, soal kemudian'),
      t('kurikulum.as-desc', 'Delapan jenis asesmen dengan tujuan berbeda: diagnostic, practice, formative, summative, remedial, enrichment, review, transfer.')) +
      '<div class="grid g2"><div class="card" data-testid="blueprint-card"><p class="kicker">' + t('kurikulum.as-bp-kicker', 'Blueprint') + '</p><h3>' + t('kurikulum.as-bp-title', 'Rancang komposisi asesmen') + '</h3>' +
      '<div class="card tight ink" style="margin-bottom:14px" data-testid="blueprint-presets">' +
      '<p class="kicker">' + t('kurikulum.bp-preset-kicker', 'Template Blueprint Cepat') + '</p>' +
      '<div class="row">' +
      '<button class="btn sm ghost" data-a="apply-bp-preset" data-preset="quiz" data-testid="preset-quiz">⚡ ' + t('kurikulum.preset-quiz-btn', 'Kuis Harian (5 Soal)') + '</button>' +
      '<button class="btn sm ghost" data-a="apply-bp-preset" data-preset="weekly" data-testid="preset-weekly">📝 ' + t('kurikulum.preset-weekly-btn', 'Formatif Mingguan (10 Soal)') + '</button>' +
      '<button class="btn sm ghost" data-a="apply-bp-preset" data-preset="summative" data-testid="preset-sum-btn">🏆 ' + t('kurikulum.preset-sum-btn', 'Sumatif Bab (20 Soal)') + '</button>' +
      '</div></div>' +
      '<label class="f">' + t('kurikulum.bp-title-label', 'Judul Asesmen') + '<input id="bpTitle" value="' + esc(defaultAssessTitle()) + '" data-testid="bp-title"></label>' +
      '<label class="f">' + t('kurikulum.bp-type-label', 'Jenis Asesmen') + '<select id="bpType" data-testid="bp-type">' +
      AS_TYPES.map(function (at) { return '<option value="' + at[0] + '"' + (at[0] === 'formative' ? ' selected' : '') + '>' + esc(at[1]) + '</option>'; }).join('') +
      '</select></label>' +
      '<p class="kicker">' + t('kurikulum.bp-target-kicker', 'Target TP & jumlah soal') + '</p>' +
      bpRows.map(function (r, i) {
        return '<div class="row" data-testid="bp-row-' + i + '"><select data-a="bp-tp" data-i="' + i + '" style="flex:1">' + tpOptions(r.tp) + '</select>' +
          '<input type="number" value="' + r.count + '" data-a="bp-count" data-i="' + i + '" style="width:80px"></div>';
      }).join('') +
      '<button class="btn ghost sm" data-a="bp-add" data-testid="bp-add">+ Target TP</button>' +
      '<details style="margin:16px 0;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px"><summary style="cursor:pointer;font-size:12.5px;color:var(--text-muted);font-weight:600">⚙️ ' + t('kurikulum.bp-adv-toggle', 'Pengaturan Kesulitan & Soal Cerita (Opsional)') + '</summary>' +
      '<div style="margin-top:10px">' +
      '<p class="kicker">' + t('kurikulum.bp-cog-kicker', 'Distribusi kognitif (%)') + '</p><div class="row">' +
      COG_ITEMS.map(function (c) {
        return '<label class="f" style="flex:1;min-width:70px">' + c[1] + '<input type="number" id="cog' + c[0] + '" value="' + ({ C1: 20, C2: 30, C3: 30, C4: 20, C5: 0, C6: 0 })[c[0]] + '" data-testid="cog-' + c[0] + '"></label>';
      }).join('') + '</div>' +
      '<label class="f">' + t('kurikulum.bp-transfer-label', 'Porsi Soal Transfer / Kontekstual (0.0 – 1.0, misal 0.2 = 20% soal situasi nyata)') + '<input id="bpTransfer" type="number" step="0.05" value="0.2" data-testid="bp-transfer"></label>' +
      '</div></details>' +
      '<div class="row"><button class="btn ghost sm" data-a="bp-check" data-testid="bp-check">' + t('kurikulum.bp-check-btn', 'Cek keseimbangan') + '</button>' +
      '<button class="btn primary sm" data-a="bp-create" data-testid="bp-create">' + t('kurikulum.bp-create-btn', '🚀 Terbitkan Kuis untuk Murid') + '</button></div>' +
      (S.blueprintCheck ? '<div style="margin-top:12px" data-testid="bp-warnings">' +
        (S.blueprintCheck.warnings.length ? S.blueprintCheck.warnings.map(function (w) { return '<div class="issue ' + w.level + '">' + esc(w.message) + '</div>'; }).join('') : '<div class="issue info">' + t('kurikulum.bp-seimbang', 'Blueprint seimbang.') + '</div>') +
        '<p class="mono muted">' + esc(fmtAvailability(S.blueprintCheck.availability)) + '</p></div>' : '') +
      '</div>' +
      '<div class="card" data-testid="assessment-list"><p class="kicker">Asesmen kelas ini</p><h3>' + S.assessments.length + ' asesmen</h3>' +
      (S.assessments.length ? S.assessments.map(function (a) {
        return '<div class="card tight" style="margin-top:10px" data-testid="as-' + esc(a.id) + '"><div class="row between"><b>' + esc(a.title) + '</b>' +
          '<span class="pill info">' + esc(a.assessment_type) + (a.adaptive ? ' · adaptif' : '') + '</span></div>' +
          '<p class="muted">' + a.question_count + ' soal · ' + (a.student_ids || []).length + ' murid · ' +
          a.progress.finished + ' selesai / ' + a.progress.started + ' mulai</p>' +
          (a.assembly_notes && a.assembly_notes.length ? '<div class="issue warn">' + esc(a.assembly_notes.join(' ')) + '</div>' : '') +
          '<div class="row"><button class="btn ghost sm" data-a="as-analytics" data-id="' + esc(a.id) + '" data-testid="analytics-' + esc(a.id) + '">Analitik butir</button></div></div>';
      }).join('') : '<p class="muted" data-testid="assessment-list-empty">' +
        esc(t('kurikulum.asesmen-kosong', 'Belum ada asesmen di kelas ini. Pakai Template Blueprint Cepat di sebelah kiri untuk menerbitkan kuis pertama dalam satu klik.')) + '</p>') + '</div></div>';
  }

  function loadAssessments() {
    S.asLoaded = true;
    api('/assessments?class_id=' + S.cls.id).then(function (a) { S.assessments = a; render(); });
  }

  // ---------------- 6. Murid & paspor ----------------
  function vStudents() {
    if (!S.students) {
      api('/classes/' + S.cls.id).then(function (c) { S.students = c.students || []; render(); });
      return head(t('kurikulum.nav-students', 'Nilai & Rapor'), 'Memuat…');
    }
    return head(t('kurikulum.nav-students', 'Nilai & Rapor'), S.cls.name, t('kurikulum.kode-kelas-label', 'Kode kelas: ') + S.cls.code + ' — ' + t('kurikulum.kode-kelas-sub', 'berikan kode ini saat murid bergabung.')) +
      '<div class="grid g2"><div class="card" data-testid="roster-card"><p class="kicker">Tambah murid</p>' +
      '<label class="f">Nama (satu per baris)<textarea id="roster" data-testid="roster-input"></textarea></label>' +
      '<button class="btn primary sm" data-a="add-roster" data-testid="add-roster-btn">Tambahkan</button></div>' +
      '<div class="card" data-testid="legacy-import-card"><p class="kicker">Kompatibilitas</p><h3>Impor Ruang Guru lama</h3>' +
      '<p class="muted" style="font-size:13.5px">Data Ruang Guru versi localStorage tetap utuh. Impor ini <b>menambahkan</b> ' +
      'agregat skill lama sebagai evidence kompetensi kurikulum — tidak ada yang dihapus.</p>' +
      '<button class="btn sm" data-a="import-legacy" data-testid="import-legacy-btn">Impor dari perangkat ini</button></div>' +
      '<div class="card" data-testid="student-list"><p class="kicker">Daftar murid</p><h3>' + S.students.length + ' murid</h3>' +
      (S.students.length ? '' : '<p class="muted" data-testid="student-list-empty">' +
        esc(t('kurikulum.murid-kosong', 'Belum ada murid di kelas ini. Bagikan kode kelas di atas, atau tambahkan namanya lewat kotak "Tambah murid".')) + '</p>') +
      '<table><tbody>' + S.students.map(function (s) {
        return '<tr class="click" data-a="passport" data-sid="' + esc(s.user_id) + '" data-testid="student-' + esc(s.user_id) + '"><td><b>' + esc(s.name) + '</b></td><td class="muted mono">' + esc(s.email || 'roster') + '</td><td>Lihat rapor →</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function makeRaporNarrative(studentName, rows, misconceptions) {
    var sName = studentName || t('kurikulum.rapor-anon', 'Murid');
    var mastered = (rows || []).filter(function (r) { return r.mastery_pct >= 70; });
    var developing = (rows || []).filter(function (r) { return r.mastery_pct < 70; });
    var parts = [];
    if (mastered.length) {
      var topM = mastered.slice(0, 2).map(function (m) { return m.tp_name || m.tp_code; }).join(' ' + t('kurikulum.rapor-dan', 'dan') + ' ');
      parts.push(t('kurikulum.rapor-mastered-pre', 'Ananda ') + sName + t('kurikulum.rapor-mastered-post', ' menunjukkan penguasaan yang sangat baik dalam ') + topM + '.');
    } else {
      parts.push(t('kurikulum.rapor-aktif-pre', 'Ananda ') + sName + t('kurikulum.rapor-aktif-post', ' telah aktif mengikuti seluruh proses pembelajaran materi ini.'));
    }
    if (developing.length) {
      var topD = developing.slice(0, 2).map(function (d) { return d.tp_name || d.tp_code; }).join(' ' + t('kurikulum.rapor-serta', 'serta') + ' ');
      parts.push(t('kurikulum.rapor-dev-text', 'Perlu bimbingan lebih lanjut dan latihan teratur dalam ') + topD + '.');
    } else {
      parts.push(t('kurikulum.rapor-pertahankan', 'Diharapkan dapat mempertahankan ritme belajar dan mengeksplorasi materi pengayaan lebih lanjut.'));
    }
    if (misconceptions && misconceptions.length) {
      parts.push(t('kurikulum.rapor-mis-pre', 'Catatan guru: perhatikan penguatan konsep pada ') + misconceptions[0].misconception_id + '.');
    }
    return parts.join(' ');
  }

  function openPassport(sid) {
    api('/braincore/passport/' + sid).then(function (p) {
      var raporNarrative = makeRaporNarrative(p.name, p.rows, p.open_misconceptions);
      S.drawer = '<div class="row between"><p class="kicker">' + t('kurikulum.paspor-kicker', 'Learning Passport') + '</p><button class="btn sm ghost" data-a="close">' + t('kurikulum.tutup', 'Tutup') + '</button></div>' +
        '<h2>' + esc(p.name || sid) + '</h2>' +
        '<div class="row">' + [[t('kurikulum.kpi-komp', 'Kompetensi'), p.totals.competencies], [t('kurikulum.kpi-kuasai', 'Dikuasai'), p.totals.mastered], [t('kurikulum.kpi-tahan', 'Bertahan'), p.totals.retained], [t('kurikulum.kpi-trans', 'Transfer'), p.totals.transferred]].map(function (tRow) {
          return '<div class="card tight kpi" style="flex:1"><small>' + tRow[0] + '</small><b>' + tRow[1] + '</b></div>';
        }).join('') + '</div>' +
        '<div class="card tight accent" style="margin-top:14px" data-testid="rapor-card">' +
        '<div class="row between"><div><p class="kicker">' + t('kurikulum.rapor-card-kicker', 'Catatan Capaian Kompetensi') + '</p><b>' + t('kurikulum.rapor-card-title', 'Draf Narasi e-Rapor Kemendikbud') + '</b></div>' +
        '<button class="btn primary sm" data-a="copy-rapor" data-text="' + esc(raporNarrative) + '" data-testid="copy-rapor-btn">📋 ' + t('kurikulum.rapor-copy-btn', 'Salin Narasi') + '</button></div>' +
        '<p class="muted" style="margin-top:8px;font-size:13.5px;line-height:1.5">' + esc(raporNarrative) + '</p></div>' +
        (p.rows.length ? p.rows.map(function (r) {
          return '<div class="card tight" style="margin-top:10px"><div class="row between"><b>' + esc(r.tp_code || '-') + '</b><span class="pill mute">' + r.mastery_pct + '%</span></div>' +
            '<p class="muted">' + esc((r.tp_name || '').slice(0, 90)) + '</p>' +
            r.competencies.map(function (c) {
              return '<div class="row between" style="border-top:1px solid rgba(42,63,53,.5);padding:6px 0"><span>' + esc(c.name) + '</span>' +
                '<span class="pill ' + (['MASTERED', 'RETAINED', 'TRANSFERRED'].indexOf(c.state) !== -1 ? 'good' : c.state === 'DEVELOPING' ? 'warn' : 'mute') + '">' + esc(c.state_label) + '</span></div>';
            }).join('') +
            (r.next_target ? '<p class="mono" style="color:var(--clay)">' + t('kurikulum.target-berikutnya', 'Target berikutnya: ') + esc(r.next_target) + '</p>' : '') + '</div>';
        }).join('') : '<p class="muted">' + t('kurikulum.paspor-tanpa-evidence', 'Belum ada evidence.') + '</p>') +
        (p.due_reviews.length ? '<h3>' + t('kurikulum.paspor-perlu-review', 'Perlu review') + '</h3>' + p.due_reviews.map(function (d) {
          return '<div class="issue info">' + esc(d.name || d.competency_id) + ' — ' + t('kurikulum.paspor-retensi', 'retensi ') + (d.retrievability == null ? '?' : Math.round(d.retrievability * 100) + '%') + '</div>';
        }).join('') : '') +
        (p.open_misconceptions.length ? '<h3>' + t('kurikulum.paspor-miskonsepsi', 'Miskonsepsi terbuka') + '</h3>' + p.open_misconceptions.map(function (m) {
          return '<div class="issue warn">' + esc(m.misconception_id) + ' (' + m.frequency + 'x)</div>';
        }).join('') : '');
      render();
    });
  }

  // ---------------- events ----------------
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  /* G3 (m025-351): overlay (drawer/modal) dulu tidak terjangkau keyboard — tidak ada
     Escape, tidak ada focus trap, dan scrim-nya <div> biasa. Sekarang: Escape menutup,
     Tab dikurung di dalam overlay, fokus pindah masuk saat terbuka, dan kembali ke elemen
     pemicu saat tertutup. lastFocused diisi render() ketika tidak ada overlay yang terbuka. */
  var lastFocused = null;

  function fokusFirst(box) {
    var f = box.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
    return f && f.length ? f[0] : null;
  }

  function focusOverlay() {
    var box = document.querySelector('.drawer, .modal');
    if (!box) return;
    var f = fokusFirst(box);
    if (f && f.focus) { try { f.focus(); } catch (_) {} }
  }

  function tutupOverlay() {
    var tutup = !!(S.drawer || S.modal);
    S.drawer = null; S.modal = null; render();
    if (tutup && lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (_) {} }
    return tutup;
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && (S.drawer || S.modal)) { ev.preventDefault(); tutupOverlay(); return; }
    if (ev.key === 'Tab' && (S.drawer || S.modal)) {
      var box = document.querySelector('.drawer, .modal');
      if (!box) return;
      var f = box.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], aktif = document.activeElement;
      if (!box.contains(aktif) || (ev.shiftKey && aktif === first)) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && aktif === last) { ev.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-a]');
    if (!el) return;
    var a = el.getAttribute('data-a');
    if (a === 'login') {
      el.disabled = true;
      el.textContent = 'Menghubungkan ke KelasKu…';
      return E.login.kelasku().then(start).catch(function (e) { renderAuth(e.message); });
    }
    if (a === 'logout') return E.login.logout().then(function () { S.user = null; renderAuth(); });
    if (a === 'close') { tutupOverlay(); return; }
    if (a === 'view') { S.view = el.getAttribute('data-v'); S.drawer = null; S.modal = null; return render(); }
    if (a === 'new-class') {
      var defSub = activeSubj();
      S.modal =
        '<div class="card tight" style="margin-bottom:0">' +
        '<div class="row between" style="margin-bottom:12px"><h3>' + t('kurikulum.modal-kelas-judul', 'Buat Kelas Baru') + '</h3><button class="btn sm ghost" data-a="close">' + t('kurikulum.tutup', 'Tutup') + '</button></div>' +
        '<p class="muted">' + t('kurikulum.modal-kelas-sub', 'Pilih jenjang kelas dan mata pelajaran yang Anda ampu.') + '</p>' +
        '<label class="f">' + t('kurikulum.modal-kelas-nama', 'Nama Rombel / Kelas') +
          '<input id="newClsName" placeholder="' + t('kurikulum.modal-kelas-ph', 'mis. 7A, 8B, atau X-Bahasa 1') + '" autofocus data-testid="new-class-name">' +
        '</label>' +
        '<div class="grid g2">' +
          '<label class="f">' + t('kurikulum.modal-kelas-jenjang', 'Tingkat / Fase') +
            '<select id="newClsGrade" data-testid="new-class-grade">' +
              GRADES.map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === 'KELAS-7' ? ' selected' : '') + '>' + esc(g[1]) + '</option>'; }).join('') +
            '</select>' +
          '</label>' +
          '<label class="f">' + t('kurikulum.modal-kelas-mapel', 'Mata Pelajaran') +
            '<select id="newClsSubject" data-testid="new-class-subject">' +
              SUBJECT_CHOICES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === defSub ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
        '<div class="row" style="margin-top:18px;justify-content:flex-end">' +
          '<button class="btn ghost sm" data-a="close">' + t('kurikulum.batal', 'Batal') + '</button>' +
          '<button class="btn primary sm" data-a="submit-new-class" data-testid="submit-new-class-btn">' + t('kurikulum.modal-kelas-submit', 'Simpan & Buat Kelas') + '</button>' +
        '</div>' +
        '</div>';
      return render();
    }
    if (a === 'submit-new-class') {
      var name = val('newClsName');
      var grade = val('newClsGrade') || 'KELAS-7';
      var subject = val('newClsSubject') || 'MAT-7';
      if (!name) { toast(t('kurikulum.nama-kelas-kosong', 'Nama kelas wajib diisi.')); return; }
      el.disabled = true;
      return api('/classes', { body: { name: name, grade_id: grade, subject_id: subject } }).then(function (c) {
        S.classes.push(c); S.cls = c; S.activeSubject = c.subject_id; S.modal = null; resetCaches();
        toast(t('kurikulum.kelas-berhasil-dibuat', 'Kelas dibuat. Kode: ') + c.code);
        return loadContext().then(render);
      }).catch(errToast);
    }
    if (a === 'submit-welcome-class') {
      var wName = val('welcomeClsName') || t('kurikulum.default-class-name', 'Kelas 7A');
      var wGrade = val('welcomeClsGrade') || 'KELAS-7';
      var wSub = val('welcomeClsSubject') || 'MAT-7';
      el.disabled = true;
      return api('/classes', { body: { name: wName, grade_id: wGrade, subject_id: wSub } }).then(function (c) {
        S.classes = [c];
        S.cls = c;
        S.activeSubject = c.subject_id;
        S.modal = null;
        resetCaches();
        toast(t('kurikulum.kelas-berhasil-dibuat', 'Kelas dibuat. Kode: ') + c.code);
        return loadContext().then(render);
      }).catch(function (e) {
        el.disabled = false;
        errToast(e);
      });
    }
    if (a === 'bootstrap-demo-class') {
      el.disabled = true;
      return api('/seed/bootstrap', { body: {} }).then(function (r) {
        S.classes = [r.class];
        S.cls = r.class;
        S.activeSubject = r.class.subject_id || 'MAT-7';
        S.modal = null;
        resetCaches();
        toast(t('kurikulum.kelas-berhasil-dibuat', 'Kelas dibuat. Kode: ') + r.class.code);
        return loadContext().then(render);
      }).catch(function (e) {
        el.disabled = false;
        errToast(e);
      });
    }
    if (a === 'seed-english' || a === 'seed-mapel' || a === 'seed-soal') {
      var d = SEMAI[a === 'seed-english' ? 'english' : (a === 'seed-mapel' ? 'mapel' : 'soal')];
      if (S[d.busy]) return;
      /* Kedua penyemai idempoten dan non-destruktif (simpul lama tidak diubah), jadi
         `semai ulang` aman ditekan dua kali. Yang TIDAK aman adalah menjalankannya dua
         kali BERSAMAAN — ratusan kompetensi berarti ratusan penulisan, dan dua gelombang
         paralel membuat guru menunggu dua kali lebih lama tanpa alasan. Karena itu
         tombolnya dikunci selama gelombangnya berjalan. */
      S[d.busy] = true; render();
      return d.jalan().then(function () {
        return d.ambil();
      }).then(function (st) {
        S[d.st] = st; S[d.busy] = false;
        /* `tree` dan `health` punya pemuat malas di vCurriculum — dikosongkan saja sudah
           cukup, mereka mengambil sendiri saat digambar. `tps` dan `comps` TIDAK punya:
           satu-satunya yang mengisinya adalah loadContext() saat boot. Mengosongkannya
           tanpa memanggil ulang membuat pilihan TP dan kompetensi di Kopilot dan Asesmen
           kosong sampai halaman dimuat ulang — 72 TP dan 144 kompetensi yang baru disemai
           tidak terlihat di tempat guru justru akan memakainya, yang meniadakan seluruh
           guna tombol ini. Pola yang sama dengan penangan `add-node`. */
        S.tree = null; S.health = null;
        toast(d.selesai());
        return loadContext().then(render);
      }).catch(function (e) {
        S[d.busy] = false; render();
        toast((e && e.message) || t('kurikulum.semai-gagal', 'Gagal menyemai kurikulum.'));
      });
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
      var nType = val('ndType');
      var nParent = val('ndParent');
      var nName = val('ndName');
      if (!nName) return toast(t('kurikulum.node-nama-wajib', 'Nama simpul wajib diisi.'));
      if (!nParent && nType !== 'curriculum') return toast(t('kurikulum.node-induk-wajib', 'Pilih atau ketik ID induk simpul.'));
      return api('/curriculum/nodes', { body: { type: nType, parent_id: nParent, name: nName } })
        .then(function (n) { toast(t('kurikulum.simpul-dibuat', 'Simpul ') + n.code + t('kurikulum.simpul-berhasil', ' dibuat.')); S.tree = null; S.health = null; loadContext().then(render); })
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
    if (a === 'apply-bp-preset') {
      var preset = el.getAttribute('data-preset');
      var clsName = (S.cls && S.cls.name) ? ' — ' + S.cls.name : '';
      if (preset === 'quiz') {
        if (document.getElementById('bpTitle')) document.getElementById('bpTitle').value = t('kurikulum.preset-quiz-title', 'Kuis Harian') + clsName;
        if (document.getElementById('bpType')) document.getElementById('bpType').value = 'formative';
        if (document.getElementById('cogC1')) document.getElementById('cogC1').value = '30';
        if (document.getElementById('cogC2')) document.getElementById('cogC2').value = '40';
        if (document.getElementById('cogC3')) document.getElementById('cogC3').value = '30';
        if (document.getElementById('cogC4')) document.getElementById('cogC4').value = '0';
        if (document.getElementById('bpTransfer')) document.getElementById('bpTransfer').value = '0.1';
        if (S.bpRows && S.bpRows[0]) S.bpRows[0].count = 5;
        toast(t('kurikulum.preset-applied-quiz', 'Template Kuis Harian (5 soal) diterapkan.'));
      } else if (preset === 'weekly') {
        if (document.getElementById('bpTitle')) document.getElementById('bpTitle').value = t('kurikulum.preset-weekly-title', 'Formatif Mingguan') + clsName;
        if (document.getElementById('bpType')) document.getElementById('bpType').value = 'formative';
        if (document.getElementById('cogC1')) document.getElementById('cogC1').value = '20';
        if (document.getElementById('cogC2')) document.getElementById('cogC2').value = '30';
        if (document.getElementById('cogC3')) document.getElementById('cogC3').value = '30';
        if (document.getElementById('cogC4')) document.getElementById('cogC4').value = '20';
        if (document.getElementById('bpTransfer')) document.getElementById('bpTransfer').value = '0.2';
        if (S.bpRows && S.bpRows[0]) S.bpRows[0].count = 10;
        toast(t('kurikulum.preset-applied-weekly', 'Template Formatif Mingguan (10 soal) diterapkan.'));
      } else if (preset === 'summative') {
        if (document.getElementById('bpTitle')) document.getElementById('bpTitle').value = t('kurikulum.preset-sum-title', 'Sumatif Lingkup Materi') + clsName;
        if (document.getElementById('bpType')) document.getElementById('bpType').value = 'summative';
        if (document.getElementById('cogC1')) document.getElementById('cogC1').value = '15';
        if (document.getElementById('cogC2')) document.getElementById('cogC2').value = '25';
        if (document.getElementById('cogC3')) document.getElementById('cogC3').value = '35';
        if (document.getElementById('cogC4')) document.getElementById('cogC4').value = '25';
        if (document.getElementById('bpTransfer')) document.getElementById('bpTransfer').value = '0.3';
        if (S.bpRows && S.bpRows[0]) S.bpRows[0].count = 20;
        toast(t('kurikulum.preset-applied-sum', 'Template Sumatif (20 soal) diterapkan.'));
      }
      return render();
    }
    if (a === 'copy-rapor') {
      var txt = el.getAttribute('data-text') || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () {
          toast(t('kurikulum.rapor-berhasil-salin', 'Narasi e-Rapor berhasil disalin ke papan klip!'));
        }).catch(function () {
          toast(t('kurikulum.rapor-gagal-salin', 'Gagal menyalin. Silakan pilih teks manual.'));
        });
      } else {
        toast(t('kurikulum.rapor-manual', 'Teks siap disalin secara manual.'));
      }
      return;
    }
    if (a === 'bp-add') {
      var sub = activeSubj();
      var pool = S.tps.filter(function (t) { return !sub || t.subject_id === sub; });
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
          '<div class="card tight"><p class="kicker">Sinyal kepercayaan diri</p><p class="mono">' + esc(fmtConfidence(an.confidence_signals)) + '</p></div>' +
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
      if (S.cls && S.cls.subject_id) {
        S.activeSubject = S.cls.subject_id;
      }
      resetCaches();
      loadContext().then(render);
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
      cognitive_distribution: { C1: +val('cogC1') || 0, C2: +val('cogC2') || 0, C3: +val('cogC3') || 0, C4: +val('cogC4') || 0, C5: +val('cogC5') || 0, C6: +val('cogC6') || 0 },
      transfer_ratio: parseFloat(val('bpTransfer')) || 0, question_types: ['mcq']
    };
  }

  function resetCaches() {
    S.coverage = null; S.recs = null; S.assessments = []; S.asLoaded = false;
    S.students = null; S.bankLoaded = false; S.questions = []; S.reviewQueue = [];
    S.plan = null; S.groups = null; S.bpRows = null; S.blueprintCheck = null;
    S.tree = null; S.health = null;
  }

  function errToast(e) { toast(e.message || 'Gagal.'); render(); }

  // callback Google (murid) tidak dipakai di sini
  boot();
})(window);
